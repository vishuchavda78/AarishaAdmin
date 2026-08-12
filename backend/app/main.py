"""Aarisha Admin API. All Supabase access uses the server-side service key."""
from __future__ import annotations

import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pathlib import Path

import httpx
import jwt
import bcrypt
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str
    supabase_service_role_key: str
    jwt_secret: str
    admin_email: EmailStr
    admin_password_hash: str = Field(pattern=r"^\$2[aby]\$")
    allowed_origins: str = "http://127.0.0.1:5500,http://localhost:5500"
    jwt_minutes: int = 30


settings = Settings()
bearer = HTTPBearer()

# ── Project Root (parent of backend/) for static file serving ──
# File is at backend/app/main.py → resolve().parents[2] reaches the project root.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
print(f"[aarisha-admin] PROJECT_ROOT = {PROJECT_ROOT}")
print(f"[aarisha-admin] index.html exists = {(PROJECT_ROOT / 'index.html').is_file()}")

app = FastAPI(title="Aarisha Admin API", version="1.0.0")

# Include the backend's own origin so static files served from the same port work.
allowed = list({origin.strip() for origin in settings.allowed_origins.split(",")})
# Auto-include common dev ports so users don't need to update .env for every port change.
allowed.extend(["http://127.0.0.1:8000", "http://localhost:8000"])
for port in [3000, 5173, 5500, 5501, 8080]:
    allowed.append(f"http://127.0.0.1:{port}")
    allowed.append(f"http://localhost:{port}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


class Category(str, Enum):
    rings = "rings"
    necklaces = "necklaces"
    bracelets = "bracelets"
    earrings = "earrings"


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProductInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category: Category
    image_url: str
    description: str | None = Field(default=None, max_length=1000)
    in_stock: bool = True


class ProductPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    category: Category | None = None
    image_url: str | None = None
    description: str | None = Field(default=None, max_length=1000)
    in_stock: bool | None = None


# ponytail: process-local limiter; use Redis/a gateway for multiple API workers.
attempts: dict[str, deque[float]] = defaultdict(deque)


def limit_login(request: Request) -> None:
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = attempts[key]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in a minute.")
    bucket.append(now)


def token(subject: str, *, is_admin: bool = False, email: str, username: str) -> dict[str, object]:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_minutes)
    value = jwt.encode({"sub": subject, "is_admin": is_admin, "exp": expires}, settings.jwt_secret, algorithm="HS256")
    return {"access_token": value, "token_type": "bearer", "is_admin": is_admin, "user": {"email": email, "username": username}}


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def current_admin(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)]) -> dict:
    try:
        claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    if not claims.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return claims


def drive_image_url(value: str) -> str:
    """Turn a Google Drive share URL into a browser-renderable thumbnail URL."""
    match = re.search(r"(?:/d/|[?&]id=)([-\w]+)", value)
    if match:
        return f"https://drive.google.com/thumbnail?id={match.group(1)}&sz=w1000"
    if value.startswith(("https://", "http://")):
        return value
    raise HTTPException(status_code=422, detail="image_url must be an http(s) URL or Google Drive share link")


async def supabase(method: str, table: str, *, params: dict | None = None, payload: object | None = None, prefer: str | None = None):
    headers = {"apikey": settings.supabase_service_role_key, "Authorization": f"Bearer {settings.supabase_service_role_key}"}
    if prefer:
        headers["Prefer"] = prefer
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(method, f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}", headers=headers, params=params, json=payload)
    if response.is_error:
        raise HTTPException(status_code=502, detail="Database operation failed")
    return response.json() if response.content else []


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/admin/login")
async def admin_login(credentials: Credentials, request: Request):
    limit_login(request)
    if str(credentials.email).lower() != str(settings.admin_email).lower() or not verify_password(credentials.password, settings.admin_password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return token(str(settings.admin_email), is_admin=True, email=str(settings.admin_email), username="Admin")


@app.get("/products")
async def products():
    return await supabase("GET", "products", params={"select": "*", "order": "created_at.desc"})


# ── Category-specific route (enum-restricted) must come before {product_id} (any-string) ──
@app.get("/products/{category}")
async def products_by_category(category: Category):
    return await supabase("GET", "products", params={"category": f"eq.{category.value}", "select": "*", "order": "created_at.desc"})


@app.get("/products/{product_id}")
async def product_by_id(product_id: str):
    rows = await supabase("GET", "products", params={"id": f"eq.{product_id}", "select": "*"})
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    return rows[0]


@app.post("/admin/products", status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductInput, _: Annotated[dict, Depends(current_admin)]):
    data = product.model_dump(mode="json")
    data["image_url"] = drive_image_url(data["image_url"])
    # Prevent duplicates: a product with the same name and category is likely a double-submit.
    existing = await supabase("GET", "products", params={"name": f"eq.{product.name}", "category": f"eq.{product.category.value}", "select": "id", "limit": "1"})
    if existing:
        raise HTTPException(status_code=409, detail="A product with this name already exists in this category.")
    return (await supabase("POST", "products", payload=data, prefer="return=representation"))[0]


@app.patch("/admin/products/{product_id}")
async def update_product(product_id: str, product: ProductPatch, _: Annotated[dict, Depends(current_admin)]):
    data = product.model_dump(exclude_unset=True, mode="json")
    if "image_url" in data:
        data["image_url"] = drive_image_url(data["image_url"])
    rows = await supabase("PATCH", "products", params={"id": f"eq.{product_id}"}, payload=data, prefer="return=representation")
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")
    return rows[0]


@app.delete("/admin/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, _: Annotated[dict, Depends(current_admin)]):
    rows = await supabase("DELETE", "products", params={"id": f"eq.{product_id}"}, prefer="return=representation")
    if not rows:
        raise HTTPException(status_code=404, detail="Product not found")


@app.post("/admin/products/deduplicate")
async def deduplicate_products(_: Annotated[dict, Depends(current_admin)]):
    """Find products with the same name+category and delete all but the newest for each group."""
    all_products = await supabase("GET", "products", params={"select": "id,name,category,created_at", "order": "created_at.asc"})
    seen: dict[tuple[str, str], list[dict]] = {}
    for p in all_products:
        key = (p["name"], p["category"])
        seen.setdefault(key, []).append(p)
    deleted_ids: list[str] = []
    for key, group in seen.items():
        if len(group) < 2:
            continue
        # Keep the newest (last in asc-sorted list); delete the rest.
        for old in group[:-1]:
            await supabase("DELETE", "products", params={"id": f"eq.{old['id']}"})
            deleted_ids.append(old["id"])
    return {"deleted": len(deleted_ids), "deleted_ids": deleted_ids}


@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(PROJECT_ROOT / "index.html")


@app.get("/admin")
async def admin_redirect():
    return RedirectResponse(url="/")


# ── Serve static assets (CSS, images, etc.) from the project root ──
# html=False so this mount does NOT intercept "/" — the explicit route above handles that.
# This only matches paths that aren't API routes or the explicit / route above.
app.mount("/", StaticFiles(directory=str(PROJECT_ROOT)), name="frontend")

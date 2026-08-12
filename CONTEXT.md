# Aarisha Admin Panel — Project Context

> **Last Updated:** July 19, 2026
> **Project:** `The-aarisha-admin`

---

## 1. Project Overview

**Pure admin panel** for the **Aarisha** luxury accessories brand. Single-page application — login screen → admin dashboard. No landing page, no signup, no other pages.

Shares a **Supabase (PostgreSQL) database** with [The-aarisha](https://github.com/dhairya-shah13/The-aarisha) (the customer-facing storefront). Admin writes to the `products` table here; the storefront reads from it.

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (no framework) — single `index.html` |
| Backend API | Python FastAPI + Uvicorn |
| Database | Supabase (PostgreSQL) — shared with The-aarisha |
| Auth | bcrypt password hashing + JWT tokens (admin-only) |

---

## 2. Folder Structure

```
The-aarisha-admin/
├── CONTEXT.md              ← This file — project context & changelog
├── README.md               ← Project readme
├── .gitignore              ← Ignores backend/.env, .venv, __pycache__, *.pyc
├── index.html              ← SOLE frontend file: login screen + admin dashboard
├── styles.css              ← Global CSS design system (brand styling)
├── Logo.png                ← Brand logo asset
│
├── backend/
│   ├── .env.example        ← Template for environment variables
│   ├── requirements.txt    ← Python dependencies
│   ├── generate_password_hash.py ← Helper: print bcrypt hash for admin password
│   └── app/
│       ├── __init__.py     ← Package marker
│       └── main.py         ← FastAPI application (ALL routes, models, logic)
│
└── supabase-schema.sql     ← Database schema: products table only
```

---

## 3. Complete Route Map (API)

All routes are defined in `backend/app/main.py`.

### Public Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check → `{"status": "ok"}` |
| `GET` | `/products` | List all products (sorted by `created_at` desc) |
| `GET` | `/products/{category}` | Filter by category enum: `rings`, `necklaces`, `bracelets`, `earrings` |
| `GET` | `/products/{product_id}` | Single product by UUID |

### Protected Routes (require JWT Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/login` | Admin-only login (credential check) |
| `POST` | `/admin/products` | Create a product |
| `PATCH` | `/admin/products/{product_id}` | Update a product |
| `DELETE` | `/admin/products/{product_id}` | Delete a product |
| `POST` | `/admin/products/deduplicate` | Remove duplicate products (same name + category) |

### Static File Serving

| Path | Serves |
|------|--------|
| `/` | `index.html` (login screen → admin dashboard) |
| `/admin` | Redirects to `/` |
| `/styles.css` | Global CSS |
| `/Logo.png` | Brand logo |
| `/*` | Any file in the project root directory |

> **Note:** The static file mount (`app.mount("/", ...)`) is registered **last** so all API routes take precedence.

### Route Ordering Notes

- `GET /products/{category}` (enum-restricted) is registered **before** `GET /products/{product_id}` (string) so that category names like `rings` correctly match the category filter.
- `POST /admin/products/deduplicate` works because static paths take precedence over dynamic paths in Starlette routing.
- The `StaticFiles` mount at `/` is registered **last** so no API route is shadowed.

---

## 4. Running the Project

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy and fill in .env
copy .env.example .env

# Generate admin password hash
python generate_password_hash.py
# Paste the output into ADMIN_PASSWORD_HASH in .env

# Start server
py -m uvicorn app.main:app --reload --port 8000
```

Then visit **http://127.0.0.1:8000/** to see the login screen and admin dashboard.

---

## 5. Key Design Decisions

- **Single-page admin panel:** No landing page, no signup, no navigation away from the dashboard. Login screen → admin panel.
- **No frontend framework:** All JavaScript is vanilla to keep dependencies minimal and loading fast.
- **Server-side auth only:** The Supabase service_role key is never exposed to the browser. All DB operations go through the FastAPI backend.
- **Admin-only auth:** No registration endpoint — admins are predefined in the server `.env` config.
- **Google Drive image support:** The `drive_image_url()` helper converts Google Drive share links into renderable thumbnail URLs.
- **Rate-limited login:** Login has a 5-attempt-per-minute rate limiter per IP (in-memory).
- **Deduplication:** The deduplicate endpoint keeps only the newest product per name+category group.
- **Shared database:** The `products` table is shared with The-aarisha storefront. Changes here are immediately visible to customers.

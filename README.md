# Aarisha Admin Portal

Administrative dashboard for the **Aarisha** luxury accessories brand. Manage products, track inventory, and keep the storefront catalogue up to date.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (no framework) |
| Backend API | Python FastAPI + Uvicorn |
| Database | Supabase (PostgreSQL) |
| Auth | bcrypt password hashing + JWT tokens |

## Quick Start

### 1. Database Setup

1. Create a free [Supabase](https://supabase.com) project.
2. Open the **SQL Editor** in the Supabase dashboard.
3. Paste and run the contents of [`supabase-schema.sql`](./supabase-schema.sql) (included in this project).

### 2. Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure Environment

From the `backend/` directory:

```powershell
cd backend
copy .env.example .env
# Then edit .env with your Supabase credentials and admin settings
```

**Required env vars:**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://abc.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase (server-side only!) |
| `JWT_SECRET` | A long random string for signing JWT tokens |
| `ADMIN_EMAIL` | Email address for the admin login |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password (see below) |
| `BRAND_WHATSAPP_NUMBER` | WhatsApp number for order inquiries |
| `ALLOWED_ORIGINS` | Comma-separated browser origins for CORS |

**Generate the admin password hash:**

```powershell
python generate_password_hash.py
# Enter your password when prompted (hidden input for security)
# Copy the output into ADMIN_PASSWORD_HASH in .env
```

### 4. Run the Backend

```powershell
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. API docs are available at `http://127.0.0.1:8000/docs`.

### 5. Open the Admin Portal

Serve the repository root with any static file server.

> ⚠️ **Important:** The static server must run on a **different port** from the API (port 8000). Use port 5500 or 3000.

```powershell
# Using npx (defaults to port 3000)
npx serve .

# Using Python (specify a port other than 8000)
python -m http.server 5500
```

Then navigate to: **`http://localhost:5500`** (or **`http://localhost:3000`** if using npx)

> **Note:** If you change the static server port, update `ALLOWED_ORIGINS` in `backend/.env` to include it (e.g. `ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000`). Also update the `API` constant in `index.html` and `admin.html` if you change the API port.

## Project Structure

```
The-aarisha-admin/
├── index.html              # Admin portal landing page with login
├── admin.html              # Admin dashboard (product management)
├── styles.css              # Brand design system (from The-aarisha)
├── Logo.png                # Aarisha brand logo
├── placeholder.svg         # Placeholder image for products
├── .gitignore              # Git ignore rules
├── README.md               # This file
└── backend/
    ├── .env.example        # Environment variable template
    ├── generate_password_hash.py  # Password hashing utility
    ├── requirements.txt    # Python dependencies
    └── app/
        ├── __init__.py     # Package init
        └── main.py         # FastAPI application (API routes)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/auth/register` | None | Register a new user |
| `POST` | `/auth/login` | None (rate-limited) | User login |
| `POST` | `/admin/login` | None (rate-limited) | Admin login |
| `GET` | `/products` | None | List all products |
| `GET` | `/products/{category}` | None | Products by category |
| `POST` | `/orders/whatsapp-link` | None | Generate WhatsApp order link |
| `POST` | `/admin/products` | Admin JWT | Create a product |
| `PATCH` | `/admin/products/{id}` | Admin JWT | Update a product |
| `DELETE` | `/admin/products/{id}` | Admin JWT | Delete a product |
| `POST` | `/admin/products/deduplicate` | Admin JWT | Remove duplicate products |

## Admin Features

- **Dashboard** — Overview with product count, stock status, categories, and recent products
- **Product Management** — Add, edit, delete products with name, price, category, stock status, image, and description
- **Stock Control** — Toggle products in/out of stock with a single click
- **Duplicate Detection** — Find and remove products with the same name in the same category
- **Authentication** — Secure admin login with bcrypt + JWT; session persists in browser storage

## Security Notes

- Passwords are **bcrypt hashes**, never stored in plaintext
- Admin credentials exist only in server-side environment variables
- API uses rate limiting (5 attempts/minute) on login endpoints
- JWT tokens expire after 30 minutes (configurable via `JWT_MINUTES`)
- Supabase service-role key is server-side only
- CORS is configured to allow only specified origins

## Deployment

For production deployment:
1. Deploy the backend (FastAPI) to a proper server (e.g., Railway, Render, Fly.io)
2. Deploy the frontend files to a static hosting provider (e.g., Vercel, Netlify, Cloudflare Pages)
3. Update the `API` constant in `index.html` and `admin.html` to point to your deployed backend
4. Update `ALLOWED_ORIGINS` in the backend `.env` to include your frontend domain
5. Use a production-grade rate limiter (Redis-based) for login endpoints
6. Migrate from Google Drive image URLs to managed object storage (e.g., Supabase Storage, Cloudinary)

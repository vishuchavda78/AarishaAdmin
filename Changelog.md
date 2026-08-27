# Changelog

All notable changes to the Aarisha Admin Panel will be documented in this file in reverse-chronological order.

---

## [2026-08-27 15:45]

### [Category: Dev] — Separate Discounts Page and Selected-Product Discounts
What changed:
- Added a new `/discounts` page (`src/app/discounts/page.tsx`) with its own styles (`src/app/discounts/discounts.module.css`).
- Extended `POST /api/discounts` to accept an optional `productIds` array so admins can apply or clear discounts for selected products within a category, instead of only category-wide.
- Removed the duplicate bulk-discount widget from the dashboard sidebar and added a `Discounts` link in the dashboard header to navigate to the new page.
- Updated `Context.md` to document the new route, UI flow, and API contract.
Why: Move bulk discount management out of the dashboard into a dedicated page, and support per-product discount selection as requested.

---

## [2026-08-27 14:50]

### [Category: Dev] — Upsert to Concurrent Updates & Dynamic Routing
What changed:
- Replaced Supabase `.upsert()` with individual `.update()` operations executed concurrently via `Promise.all` in `src/app/api/discounts/route.ts`.
- Added `export const dynamic = "force-dynamic";` at the top of `src/app/api/products/route.ts`.
Why: Bypasses PostgREST upsert constraints and Row Level Security permissions issue on live deployment environments, and prevents Next.js from caching the products API statically.

---

## [2026-08-27 14:12]

### [Category: Dev] — Database Price and original_price Alignment
What changed:
- Updated the product creation route (`POST /api/products`) to set `original_price` to `parsedPrice` (the initial product price).
- Updated the product editing route (`PATCH /api/products/[id]`) to set both `price` and `original_price` to `parsedPrice` when the base price is modified.
- Updated the discount application and clearing route (`POST /api/discounts`):
  - On `apply`: Calculates the discounted `price` based on `original_price` and keeps `original_price` unchanged.
  - On `clear`: Restores the `price` column by copying `original_price` into it, leaving `original_price` populated and unchanged (instead of setting it to `null`).
- Updated the dashboard catalog page (`src/app/page.tsx`):
  - Recalculated `isDiscounted` state dynamically by checking if `original_price > price` (with a safe fallback to `price` if `original_price` is null for legacy products).
Why: Align the database schema and application logic with the revised product price lifecycle requirements: `price` and `original_price` remain equal when not discounted; `price` holds the discounted amount during discounts; and `price` is restored from `original_price` when discounts are cleared.

---

## [2026-08-27 14:05]

### [Category: Dev] — Bulk Discounts Database Upsert Fix
What changed:
- Modified the `/api/discounts` endpoint in `src/app/api/discounts/route.ts`.
- Changed query to select all fields (`*`) instead of a partial list of fields.
- Spread the original product fields (`...product`) into the bulk upsert payload for both applying and clearing discounts.
Why: Prevents PostgreSQL validation errors during upsert queries. Previously, omitting NOT NULL fields like `name`, `image_url`, and `in_stock` caused the database to trigger constraint violations during the initial INSERT assessment phase of the upsert operation.
Bug fixed: Clicking "Apply Discounts" or "Clear Category Discounts" triggered a database error: `null value in column "name" of relation "products" violates not-null constraint`.
Root cause: PostgREST bulk upsert expects all required columns to be populated in the payload array so that the base INSERT parsing checks pass before conflict resolution updates the columns.

---

## [2026-08-27 14:04]

### [Category: UI] — Color Theme Update to Forest Green, Gold & White
What changed:
- Modified color tokens in `src/app/globals.css`.
- Updated `--bg-primary`, `--bg-secondary`, and `--bg-tertiary` to deep, luxury Forest Green HSL shades.
- Updated `--border-subtle` and `--text-secondary` to matching sage green-tinted shades.
- Updated `--border-focus`, `--color-gold`, `--color-gold-hover`, and `--color-gold-light` to brilliant luxury golds.
- Updated `--text-primary` to clean pure white.
Why: Redesign the jewelry admin panel color scheme to reflect the brand's new Forest Green, Gold, and White color palette.

---

## [2026-08-27 14:01]

### [Category: Dev] — Google Drive Image Referrer Policy Fix
What changed:
- Added `referrerPolicy="no-referrer"` to the catalog and modal preview `<img>` elements in `src/app/page.tsx`.
Why: Bypasses Google Drive's hotlinking protection which returns `403 Forbidden` when it detects request referrer headers from external local (or deployed) domains. Removing the referer header allows Google to successfully serve the image binary to the browser.
Bug fixed: Product image previews in the catalog and modal form were showing the fallback SVG placeholder instead of the actual jewelry images.
Root cause: Browser requests to `https://drive.google.com/thumbnail` included the `Referer: http://localhost:3000` header, prompting Google's servers to reject hotlinking with a 403 status code.

---

## [2026-08-27 13:58]

### [Category: Dev] — Scaffolding, Security, APIs, and UI Dashboard Implementation
What changed:
- Initialized Next.js project using App Router, TypeScript, and ESLint.
- Configured project to use Vanilla CSS instead of Tailwind CSS.
- Installed Supabase client dependency (`@supabase/supabase-js`).
- Created JWT Session Management library (`src/lib/session.ts`) utilizing Web Crypto API.
- Implemented edge-native authentication `middleware.ts` to redirect unauthorized requests to `/login`.
- Created APIs for credentials authentication (`/api/auth/login`, `/api/auth/logout`).
- Initialized server-side Supabase client (`src/lib/supabase.ts`) using the Service Role Key.
- Created Products catalog and detail routes (`/api/products`, `/api/products/[id]`) with Google Drive sharing URL parsing logic.
- Created bulk discount endpoint `/api/discounts` supporting percentage discounts by category and restoring prices.
- Configured luxury visual design tokens, animations, serif/sans-serif fonts (Playfair Display and Outfit) in `src/app/globals.css`.
- Built glassmorphic `LoginPage` and `LoginForm` client component with error shake animation.
- Built interactive `Dashboard` component with sidebar filter controls, search, and inventory grid.
- Implemented real-time image preview in Add/Edit product drawers, quick stock status toggle, and bulk discount portals.
- Fixed CSS custom property parsing by replacing decimal points with hyphen names (e.g., `--space-2.5` to `--space-2-5`).
- Verified production build and code compiler successfully check out with 0 compilation errors.
Why: Create the complete Aarisha Admin Panel hosted on Vercel connecting to Supabase.

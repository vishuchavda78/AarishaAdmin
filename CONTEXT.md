# Context: Aarisha Admin Panel

This is the living reference document for the Aarisha Admin Panel project. It is updated after every execution session to reflect the current status of the codebase, features, architecture, and design system.

---

## Folder & File Structure

```text
c:\Projects\AarishaAdmin/
├── .git/
├── .next/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   └── logout/
│   │   │   │       └── route.ts
│   │   │   ├── discounts/
│   │   │   │   └── route.ts
│   │   │   └── products/
│   │   │       ├── [id]/
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   ├── discounts/
│   │   │   ├── discounts.module.css
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   ├── login.module.css
│   │   │   └── page.tsx
│   │   ├── lib/
│   │   │   ├── session.ts
│   │   │   └── supabase.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.module.css
│   │   └── page.tsx
│   └── middleware.ts
├── .env
├── .gitignore
├── Changelog.md
├── Context.md
├── RULES.md
├── UISKILL.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── next.config.ts
```

---

## Feature List

### Implemented
- **Scaffolding:** Next.js project with TypeScript, ESLint, and Vanilla CSS Modules.
- **Secure Authentication:** Web Crypto API-based JWT session authentication and cookie configuration.
- **Unauthorized Redirection:** Edge middleware to block access to protected dashboard/APIs and redirect to `/login`.
- **Database Integration:** Server-side Supabase client initialized via Service Role Key (securely bypassing RLS).
- **Product CRUD APIs & UI:** Add, Edit, Delete, Fetch, and Quick Stock Toggle operations.
- **Live Google Drive Previews:** Auto-extracts file IDs from shared Google Drive links, converting them into direct preview thumbnails (`/thumbnail?id=[ID]&sz=w1000`) for instant live preview in the form and grid view.
- **Category Filters:** Rings, Neckpieces, Bracelets, and Earrings catalog filtering with dynamic item counts.
- **Bulk Discounts:** Apply a percentage-based discount category-wide (storing pre-discount price in `original_price` to prevent stacked calculations) and clear discounts in bulk to restore original prices.
- **Discounts Page:** Separate `/discounts` admin page for bulk discounts with category-wide and selected-product discount workflows.

### In-Progress
- None.

### Planned
- Staging deployment configuration on Vercel.

---

## Architecture Overview

- **Stack:** Next.js (App Router, React 19, TypeScript)
- **Styling:** Vanilla CSS (CSS Modules + Global variables)
- **External Services:**
  - **Supabase:** Postgres Database hosting products catalog.
  - **Google Drive:** Image host (URLs are parsed to thumbnail endpoints for live display).
  - **Vercel:** Deployment host.
- **Security:**
  - Server-side environment secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`)
  - Web Crypto API-based JWT sessions (zero third-party dependencies).
  - Edge Middleware-based redirection of unauthorized traffic.
  - HTTP-Only, SameSite=Strict cookies.

---

## Key Conventions and Patterns

1. **Strict Server-Side Database Communication:** No Supabase JS client calls on client components. All database requests are routed through Next.js server actions or API endpoints to guard the Service Role Key.
2. **Drive Image Thumbnail Resolution:** Whenever a user pastes a Google Drive link, the application parses the unique file ID and converts it to `https://drive.google.com/thumbnail?id=[ID]&sz=w1000` to serve the image preview natively within `<img>` tags.
3. **Vanilla CSS Design Tokens:** All sizing, spacings, animations, and color schemes are mapped to CSS custom variables in `src/app/globals.css`.
4. **Price and Discount Synchronization:** On product creation or modification, both `price` and `original_price` columns are set to the base price entered by the user. Applying a category discount calculates a new value for `price` while keeping `original_price` populated as the baseline. Clearing discounts copies `original_price` back into the `price` column, keeping both fields populated and in sync.
5. **Concurrent Bulk Operations over Upsert:** Bulk operations (like applying and clearing discounts) use individual `.update()` operations resolved concurrently via `Promise.all` instead of PostgREST `.upsert()`. This ensures that Row-Level Security (RLS) policies and PostgreSQL constraints on production environments do not reject the query.

---

## UI/Motion

- **Component Foundation:** Vanilla HTML/React tags with CSS Modules styling.
- **Motion Budget:** Utility admin panel — motion is functional and restrained. Capped at 150ms-250ms for high responsiveness.
- **Tokens Configured in `globals.css`:**
  - `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`
  - `--duration-fast: 150ms`
  - `--duration-base: 250ms`
  - Tinted color surfaces (no pure grays or blacks) for a luxury brand feel.

---

## SEO
*Not active (Admin panel is private and non-indexed).*

---

## Audit Findings
*None.*

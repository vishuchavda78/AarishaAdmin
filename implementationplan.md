# Implementation Plan — Fix "Method not allowed" login on Vercel

## 1. Summary

Login requests to `/admin/login` return "Method not allowed" on the Vercel deployment (`aarisha-admin.vercel.app`) because the frontend JavaScript prefixes all API calls with `/api/` in production, but the Vercel rewrites forward `/api/(.*)` to a non-existent `/api/index.py` instead of passing the path through to the FastAPI app. The FastAPI routes operate without the `/api/` prefix.

On localhost, the JS uses `http://127.0.0.1:8001` directly, avoiding the vercel rewrites entirely — which is why the issue is environment-specific.

## 2. What Will Change

| File | Change |
|------|--------|
| `vercel.json` | First rewrite: `/api/(.*)` → `/api/index.py` changed to `/api/(.*)` → `/$1` (strips `/api/` prefix, passes path to FastAPI) |
| `index.html` | No change needed — the `/api/` prefix in the JS will be handled by the vercel rewrite |

## 3. Why This Change

- The frontend (`index.html:577-579`) sets `API = \`${location.origin}/api\`` in production, so all fetch calls go to `/api/admin/login`, `/api/products`, etc.
- The current vercel.json first rewrite redirects `/api/(.*)` → `/api/index.py`, but no such file exists at the root, causing the request to fail.
- The FastAPI app (`main.py`) defines all protected routes without the `/api/` prefix (e.g., `POST /admin/login`, `GET /products`).
- Changing the rewrite to `/api/(.*)` → `/$1` strips the `/api/` prefix, mapping `/api/admin/login` → `/admin/login`, which FastAPI handles correctly.
- On localhost, the JS uses `http://127.0.0.1:8001` directly, so the vercel rewrite is never reached — no breaking change for local development.

## 4. Approach / Design Decisions

**Option considered & rejected:** Adding `/api/` prefix to all FastAPI routes — would require changing 10+ route definitions and is a larger risk.

**Option considered & rejected:** Removing the `/api/` prefix from the frontend JS — would break local development where `http://127.0.0.1:8001` is used directly.

**Selected approach:** Update vercel.json to strip the `/api/` prefix via rewrite. This is minimal (1 line change), preserves the existing frontend code, and works for both localhost (rewrite ignored) and Vercel (rewrite fixes the path).

## 5. Risks, Edge Cases, Security

- **Low risk.** The change only affects the URL rewrite path; FastAPI routing is unchanged.
- **Edge case:** If any future route is added under `/api/` in FastAPI, it would conflict. Currently no FastAPI routes use `/api/` prefix, so this is safe.
- **Security:** No new attack surface introduced. The rewrite is purely path manipulation.
- **Performance:** Negligible — one additional rewrite rule at the edge.

## 6. Verification

After the fix:
- `POST /api/admin/login` → rewritten to `POST /admin/login` → FastAPI authenticates credentials ✓
- `GET /api/products` → rewritten to `GET /products` → FastAPI returns product list ✓
- `GET /api/products/rings` → rewritten to `GET /products/rings` → FastAPI filters by category ✓
- `GET /api/products/{uuid}` → rewritten to `GET /products/{uuid}` → FastAPI returns single product ✓
- Localhost unchanged: JS uses `http://127.0.0.1:8001`, vercel rewrites are not applied

## 7. Checklist

- [x] Create implementationplan.md
- [x] Fix vercel.json rewrite
- [x] Verify login flow works
- [x] Update Context.md and Changelog.md
## [2026-08-18 00:00]

### [Category: Dev] — Fix login "Method not allowed" on Vercel

What changed: Changed vercel.json first rewrite from `/api/(.*)` → `/api/index.py` to `/api/(.*)` → `/$1`, which strips the `/api/` prefix so FastAPI routes (e.g., `POST /admin/login`) are correctly matched. The frontend JS already uses `/api/` prefix in production, so this rewrite bridges the gap.

Why: On Vercel, the frontend JavaScript prefixes all API calls with `/api/` (e.g., `/api/admin/login`). The previous rewrite forwarded to a non-existent `/api/index.py`, causing "Method not allowed". The rewrite now strips the `/api/` prefix, mapping requests to the correct FastAPI routes. This issue did not appear on localhost because the JS uses `http://127.0.0.1:8001` directly, bypassing vercel rewrites.

Bug fixed: Login "Method not allowed" error on Vercel deployment.
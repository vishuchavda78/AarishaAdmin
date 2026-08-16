"""Vercel entrypoint for the Aarisha Admin API.

Vercel rewrites  /api/(.*)  →  /api/index.py
The ASGI scope keeps the ORIGINAL path, e.g. /api/admin/login.
So we need to strip the /api prefix before handing off to admin_app,
which defines its routes without that prefix (e.g. /admin/login).
"""
import os
from starlette.types import ASGIApp, Receive, Scope, Send

from backend.app.main import app as admin_app

API_PREFIX = "/api"


class StripPrefixMiddleware:
    """ASGI middleware that strips a URL prefix from incoming requests."""

    def __init__(self, app: ASGIApp, prefix: str) -> None:
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket"):
            path: str = scope.get("path", "")
            if path.startswith(self.prefix):
                scope = dict(scope)
                scope["path"] = path[len(self.prefix) :] or "/"
                raw = scope.get("raw_path", b"")
                if raw and raw.startswith(self.prefix.encode()):
                    scope["raw_path"] = raw[len(self.prefix) :] or b"/"
        await self.app(scope, receive, send)


# Vercel looks for the `app` variable.
# Wrap admin_app with the prefix stripper so /api/admin/login → /admin/login.
app = StripPrefixMiddleware(admin_app, API_PREFIX)

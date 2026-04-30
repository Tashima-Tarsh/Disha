import time

from app.core.observability import RequestTracer  # type: ignore
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SentinelSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = RequestTracer.generate_request_id()
        request.state.request_id = request_id

        start_time = time.time()
        response: Response = await call_next(request)
        process_time = time.time() - start_time

        # Secure Headers (Defense in Depth)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none';"
        )
        response.headers["X-Process-Time"] = str(process_time)

        return response

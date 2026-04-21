import time
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)


class SentinelSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        path = request.url.path
        method = request.method
        client_host = request.client.host if request.client else "unknown"

        is_sensitive = any(
            p in path for p in ["/auth", "/investigate", "/rl", "/ranking"]
        )

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        status_code = response.status_code

        if is_sensitive:
            log_data = {
                "path": path,
                "method": method,
                "status": status_code,
                "duration": duration,
                "client": client_host,
            }

            if status_code == 401:
                logger.warning("security_auth_failure", **log_data)

            elif status_code == 403:
                logger.error("security_access_denied", **log_data)

            elif status_code == 500:
                logger.critical("security_endpoint_failure", **log_data)

        return response

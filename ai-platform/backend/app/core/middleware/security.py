"""Security Middleware for FastAPI - Sentinel Monitoring Layer."""

import time
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


logger = structlog.get_logger(__name__)

class SentinelSecurityMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor authentication events and API integrity."""

    async def dispatch(self, request: Request, call_next):
        # 1. Identity & Path Monitoring
        path = request.url.path
        method = request.method
        client_host = request.client.host if request.client else "unknown"

        # 2. Critical Endpoint Monitoring
        is_sensitive = any(p in path for p in ["/auth", "/investigate", "/rl", "/ranking"])

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # 3. Security Event Correlation
        status_code = response.status_code

        # Log all sensitive access
        if is_sensitive:
            log_data = {
                "path": path,
                "method": method,
                "status": status_code,
                "duration": duration,
                "client": client_host
            }

            # Detect suspicious patterns
            if status_code == 401:
                # Failed Auth - Potential Brute Force
                logger.warning("security_auth_failure", **log_data)
                # In a real scenario, we'd trigger an alert if frequency > threshold

            elif status_code == 403:
                # Forbidden - Unauthorized access attempt
                logger.error("security_access_denied", **log_data)

            elif status_code == 500:
                # Internal Server Error on sensitive endpoint - Potential exploit or crash
                logger.critical("security_endpoint_failure", **log_data)

        return response

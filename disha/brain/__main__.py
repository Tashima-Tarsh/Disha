from __future__ import annotations

import uvicorn

from .config import settings


def main() -> None:
    uvicorn.run(
        "disha.brain:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
        access_log=True,
    )


if __name__ == "__main__":
    main()

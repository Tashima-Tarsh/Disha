from __future__ import annotations

import argparse

from .http_api import serve


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the AG-Claw clean-room backend service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8008, type=int)
    args = parser.parse_args()
    serve(args.host, args.port)


if __name__ == "__main__":
    main()

from __future__ import annotations

from hashlib import sha256


def chain_hash(previous_hash: str, payload: str) -> str:
    return sha256(f"{previous_hash}:{payload}".encode()).hexdigest()


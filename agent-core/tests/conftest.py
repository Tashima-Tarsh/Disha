"""Ensure the agent_core package is importable for tests.

Creates a temporary symlink from agent_core -> agent-core so that
Python's import system can resolve the package with relative imports.
"""
import os
import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parent.parent.parent
_symlink = _repo_root / "agent_core"
_target = _repo_root / "agent-core"

# Ensure symlink exists
if not _symlink.exists():
    os.symlink(_target, _symlink)

# Ensure repo root is on sys.path
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

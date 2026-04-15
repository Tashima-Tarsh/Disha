"""
pytest conftest: makes 'cognitive_engine' importable from tests.

The package lives in a directory named 'cognitive-engine' (hyphen), which
Python cannot import directly. This conftest registers the directory as the
'cognitive_engine' package in sys.modules before any test is collected,
so that all test files can do:

    from cognitive_engine.cognitive_loop import CognitiveEngine
"""
import importlib.util
import sys
from pathlib import Path

_pkg_dir = Path(__file__).parent  # .../cognitive-engine/

if "cognitive_engine" not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        "cognitive_engine",
        str(_pkg_dir / "__init__.py"),
        submodule_search_locations=[str(_pkg_dir)],
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["cognitive_engine"] = mod
    spec.loader.exec_module(mod)

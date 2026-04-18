import importlib.util
import sys
from pathlib import Path

_pkg_dir = Path(__file__).parent

if "cognitive_engine" not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        "cognitive_engine",
        str(_pkg_dir / "__init__.py"),
        submodule_search_locations=[str(_pkg_dir)],
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["cognitive_engine"] = mod
    spec.loader.exec_module(mod)

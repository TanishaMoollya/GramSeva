"""GramSeva Backend Package"""
import sys
from pathlib import Path

# Automatically add GramSeva project root and backend dir to sys.path
_current_file = Path(__file__).resolve()
_app_dir = _current_file.parent
_backend_dir = _app_dir.parent
_root_dir = _backend_dir.parent

for _p in [str(_root_dir), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

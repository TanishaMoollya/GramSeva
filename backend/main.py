"""
GramSeva Backend Direct Entrypoint
Run directly: python main.py
"""
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent

for _p in [str(_root_dir), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    print(f"🚀 Starting {settings.APP_NAME} on http://localhost:{settings.PORT}")
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

#!/usr/bin/env bash
# АэроЛаб — запуск на Ubuntu/Debian/Linux
cd "$(dirname "$0")"
echo "========================================"
echo "  АэроЛаб — http://localhost:8084"
echo "  Ctrl+C останавливает стенд"
echo "========================================"
( sleep 1; xdg-open http://localhost:8084 >/dev/null 2>&1 || true ) &
exec python3 -m http.server 8084 --bind 0.0.0.0

#!/usr/bin/env bash
# АэроЛаб — запуск на Ubuntu/Debian/Linux через Node.js (без установки зависимостей)
cd "$(dirname "$0")"
echo "========================================"
echo "  АэроЛаб — http://localhost:8085 (Node.js)"
echo "  Ctrl+C останавливает стенд"
echo "========================================"
( sleep 1; xdg-open http://localhost:8085 >/dev/null 2>&1 || true ) &
if command -v node >/dev/null 2>&1; then
  exec node server.js
else
  echo "Node.js не найден — запускаю через Python 3…"
  exec python3 -m http.server 8085 --bind 0.0.0.0
fi

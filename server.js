'use strict';
/* АэроЛаб · server.js — статический сервер на чистом Node.js (без зависимостей), v1.1.0
   Запуск: node server.js [--open]
   По схеме «start-ubuntu.sh / start-windows.bat → node server.js --open».

   Возможности:
     · отдача статики из корня репозитория, index.html для директорий;
     · MIME-типы и UTF-8; Brotli (для Accept-Encoding: br) и gzip для текстовых файлов;
     · защита от path traversal; nosniff / Referrer-Policy / CSP frame-ancestors;
     · no-cache для текстовых файлов, сутки кэша для бинарных (картинки, шрифты);
     · занятый порт — автоперебор 8085…8095 (баннер всегда показывает фактический порт);
     · --open: сам открыть браузер (Windows/macOS/Linux с DISPLAY);
     · встраивание в Moodle: FRAME_ANCESTORS=https://moodle.school.ru node server.js --open

   Окружение / аргументы:
     PORT             порт (по умолчанию 8085; аргументом тоже: node server.js 8090)
     HOST             адрес привязки (по умолчанию 0.0.0.0 — доступно из школьной сети)
     FRAME_ANCESTORS  кто может встраивать сайт во iframe (по умолчанию * — как на Pages)
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');

const ROOT = __dirname;
const OPEN = process.argv.includes('--open');
const PORT_ARG = process.argv.find((a, i) => i > 1 && /^\d+$/.test(a));
const PORT = sanitizePort(process.env.PORT || PORT_ARG || 8085);
const HOST = process.env.HOST || '0.0.0.0';
const FRAME_ANCESTORS = (process.env.FRAME_ANCESTORS || '*').trim();

function sanitizePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`[aerolab] Некорректный порт «${value}», использую 8085`);
    return 8085;
  }
  return port;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);

function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (e) {
    return null; // битая кодировка в URL
  }
  // Нормализуем и запрещаем выход за пределы корня
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const filePath = path.join(ROOT, normalized);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    return null;
  }
  return filePath;
}

function statSafe(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (e) {
    return null;
  }
}

const server = http.createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    let filePath = resolveFile(url.pathname);
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    let stat = statSafe(filePath);
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = statSafe(filePath);
    }
    if (!stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const textLike = COMPRESSIBLE.has(ext);

    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': 'frame-ancestors ' + FRAME_ANCESTORS,
    };
    if (textLike) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    } else {
      headers['Cache-Control'] = 'public, max-age=86400';
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (req.method === 'HEAD') {
      res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
      res.end();
      return;
    }

    if (textLike && acceptEncoding.includes('br')) {
      res.writeHead(200, Object.assign(headers, {
        'Content-Encoding': 'br',
        'Vary': 'Accept-Encoding',
      }));
      fs.createReadStream(filePath)
        .pipe(zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }))
        .pipe(res);
      return;
    }

    if (textLike && /\bgzip\b/.test(acceptEncoding)) {
      res.writeHead(200, Object.assign(headers, {
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding',
      }));
      fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
      return;
    }

    res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[aerolab] Ошибка запроса:', err && err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

const MAX_PORT_SHIFT = 10;

function announce(port) {
  console.log('════════════════════════════════════════');
  console.log(`  АэроЛаб сервер запущен на http://${HOST}:${port} (локально: http://localhost:${port})`);
  console.log(`  Ctrl+C останавливает стенд`);
  console.log(`  iframe: frame-ancestors ${FRAME_ANCESTORS}`);
  console.log('════════════════════════════════════════');
}

function openBrowser(port) {
  const url = `http://localhost:${port}`;
  if (process.platform === 'win32') {
    exec(`cmd /c start "" "${url}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    exec(`xdg-open "${url}" >/dev/null 2>&1 || true`);
  }
}

function listen(port, shift) {
  // Снимаем возможные хвосты прошлых попыток: 'listening' срабатывает один раз
  // при фактическом бинде, поэтому баннер обязан показывать реальный порт.
  server.removeAllListeners('error');
  server.removeAllListeners('listening');
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && shift < MAX_PORT_SHIFT) {
      console.log(`[aerolab] Порт ${port} занят — пробую ${port + 1}…`);
      listen(port + 1, shift + 1);
      return;
    }
    console.error(`[aerolab] Не удалось занять порт ${port}: ${err && err.message}`);
    process.exit(1);
  });
  server.once('listening', () => {
    announce(port);
    if (OPEN) {
      openBrowser(port);
    }
  });
  server.listen(port, HOST);
}

listen(PORT, 0);

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

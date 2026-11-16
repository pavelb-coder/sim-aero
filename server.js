'use strict';
/* АэроЛаб · server.js — статический сервер на чистом Node.js (без зависимостей).
   Альтернатива `python3 -m http.server 8085` для тех, у кого установлен Node.js.

   Возможности:
     · отдача статики из корня репозитория, index.html для директорий;
     · корректные MIME-типы и UTF-8, gzip для текстовых ресурсов (>1 КБ);
     · защита от path traversal (запрос выше корня не выйдет);
     · заголовки nosniff / Referrer-Policy / CSP frame-ancestors;
     · встраивание в Moodle: FRAME_ANCESTORS=https://moodle.school.ru node server.js

   Переменные окружения / аргументы:
     PORT             порт (по умолчанию 8085; можно первым аргументом: node server.js 8090)
     HOST             адрес привязки (по умолчанию 0.0.0.0 — доступно из школьной сети)
     FRAME_ANCESTORS  кто может встраивать сайт во iframe (по умолчанию * — как на GitHub Pages)
   Пример:  PORT=8085 FRAME_ANCESTORS="https://moodle.school.ru 'self'" node server.js
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = __dirname;
const PORT = sanitizePort(process.env.PORT || process.argv[2] || 8085);
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
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
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
      res.end('404 Not Found: ' + url.pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': 'frame-ancestors ' + FRAME_ANCESTORS,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    };

    const gzipable = contentType.startsWith('text/') ||
      contentType.startsWith('application/json') ||
      contentType.startsWith('application/javascript') ||
      contentType.startsWith('image/svg');
    const wantsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');

    if (req.method === 'HEAD') {
      res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
      res.end();
      return;
    }

    if (wantsGzip && gzipable && stat.size > 1024) {
      res.writeHead(200, Object.assign(headers, { 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' }));
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      return;
    }

    res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[aerolab] Ошибка запроса:', err && err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  }
});

function statSafe(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (e) {
    return null;
  }
}

const MAX_PORT_SHIFT = 10;
let currentPort = PORT;

function announce(port) {
  console.log('════════════════════════════════════════');
  console.log('  АэроЛаб · Node server');
  console.log(`  http://localhost:${port}   (сеть: http://${HOST}:${port})`);
  console.log(`  корень: ${ROOT}`);
  console.log(`  Ctrl+C останавливает стенд`);
  console.log(`  iframe: frame-ancestors ${FRAME_ANCESTORS}`);
  console.log('════════════════════════════════════════');
}

function listen(port, shift) {
  currentPort = port;
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
  server.once('listening', () => announce(port));
  server.listen(port, HOST);
}

listen(PORT, 0);

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

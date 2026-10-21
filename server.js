// Minimal static file server for public/. No dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./public/', import.meta.url));
// Production (linux box) historically listens on 8088 behind a proxy.
const PORT = process.env.PORT ?? (process.platform === 'linux' ? 8088 : 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

// Friendly aliases for old links.
const ROUTES = { '/': '/index.html', '/resume': '/media/resume.pdf' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    const path = normalize(join(ROOT, decodeURIComponent(ROUTES[pathname] ?? pathname)));
    if (!path.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`Serving public/ on http://localhost:${PORT}`));

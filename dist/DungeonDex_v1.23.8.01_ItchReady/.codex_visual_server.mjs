import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.argv[2] || 63221);
const root = process.cwd();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

http.createServer((req, res) => {
  const rawUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const requestPath = rawUrl.pathname === '/' ? '/index.html' : rawUrl.pathname;
  const filePath = path.normalize(path.join(root, decodeURIComponent(requestPath)));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`DungeonDex visual QA server listening on http://127.0.0.1:${port}/`);
});

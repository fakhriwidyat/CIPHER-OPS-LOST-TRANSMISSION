// Local multiplayer preview; production uses the persistent D1-backed Worker.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173), host = process.env.HOST || '0.0.0.0';
const network = Object.values(os.networkInterfaces()).flat().find(n => n && n.family === 'IPv4' && !n.internal);
const shareUrl = network ? `http://${network.address}:${port}/` : `http://127.0.0.1:${port}/`;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav' };
async function start() {
  const { handleAPI, MemoryStore } = await import(pathToFileURL(path.join(root, 'server/api.mjs')).href);
  const store = new MemoryStore();
  const server = http.createServer(async (req, res) => {
    const base = `http://${req.headers.host || '127.0.0.1:' + port}`;
    if (req.url.split('?')[0] === '/api/health') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ ok: true, multiplayer: true, maxPlayers: 4, shareUrl })); }
    if (req.url.startsWith('/api/')) {
      let size = 0; const parts = [];
      for await (const chunk of req) { size += chunk.length; if (size > 4096) { res.writeHead(413); return res.end(); } parts.push(chunk); }
      const request = new Request(new URL(req.url, base), { method: req.method, headers: req.headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(parts) }) });
      const result = await handleAPI(request, store); res.writeHead(result.status, Object.fromEntries(result.headers)); return res.end(Buffer.from(await result.arrayBuffer()));
    }
    let relative; try { relative = decodeURIComponent(req.url.split('?')[0]); } catch (_) { res.writeHead(400); return res.end(); }
    const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
    const rel = path.relative(root, file);
    // Serve only game assets, never repository metadata or server source.
    if (rel.startsWith('..') || !(rel === 'index.html' || /^(assets|css|js)[\\/]/.test(rel)) || /(^|[\\/])\./.test(rel)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(data); });
  });
  server.requestTimeout = 15000;
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => { console.log(`Local: http://127.0.0.1:${port}/`); console.log(`Wi-Fi: ${shareUrl}`); console.log('Internet: use the hosted game URL. Local rooms reset when this server stops.'); });
}
start().catch(error => { console.error(error); process.exitCode = 1; });

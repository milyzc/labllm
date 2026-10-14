import './env.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { respond, ollamaStatus, reviewsPublic, loggedUser } from './lab.js';
import { vlog, C, newRid, withRid } from './log.js';

const PORT = process.env.PORT || 3000;
const INDEX = fileURLToPath(new URL('./public/index.html', import.meta.url));

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type + '; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  // Usa el x-request-id entrante si es válido; si no, genera uno.
  const inc = req.headers['x-request-id'];
  const rid = typeof inc === 'string' && /^[\w-]{1,64}$/.test(inc) ? inc : newRid();
  res.setHeader('x-request-id', rid);

  withRid(rid, async () => {
    const t0 = performance.now();
    const isChat = req.method === 'POST' && req.url === '/api/chat';
    try {
      if (req.method === 'GET' && req.url === '/') return send(res, 200, await readFile(INDEX, 'utf8'), 'text/html');
      if (req.method === 'GET' && req.url === '/api/status') return send(res, 200, { ...(await ollamaStatus()), reviews: reviewsPublic(), user: loggedUser() });
      if (isChat) {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 10_000) return send(res, 413, { error: 'muy grande' }); }
        return send(res, 200, { ...(await respond(JSON.parse(raw))), requestId: rid });
      }
      send(res, 404, { error: 'no encontrado' });
    } catch (e) {
      vlog(`💥 Error: ${e.message || e}`, C.red);
      send(res, 500, { error: String(e.message || e), requestId: rid });
    } finally {
      if (isChat) vlog(`⏱  ${req.method} ${req.url} → ${res.statusCode} · ${(performance.now() - t0).toFixed(0)} ms`, C.dim);
    }
  });
});

// Solo localhost: el lab tiene vulnerabilidades a propósito.
server.listen(PORT, '127.0.0.1', () => console.log(`Lab LLM en http://127.0.0.1:${PORT}`));

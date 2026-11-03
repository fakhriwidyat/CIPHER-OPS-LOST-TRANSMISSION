// Vercel keeps the frontend and API same-origin; persistent rooms live in D1.
const DEFAULT_SERVER = 'https://cipher-ops-lost-transmission.flexbox-code.chatgpt.site';
class GatewayError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
function send(response, status, data) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.statusCode = status;
  response.end(JSON.stringify(data));
}
async function readBody(request) {
  if (Number(request.headers['content-length']) > 4096) throw new GatewayError('Permintaan terlalu besar.', 413);
  let raw;
  if (request.body !== undefined) raw = typeof request.body === 'string' ? request.body : request.body instanceof Uint8Array ? Buffer.from(request.body).toString('utf8') : JSON.stringify(request.body);
  else {
    let size = 0; const chunks = [];
    for await (const chunk of request) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 4096) throw new GatewayError('Permintaan terlalu besar.', 413); chunks.push(bytes); }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (!raw || Buffer.byteLength(raw, 'utf8') > 4096) throw new GatewayError('Isi permintaan tidak valid atau terlalu besar.', raw ? 413 : 400);
  try { const data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); }
  catch { throw new GatewayError('JSON tidak valid.', 400); }
  return raw;
}
export function createGateway({ fetcher = (...args) => fetch(...args), server = DEFAULT_SERVER } = {}) {
  return async function gateway(request, response) {
    try {
      const incoming = new URL(request.url, 'https://gateway.invalid');
      const path = typeof request.query?.path === 'string' ? request.query.path : incoming.searchParams.get('path');
      if (path !== 'health' && !/^rooms\/(create|[A-Z2-9]{6}\/(join|command))$/.test(path || '')) throw new GatewayError('Endpoint room tidak ditemukan.', 404);
      const method = request.method || 'GET';
      if (method !== (path === 'health' ? 'GET' : 'POST')) throw new GatewayError('Metode permintaan tidak didukung.', 405);
      // Do not let another website issue state-changing browser requests here.
      const origin = request.headers.origin;
      if (origin) {
        let source; try { source = new URL(origin); } catch { throw new GatewayError('Origin tidak diizinkan.', 403); }
        if (!['https:', 'http:'].includes(source.protocol) || source.host !== request.headers.host) throw new GatewayError('Origin tidak diizinkan.', 403);
      }
      if (method === 'POST' && !(request.headers['content-type'] || '').startsWith('application/json')) throw new GatewayError('Gunakan JSON.', 415);
      const backend = new URL(server);
      if (backend.protocol !== 'https:' || backend.username || backend.password || backend.search || backend.hash || backend.pathname !== '/') throw new GatewayError('Konfigurasi server room tidak valid.', 503);
      const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Origin: backend.origin };
      if (request.headers.authorization) {
        if (!/^Bearer [a-f0-9]{32}$/.test(request.headers.authorization)) throw new GatewayError('Sesi pemain tidak valid. Gabung ulang ke room.', 401);
        headers.Authorization = request.headers.authorization;
      }
      const upstream = await fetcher(backend.origin + '/api/' + path, {
        method, headers, ...(method === 'POST' ? { body: await readBody(request) } : {}),
        signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store'
      });
      if (!(upstream.headers.get('content-type') || '').includes('application/json')) throw new GatewayError('Server room belum memberikan respons yang valid. Coba lagi sebentar.', 502);
      let data; try { data = await upstream.json(); } catch { throw new GatewayError('Respons server room tidak lengkap. Coba lagi.', 502); }
      if (path === 'health' && upstream.ok && data?.ok !== true) throw new GatewayError('Server room belum siap.', 503);
      send(response, upstream.status, data);
    } catch (error) {
      const status = error instanceof GatewayError ? error.status : error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : 502;
      send(response, status, { error: error instanceof GatewayError ? error.message : status === 504 ? 'Server room terlalu lama merespons. Coba lagi sebentar.' : 'Server room belum bisa dihubungi. Coba lagi sebentar.' });
    }
  };
}
export default createGateway();

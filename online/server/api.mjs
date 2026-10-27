import { RoomError, createRoom, joinRoom, authenticate, command, snapshot, ROOM_LIFETIME } from './rooms.mjs';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode() { return Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join(''); }
export class MemoryStore {
  constructor() { this.rooms = new Map(); }
  async read(code) { const row = this.rooms.get(code); return row ? structuredClone(row) : null; }
  async insert(room) { if (this.rooms.has(room.code)) return false; this.rooms.set(room.code, { revision: 0, room: structuredClone(room) }); return true; }
  async update(code, revision, room) { const row = this.rooms.get(code); if (!row || row.revision !== revision) return false; this.rooms.set(code, { revision: revision + 1, room: structuredClone(room) }); return true; }
  async prune(now) { for (const [code, row] of this.rooms) if (now - row.room.updated > ROOM_LIFETIME) this.rooms.delete(code); }
}
// Compare-and-swap keeps simultaneous submissions atomic across Worker instances.
export class D1Store {
  constructor(db) { this.db = db; }
  async read(code) { const row = await this.db.prepare('SELECT revision, state FROM rooms WHERE code = ?').bind(code).first(); return row ? { revision: row.revision, room: JSON.parse(row.state) } : null; }
  async insert(room) { const result = await this.db.prepare('INSERT OR IGNORE INTO rooms (code, revision, state, updated) VALUES (?, 0, ?, ?)').bind(room.code, JSON.stringify(room), room.updated).run(); return result.meta.changes === 1; }
  async update(code, revision, room) { const result = await this.db.prepare('UPDATE rooms SET revision = revision + 1, state = ?, updated = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(room), room.updated, code, revision).run(); return result.meta.changes === 1; }
  async prune(now) { await this.db.prepare('DELETE FROM rooms WHERE updated < ?').bind(now - ROOM_LIFETIME).run(); }
}
export async function handleAPI(request, store) {
  try {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, multiplayer: true, maxPlayers: 4 });
    if (request.method !== 'POST') return json({ error: 'Gunakan POST.' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'Origin tidak diizinkan.' }, 403);
    if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'Gunakan JSON.' }, 415);
    if (Number(request.headers.get('content-length')) > 4096) return json({ error: 'Permintaan terlalu besar.' }, 413);
    const raw = await request.text(); if (raw.length > 4096) return json({ error: 'Permintaan terlalu besar.' }, 413);
    let input; try { input = JSON.parse(raw); } catch { throw new RoomError('JSON tidak valid.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RoomError('Permintaan tidak valid.');
    const now = Date.now();
    if (url.pathname === '/api/rooms/create') {
      await store.prune(now);
      for (let i = 0; i < 6; i++) {
        const { room, player } = createRoom(roomCode(), input.name, now);
        if (await store.insert(room)) return json({ secret: player.secret, room: { ...snapshot(room, player, now), revision: 0 } }, 201);
      }
      throw new RoomError('Gagal membuat kode room. Coba lagi.', 503);
    }
    const match = /^\/api\/rooms\/([A-Z2-9]{6})\/(join|command)$/.exec(url.pathname);
    if (!match) throw new RoomError('Room tidak ditemukan. Periksa kode 6 karakter.', 404);
    for (let attempt = 0; attempt < 12; attempt++) {
      const stored = await store.read(match[1]); if (!stored) throw new RoomError('Room tidak ditemukan atau server sudah direset.', 404);
      const room = stored.room; let player, reply;
      if (match[2] === 'join') player = joinRoom(room, input.name, now);
      else {
        const secret = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
        player = authenticate(room, secret); reply = command(room, player, input, now);
      }
      if (await store.update(room.code, stored.revision, room)) return json({ ...(match[2] === 'join' ? { secret: player.secret } : {}), room: { ...snapshot(room, player, now), revision: stored.revision + 1 }, ...reply });
    }
    throw new RoomError('Kanal sibuk. Coba kirim lagi.', 503);
  } catch (error) {
    if (!(error instanceof RoomError)) console.error('Room API:', error);
    return json({ error: error instanceof RoomError ? error.message : 'Server sedang bermasalah. Coba lagi sebentar.' }, error.status || 500);
  }
}

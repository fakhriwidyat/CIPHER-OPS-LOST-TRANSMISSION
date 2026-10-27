export async function GET() { return Response.json({ ok: true, multiplayer: true, maxPlayers: 4 }, { headers: { 'Cache-Control': 'no-store' } }); }

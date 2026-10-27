# CIPHER OPS / hosted multiplayer

Deployable Vinext/Cloudflare Worker wrapper for the vanilla game in the parent directory. `public/game.html`, `public/{js,css,assets}` and `server/` are synchronized from the game with `node ../scripts/sync-online.cjs`. The root route redirects to `/game.html`, preserving valid room invitations.

The room API stores authoritative state in D1. Revision compare-and-swap updates handle concurrent submissions without lost progress or duplicate mission scores. Bearer session secrets are excluded from snapshots; each player sees only their own challenge. Polling updates roughly every 1.2 seconds and backs off during network failure.

Room state includes readiness, private packet completion, shared health/hints/score, reconnect heartbeats, and host migration. At least two connected players are required. Rooms expire after six hours without activity; creation prunes expired records.

The generated schema migration is in `drizzle/`, sourced from `db/schema.ts`. Do not modify applied migrations or create tables inside requests. Sites applies hosted migrations during publication.

Use the Sites skill build/publication helpers. `npm start -- --port 4175` previews the production Worker with local D1. Apply the local migration once using the documented Wrangler D1 command. `node ../tests/smoke-online.mjs http://127.0.0.1:4175` completes all six missions with four independent HTTP sessions, then leaves the QA room.

The user selected public link access. A six-character room code is still required to join a team. Solo save data stays in the browser, separate from room state.

Operator update: `server/assignments.mjs` defines four unique selectable identities and six math task types. Each stage assigns a different kind to every operator while preserving one shared objective and completion barrier. A private server seed and session round make assignments deterministic across reconnect/retry and varied across new rooms/lobbies. Calibration reveals two measured points and never includes the hidden coefficients in its payload. Role claims use the same CAS transaction as other commands, preventing duplicate selections even when two clients claim a character simultaneously. Active legacy rooms keep the prior question rules until a new lobby/game is started; no database schema migration is needed.

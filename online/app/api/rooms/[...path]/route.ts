import { env } from 'cloudflare:workers';
import { D1Store, handleAPI } from '../../../../server/api.mjs';
export async function POST(request: Request) { return handleAPI(request, new D1Store(env.DB)); }

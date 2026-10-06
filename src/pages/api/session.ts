import type { APIRoute } from "astro";
import { json } from "../../lib/http";
import { session } from "../../lib/auth";

export const prerender = false;

// GET /api/session → 200 { client, admin } si connecté, 401 sinon
export const GET: APIRoute = async ({ request }) => {
  const s = await session(request);
  return json(s, s.client ? 200 : 401);
};

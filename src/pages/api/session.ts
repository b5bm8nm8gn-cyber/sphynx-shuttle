import type { APIRoute } from "astro";
import { json } from "../../lib/http";
import { session } from "../../lib/auth";

export const prerender = false;

// GET /api/session → { admin } (l'accès Sopht est géré par la protection du site Webflow)
export const GET: APIRoute = async ({ request }) => json(await session(request));

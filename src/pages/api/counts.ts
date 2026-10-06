import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, preflight } from "../../lib/http";

export const prerender = false;

// GET /api/counts  → nombre de commentaires et date du dernier, par document
export const GET: APIRoute = async () => {
  const { results } = await env.DB.prepare(
    "SELECT doc, COUNT(*) AS n, MAX(created_at) AS last FROM comments GROUP BY doc"
  ).all<{ doc: string; n: number; last: string }>();
  const counts: Record<string, { n: number; last: string }> = {};
  for (const r of results ?? []) counts[r.doc] = { n: r.n, last: r.last };
  return json({ counts });
};

export const OPTIONS: APIRoute = () => preflight();

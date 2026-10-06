import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, unauthorized, SLUG } from "../../../lib/http";
import { session } from "../../../lib/auth";
import { getDoc, publicDoc } from "../../../lib/docs";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const s = await session(request);
  if (!s.client) return unauthorized();
  const slug = String(params.slug || "");
  const d = SLUG.test(slug) ? await getDoc(slug) : null;
  if (!d || (d.hidden && !s.admin)) return json({ error: "Document introuvable." }, 404);
  const c = await env.DB.prepare("SELECT COUNT(*) AS n, MAX(created_at) AS last FROM comments WHERE doc = ?1")
    .bind(slug).first<{ n: number; last: string | null }>();
  return json({ doc: publicDoc(d, c?.n ?? 0, c?.last ?? null) });
};

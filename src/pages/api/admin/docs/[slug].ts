import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, forbidden, clean, SLUG } from "../../../../lib/http";
import { session } from "../../../../lib/auth";
import { getDoc, publicDoc } from "../../../../lib/docs";

export const prerender = false;

// PATCH /api/admin/docs/<slug> { title?, kind?, version?, summary?, hidden? }
export const PATCH: APIRoute = async ({ request, params }) => {
  if (!(await session(request)).admin) return forbidden();
  const slug = String(params.slug || "");
  const d = SLUG.test(slug) ? await getDoc(slug) : null;
  if (!d) return json({ error: "Document introuvable." }, 404);
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch {}
  const v = (k: string, max: number, cur: string | null) => (k in b ? clean(b[k], max) || null : cur);
  const hidden = "hidden" in b ? (b.hidden ? 1 : 0) : d.hidden;
  await env.DB.prepare("UPDATE docs SET title = ?2, kind = ?3, version = ?4, summary = ?5, hidden = ?6 WHERE slug = ?1")
    .bind(slug, v("title", 160, d.title) || d.title, v("kind", 60, d.kind), v("version", 30, d.version), v("summary", 600, d.summary), hidden).run();
  const n = await getDoc(slug);
  return json({ doc: n && publicDoc(n) });
};

// DELETE /api/admin/docs/<slug> → retire le document (les commentaires restent en base)
export const DELETE: APIRoute = async ({ request, params }) => {
  if (!(await session(request)).admin) return forbidden();
  const slug = String(params.slug || "");
  const d = SLUG.test(slug) ? await getDoc(slug) : null;
  if (!d) return json({ error: "Document introuvable." }, 404);
  if (!d.file_key.startsWith("asset:")) await env.FILES.delete(d.file_key);
  await env.DB.prepare("DELETE FROM docs WHERE slug = ?1").bind(slug).run();
  return json({ ok: true });
};

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, unauthorized, forbidden, SLUG, clean } from "../../lib/http";
import { session } from "../../lib/auth";

export const prerender = false;

type Row = { id: string; doc: string; doc_title: string | null; name: string; message: string; created_at: string };

// GET /api/comments?doc=<slug>  → fil du document, du plus récent au plus ancien
export const GET: APIRoute = async ({ request, url }) => {
  if (!(await session(request)).client) return unauthorized();
  const doc = url.searchParams.get("doc") ?? "";
  if (!SLUG.test(doc)) return json({ error: "Document inconnu." }, 400);
  const { results } = await env.DB.prepare(
    "SELECT id, doc, doc_title, name, message, created_at FROM comments WHERE doc = ?1 ORDER BY created_at DESC LIMIT 500"
  ).bind(doc).all<Row>();
  return json({ doc, comments: results ?? [] });
};

// POST /api/comments  { doc, docTitle, name, message }  → enregistre un commentaire signé
export const POST: APIRoute = async ({ request }) => {
  if (!(await session(request)).client) return unauthorized();
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Requête illisible." }, 400); }
  if (clean(body.website, 200)) return json({ ok: true }, 201); // pot de miel anti-robots

  const doc = clean(body.doc, 80);
  const name = clean(body.name, 80);
  const message = clean(body.message, 4000);
  if (!SLUG.test(doc)) return json({ error: "Document inconnu." }, 400);
  if (!name) return json({ error: "Signez votre commentaire : indiquez votre nom." }, 422);
  if (!message) return json({ error: "Écrivez votre commentaire avant de l’enregistrer." }, 422);

  const comment: Row = {
    id: crypto.randomUUID(), doc, doc_title: clean(body.docTitle, 160) || null,
    name, message, created_at: new Date().toISOString(),
  };
  await env.DB.prepare(
    "INSERT INTO comments (id, doc, doc_title, name, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(comment.id, comment.doc, comment.doc_title, comment.name, comment.message, comment.created_at).run();
  return json({ comment }, 201);
};

// DELETE /api/comments?id=<id>  → suppression (administration seulement)
export const DELETE: APIRoute = async ({ request, url }) => {
  if (!(await session(request)).admin) return forbidden();
  const id = clean(url.searchParams.get("id"), 64);
  await env.DB.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return json({ ok: true });
};

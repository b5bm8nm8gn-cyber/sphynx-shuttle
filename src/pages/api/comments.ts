import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, unauthorized, forbidden, SLUG, clean } from "../../lib/http";
import { session } from "../../lib/auth";

export const prerender = false;

type Row = {
  id: string; doc: string; doc_title: string | null; name: string; message: string; created_at: string;
  status?: string; resolved_at?: string | null; resolved_version?: string | null; hidden?: number;
};
const COLS = "id, doc, doc_title, name, message, created_at, status, resolved_at, resolved_version, hidden";

// GET /api/comments?doc=<slug>  → fil du document, du plus récent au plus ancien
// Les commentaires masqués ne sont renvoyés qu'à l'administration.
export const GET: APIRoute = async ({ request, url }) => {
  const s = await session(request);
  if (!s.client) return unauthorized();
  const doc = url.searchParams.get("doc") ?? "";
  if (!SLUG.test(doc)) return json({ error: "Document inconnu." }, 400);
  const { results } = await env.DB.prepare(
    `SELECT ${COLS} FROM comments WHERE doc = ?1 ${s.admin ? "" : "AND hidden = 0"} ORDER BY created_at DESC LIMIT 500`
  ).bind(doc).all<Row>();
  return json({ doc, admin: s.admin, comments: results ?? [] });
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
    status: "open", resolved_at: null, resolved_version: null, hidden: 0,
  };
  await env.DB.prepare(
    "INSERT INTO comments (id, doc, doc_title, name, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(comment.id, comment.doc, comment.doc_title, comment.name, comment.message, comment.created_at).run();
  return json({ comment }, 201);
};

// PATCH /api/comments?id=<id>  { status?: "resolved" | "open", hidden?: boolean }  (administration seulement)
// « resolved » = validé : la version en ligne du document au moment de la validation est retenue.
export const PATCH: APIRoute = async ({ request, url }) => {
  if (!(await session(request)).admin) return forbidden();
  const id = clean(url.searchParams.get("id"), 64);
  const cur = await env.DB.prepare(`SELECT ${COLS} FROM comments WHERE id = ?1`).bind(id).first<Row>();
  if (!cur) return json({ error: "Commentaire introuvable." }, 404);
  let b: Record<string, unknown> = {};
  try { b = await request.json(); } catch {}
  let { status, resolved_at, resolved_version } = cur;
  if (b.status === "resolved" && status !== "resolved") {
    const d = await env.DB.prepare("SELECT version FROM docs WHERE slug = ?1").bind(cur.doc).first<{ version: string | null }>();
    status = "resolved"; resolved_at = new Date().toISOString(); resolved_version = d?.version ?? null;
  } else if (b.status === "open") {
    status = "open"; resolved_at = null; resolved_version = null;
  }
  const hidden = "hidden" in b ? (b.hidden ? 1 : 0) : cur.hidden ?? 0;
  await env.DB.prepare("UPDATE comments SET status = ?2, resolved_at = ?3, resolved_version = ?4, hidden = ?5 WHERE id = ?1")
    .bind(id, status, resolved_at, resolved_version, hidden).run();
  return json({ comment: { ...cur, status, resolved_at, resolved_version, hidden } });
};

// DELETE /api/comments?id=<id>  → suppression (administration seulement)
export const DELETE: APIRoute = async ({ request, url }) => {
  if (!(await session(request)).admin) return forbidden();
  const id = clean(url.searchParams.get("id"), 64);
  await env.DB.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return json({ ok: true });
};

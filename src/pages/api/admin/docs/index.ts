import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, forbidden, clean, slugify, SLUG } from "../../../../lib/http";
import { session } from "../../../../lib/auth";
import { getDoc, publicDoc } from "../../../../lib/docs";

export const prerender = false;
const MAX_BYTES = 25 * 1024 * 1024;

// POST /api/admin/docs?title=&kind=&version=&summary=&slug=&name=  (corps = le fichier HTML brut)
// Publie un nouveau document, ou une nouvelle version d'un document existant (même slug : le fil de commentaires est conservé).
// Corps brut plutôt que multipart : évite le contrôle d'origine des formulaires derrière le proxy Webflow.
export const POST: APIRoute = async ({ request, url }) => {
  if (!(await session(request)).admin) return forbidden();
  const q = (k: string) => url.searchParams.get(k);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: "Ajoutez un fichier HTML." }, 422);
  if (body.byteLength > MAX_BYTES) return json({ error: "Fichier trop lourd (25 Mo au plus)." }, 422);
  const head = new TextDecoder().decode(body.slice(0, 4096)).toLowerCase();
  if (!/<html|<!doctype html|<head|<body/.test(head)) return json({ error: "Le fichier doit être une page HTML (.html)." }, 422);

  const title = clean(q("title"), 160);
  if (!title) return json({ error: "Donnez un titre au document." }, 422);
  const slug = clean(q("slug"), 80) || slugify(title);
  if (!SLUG.test(slug)) return json({ error: "Identifiant de document invalide." }, 422);
  const kind = clean(q("kind"), 60) || null;
  const version = clean(q("version"), 30) || null;
  const summaryIn = q("summary");
  const now = new Date().toISOString();
  const key = `docs/${slug}/${now.replace(/[:.]/g, "-")}.html`;

  await env.FILES.put(key, body, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
    customMetadata: { name: clean(q("name"), 200), title },
  });

  const prev = await getDoc(slug);
  if (prev) {
    const summary = summaryIn === null ? prev.summary : clean(summaryIn, 600) || null;
    await env.DB.prepare(
      "UPDATE docs SET title = ?2, kind = ?3, version = ?4, summary = ?5, file_key = ?6, size = ?7, hidden = 0, updated_at = ?8 WHERE slug = ?1"
    ).bind(slug, title, kind, version, summary, key, body.byteLength, now).run();
  } else {
    const pos = await env.DB.prepare("SELECT COALESCE(MIN(position), 1) - 1 AS p FROM docs").first<{ p: number }>();
    await env.DB.prepare(
      "INSERT INTO docs (slug, title, kind, version, summary, file_key, size, position, hidden, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?9)"
    ).bind(slug, title, kind, version, clean(summaryIn, 600) || null, key, body.byteLength, pos?.p ?? 0, now).run();
  }
  const d = await getDoc(slug);
  return json({ doc: d && publicDoc(d), updated: !!prev }, 201);
};

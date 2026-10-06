import type { APIRoute } from "astro";
import { SLUG } from "../../lib/http";
import { session } from "../../lib/auth";
import { getDoc, readFile } from "../../lib/docs";

export const prerender = false;

const page = (title: string, text: string, status: number) =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px/1.5 -apple-system,BlinkMacSystemFont,Inter,Helvetica,Arial,sans-serif;background:#fff;color:#1D1D1F}@media(prefers-color-scheme:dark){body{background:#000;color:#F5F5F7}}p{max-width:40ch;text-align:center;opacity:.7}</style></head><body><p>${text}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );

// GET /d/<slug> → le fichier HTML du document, seulement avec une session valide
export const GET: APIRoute = async ({ request, params }) => {
  const s = await session(request);
  if (!s.client) return page("Accès réservé", "Accès réservé. Ouvrez l’espace Sphynx Shuttle et entrez le mot de passe.", 401);
  const slug = String(params.slug || "");
  const d = SLUG.test(slug) ? await getDoc(slug) : null;
  if (!d || (d.hidden && !s.admin)) return page("Document introuvable", "Ce document n’existe pas ou n’est plus partagé.", 404);
  const file = await readFile(d, request);
  if (!file) return page("Fichier manquant", "Le fichier de ce document est introuvable.", 404);
  return new Response(file.body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": `inline; filename="${slug}.html"`,
    },
  });
};

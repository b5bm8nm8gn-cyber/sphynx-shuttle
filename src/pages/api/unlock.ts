import type { APIRoute } from "astro";
import { json, clean } from "../../lib/http";
import { isViewerKey, viewerCookies } from "../../lib/auth";

export const prerender = false;

// POST /api/unlock { key } → cookie de lecture (clé portée par les pages Webflow protégées par mot de passe)
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  if (!(await isViewerKey(clean(body.key, 200)))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Clé invalide." }, 401);
  }
  const headers = new Headers();
  for (const c of await viewerCookies()) headers.append("Set-Cookie", c);
  return json({ ok: true }, 200, headers);
};

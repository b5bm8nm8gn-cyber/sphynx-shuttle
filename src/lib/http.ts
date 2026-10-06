// Réponses JSON communes, avec CORS ouvert : l'API est appelée depuis les pages du site Webflow.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

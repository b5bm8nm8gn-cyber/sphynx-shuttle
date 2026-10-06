// Réponses JSON communes. L'API est appelée depuis les pages du site Webflow, même origine (cookies de session).
export function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  if (extra) new Headers(extra).forEach((v, k) => headers.append(k, v));
  return new Response(JSON.stringify(data), { status, headers });
}

export const locked = () => json({ error: "Accès réservé. Ouvrez l’espace Sopht." }, 401);
export const forbidden = () => json({ error: "Réservé à l’administration Sphynx." }, 403);

export const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

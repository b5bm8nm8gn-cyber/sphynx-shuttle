import type { APIRoute } from "astro";
import { json, clean } from "../../lib/http";
import { roleFor, loginCookies } from "../../lib/auth";

export const prerender = false;

// POST /api/login { password } → pose le cookie de session (client, ou client + admin)
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  const role = await roleFor(clean(body.password, 200));
  if (!role) {
    await new Promise((r) => setTimeout(r, 600)); // freine les essais en série
    return json({ error: "Mot de passe incorrect." }, 401);
  }
  const headers = new Headers();
  for (const c of await loginCookies(role)) headers.append("Set-Cookie", c);
  return json({ ok: true, admin: role === "admin" }, 200, headers);
};

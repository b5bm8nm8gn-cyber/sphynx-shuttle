import type { APIRoute } from "astro";
import { json, clean } from "../../lib/http";
import { isAdminCode, loginCookies } from "../../lib/auth";

export const prerender = false;

// POST /api/login { password } → pose le cookie de session administrateur
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}
  if (!(await isAdminCode(clean(body.password, 200)))) {
    await new Promise((r) => setTimeout(r, 600)); // freine les essais en série
    return json({ error: "Code incorrect." }, 401);
  }
  const headers = new Headers();
  for (const c of await loginCookies()) headers.append("Set-Cookie", c);
  return json({ ok: true, admin: true }, 200, headers);
};

import type { APIRoute } from "astro";
import { json } from "../../lib/http";
import { logoutCookies } from "../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async () => {
  const headers = new Headers();
  for (const c of logoutCookies()) headers.append("Set-Cookie", c);
  return json({ ok: true }, 200, headers);
};

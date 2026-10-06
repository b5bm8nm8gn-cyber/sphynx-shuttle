// Accès Sphynx Shuttle : mot de passe client (espace Sopht) et code administrateur (Sphynx).
// Seules les empreintes SHA-256 figurent ici. Pour changer un mot de passe : remplacer l'empreinte
// (printf '%s' 'NouveauMotDePasse' | shasum -a 256), pousser sur main ; les sessions en cours tombent.
const CLIENT_HASH = "e1e38120c0dc6ce7001a1713dfc546d93221ded3124e9c9d1eb88bdaace4a815";
const ADMIN_HASH = "d99b55a5c48b076b6b373515565a0d9bd360ca9358630777ebd5b003069017b8";

const CLIENT_COOKIE = "sh_c";
const ADMIN_COOKIE = "sh_a";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 jours

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const token = (hash: string) => sha256(hash + ":sphynx-shuttle-session-v1");

export async function roleFor(password: string): Promise<"admin" | "client" | null> {
  const h = await sha256(password.trim());
  if (h === ADMIN_HASH) return "admin";
  if (h === CLIENT_HASH) return "client";
  return null;
}

function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

export async function session(request: Request): Promise<{ client: boolean; admin: boolean }> {
  const admin = readCookie(request, ADMIN_COOKIE) === (await token(ADMIN_HASH));
  const client = admin || readCookie(request, CLIENT_COOKIE) === (await token(CLIENT_HASH));
  return { client, admin };
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export async function loginCookies(role: "admin" | "client"): Promise<string[]> {
  const out = [cookie(CLIENT_COOKIE, await token(CLIENT_HASH), MAX_AGE)];
  if (role === "admin") out.push(cookie(ADMIN_COOKIE, await token(ADMIN_HASH), MAX_AGE));
  return out;
}

export const logoutCookies = () => [cookie(CLIENT_COOKIE, "", 0), cookie(ADMIN_COOKIE, "", 0)];

// Accès Sphynx Shuttle. L'espace Sopht est protégé par le mot de passe du site Webflow
// (Paramètres du site > Protection par mot de passe) ; l'app ne garde que le code administrateur
// (publication et modération). Seule son empreinte SHA-256 figure ici. Pour le changer : remplacer
// l'empreinte (printf '%s' 'NouveauCode' | shasum -a 256), pousser sur main ; la session admin tombe.
const ADMIN_HASH = "d99b55a5c48b076b6b373515565a0d9bd360ca9358630777ebd5b003069017b8";

const OLD_CLIENT_COOKIE = "sh_c";
const ADMIN_COOKIE = "sh_a";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 jours

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const token = (hash: string) => sha256(hash + ":sphynx-shuttle-session-v1");

export async function isAdminCode(code: string): Promise<boolean> {
  return (await sha256(code.trim())) === ADMIN_HASH;
}

function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

export async function session(request: Request): Promise<{ admin: boolean }> {
  return { admin: readCookie(request, ADMIN_COOKIE) === (await token(ADMIN_HASH)) };
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export async function loginCookies(): Promise<string[]> {
  return [cookie(ADMIN_COOKIE, await token(ADMIN_HASH), MAX_AGE)];
}

// Efface aussi l'ancien cookie client (sh_c), abandonné le 6 octobre 2026.
export const logoutCookies = () => [cookie(OLD_CLIENT_COOKIE, "", 0), cookie(ADMIN_COOKIE, "", 0)];

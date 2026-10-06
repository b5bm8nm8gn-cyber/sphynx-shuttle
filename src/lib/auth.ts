// Accès Sphynx Shuttle.
// 1. Espace Sopht : mot de passe du site Webflow (Paramètres du site > Protection par mot de passe).
//    Cette protection ne couvre pas l'app (/app). Les pages Webflow protégées (Home, Document) portent
//    donc une clé de lecture dans leur code d'en-tête (<meta name="shuttle-key">) : le script l'échange
//    contre un cookie (POST /api/unlock), sans écran. Sans ce cookie, documents et commentaires sont refusés.
//    Pour changer la clé : nouvelle valeur dans le code d'en-tête des pages Home et Document, son
//    empreinte ici (VIEWER_KEY_HASH), pousser sur main ; les accès en cours tombent.
// 2. Publication et modération : code administrateur (empreinte ADMIN_HASH, même procédure).
const VIEWER_KEY_HASH = "fc4325779a0be9890f32661feca0b53470b768ed78373152458e6dbd6657510b";
const ADMIN_HASH = "d99b55a5c48b076b6b373515565a0d9bd360ca9358630777ebd5b003069017b8";

const OLD_CLIENT_COOKIE = "sh_c";
const VIEWER_COOKIE = "sh_v";
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

export async function isViewerKey(key: string): Promise<boolean> {
  return (await sha256(key.trim())) === VIEWER_KEY_HASH;
}

// viewer : le visiteur a ouvert une page Webflow protégée (ou est administrateur).
export async function session(request: Request): Promise<{ admin: boolean; viewer: boolean }> {
  const admin = readCookie(request, ADMIN_COOKIE) === (await token(ADMIN_HASH));
  const viewer = admin || readCookie(request, VIEWER_COOKIE) === (await token(VIEWER_KEY_HASH));
  return { admin, viewer };
}

export async function viewerCookies(): Promise<string[]> {
  return [cookie(VIEWER_COOKIE, await token(VIEWER_KEY_HASH), 60 * 60 * 24 * 30)];
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export async function loginCookies(): Promise<string[]> {
  return [cookie(ADMIN_COOKIE, await token(ADMIN_HASH), MAX_AGE)];
}

// Efface aussi l'ancien cookie client (sh_c), abandonné le 6 octobre 2026.
export const logoutCookies = () => [cookie(OLD_CLIENT_COOKIE, "", 0), cookie(ADMIN_COOKIE, "", 0)];

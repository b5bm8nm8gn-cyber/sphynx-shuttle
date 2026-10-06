import { env } from "cloudflare:workers";

export type Doc = {
  slug: string;
  title: string;
  kind: string | null;
  version: string | null;
  summary: string | null;
  file_key: string;
  size: number | null;
  position: number;
  hidden: number;
  created_at: string;
  updated_at: string;
};

export type DocOut = Omit<Doc, "file_key"> & { comments: number; resolved: number; last_comment: string | null };

export async function listDocs(includeHidden = false): Promise<DocOut[]> {
  const { results } = await env.DB.prepare(
    `SELECT d.slug, d.title, d.kind, d.version, d.summary, d.size, d.position, d.hidden, d.created_at, d.updated_at,
            COUNT(c.id) AS comments, COALESCE(SUM(c.status = 'resolved'), 0) AS resolved, MAX(c.created_at) AS last_comment
       FROM docs d LEFT JOIN comments c ON c.doc = d.slug AND c.hidden = 0
      ${includeHidden ? "" : "WHERE d.hidden = 0"}
      GROUP BY d.slug
      ORDER BY d.position ASC, d.updated_at DESC`
  ).all<DocOut>();
  return results ?? [];
}

export async function getDoc(slug: string): Promise<Doc | null> {
  return (await env.DB.prepare("SELECT * FROM docs WHERE slug = ?1").bind(slug).first<Doc>()) ?? null;
}

export function publicDoc(d: Doc, comments = 0, last: string | null = null, resolved = 0): DocOut {
  const { file_key: _k, ...rest } = d;
  return { ...rest, comments, resolved, last_comment: last };
}

// Fichier d'un document : soit un objet du stockage (R2), soit un fichier livré avec l'app ("asset:chemin").
export async function readFile(d: Doc, request: Request): Promise<Response | null> {
  if (d.file_key.startsWith("asset:")) {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
    const path = d.file_key.slice(6).replace(/\.html$/, "");
    const r = await env.ASSETS.fetch(new URL(base + path, request.url).toString());
    return r.ok ? r : null;
  }
  const obj = await env.FILES.get(d.file_key);
  return obj ? new Response(obj.body) : null;
}

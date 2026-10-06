import type { APIRoute } from "astro";
import { json, locked } from "../../../lib/http";
import { session } from "../../../lib/auth";
import { listDocs } from "../../../lib/docs";

export const prerender = false;

// GET /api/docs → documents visibles, avec nombre de commentaires et date du dernier (?all=1 pour l'admin)
export const GET: APIRoute = async ({ request, url }) => {
  const s = await session(request);
  if (!s.viewer) return locked();
  return json({ docs: await listDocs(s.admin && url.searchParams.get("all") === "1") });
};

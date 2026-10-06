# Sphynx Shuttle · module serveur (Webflow Cloud)

App Astro montée sur le site Webflow « sphynx shuttle » au chemin `/app`.

- `public/docs/*.html` : les maquettes HTML partagées, servies à `/app/docs/<nom>` (sans `.html`).
- `src/pages/api/comments.ts` : `GET /app/api/comments?doc=<slug>` (fil daté, du plus récent au plus ancien) et `POST /app/api/comments` (`{ doc, docTitle, name, message }`).
- `src/pages/api/counts.ts` : `GET /app/api/counts` (nombre de commentaires et date du dernier, par document).
- `migrations/` : schéma SQLite (D1) appliqué au déploiement.
- `webflow/` : copie du code personnalisé posé dans Webflow (en-tête et pied de page du site).

## Ajouter une maquette
1. Déposer le fichier dans `public/docs/` (nom en minuscules, sans espace, ex. `sputnik-dashboard-v0-54.html`) et pousser sur `main` : Webflow Cloud redéploie.
2. Dans le CMS Webflow, collection **Documents** : créer (ou mettre à jour) l'élément, champ **Fichier** = `/app/docs/sputnik-dashboard-v0-54`. Le slug de l'élément identifie le fil de commentaires : le garder d'une version à l'autre conserve l'historique.
3. Publier le site.

## Local
```
npm install
npx wrangler d1 migrations apply DB --local
# astro.config.mjs : base "CLOUD_MOUNT_PATH" est remplacé par Webflow au déploiement ; en local, utiliser "/app"
npx astro build && npx wrangler dev -c dist/server/wrangler.json
```

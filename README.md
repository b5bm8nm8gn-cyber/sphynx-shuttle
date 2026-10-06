# Sphynx Shuttle · module serveur (Webflow Cloud)

App Astro montée sur le site Webflow « sphynx shuttle » au chemin `/app`. Elle porte l'accès par mot de passe, les documents HTML et les commentaires.

## Publier un document (le plus simple)
1. Ouvrir `/app/admin` sur le site (ex. https://sphynx-shuttle.webflow.io/app/admin), entrer le code administrateur.
2. Déposer le fichier .html : titre et version sont lus dans le fichier. Si un document du même nom existe, la nouvelle version le remplace et garde son fil de commentaires.
3. Cliquer sur Publier : c'est en ligne immédiatement. Masquer / Supprimer depuis la liste.

## Accès
- Mot de passe de l'espace client et code administrateur : empreintes SHA-256 dans `src/lib/auth.ts` (pour changer : `printf '%s' 'nouveau' | shasum -a 256`, remplacer, pousser sur main).
- Session : cookie HttpOnly de 60 jours. Sans session, `/app/api/*` répond 401 et `/app/d/*` affiche « Accès réservé ».

## API
- `POST /app/api/login` { password }, `POST /app/api/logout`, `GET /app/api/session`
- `GET /app/api/docs`, `GET /app/api/docs/<slug>`, `GET /app/d/<slug>` (le fichier HTML)
- `GET|POST /app/api/comments?doc=<slug>`
- Admin : `POST /app/api/admin/docs?title=&kind=&version=&summary=&slug=` (corps = fichier HTML), `PATCH|DELETE /app/api/admin/docs/<slug>`

## Stockage
- SQLite (D1, binding DB) : tables `docs` et `comments`, schéma dans `migrations/`.
- Fichiers publiés depuis l'admin : stockage objet (R2, binding FILES). Les deux premiers documents sont livrés avec l'app dans `public/_files/`.

## Pages Webflow
- `webflow/` : code personnalisé posé dans Webflow (en-tête). Le script des pages est servi par l'app : `/app/shuttle.js`.

## Local
```
npm install
npx wrangler d1 migrations apply DB --local
# astro.config.mjs : base "CLOUD_MOUNT_PATH" est remplacé par Webflow au déploiement ; en local, mettre "/app"
npx astro build && npx wrangler dev -c dist/server/wrangler.json
```

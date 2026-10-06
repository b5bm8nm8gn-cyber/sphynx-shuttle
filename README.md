# Sphynx Shuttle · module serveur (Webflow Cloud)

App Astro montée sur le site Webflow « sopht » au chemin `/app`. Elle porte les documents HTML, les commentaires et la page de publication.

## Publier un document (le plus simple)
1. Ouvrir `/app/admin` sur le site (ex. https://sopht2027.webflow.io/app/admin), entrer le code administrateur.
2. Déposer le fichier .html : titre et version sont lus dans le fichier. Si un document du même nom existe, la nouvelle version le remplace et garde son fil de commentaires.
3. Cliquer sur Publier : c'est en ligne immédiatement. Masquer / Supprimer depuis la liste.

## Accès
- Espace Sopht : protection par mot de passe du site Webflow (Paramètres du site > Protection par mot de passe). L'app ne vérifie aucun mot de passe client.
- Publication et modération : code administrateur, empreinte SHA-256 dans `src/lib/auth.ts` (pour changer : `printf '%s' 'nouveau' | shasum -a 256`, remplacer, pousser sur main). Session admin : cookie HttpOnly de 60 jours ; sans elle, les routes admin et la modération répondent 403.

## API
- `POST /app/api/login` { password = code admin }, `POST /app/api/logout`, `GET /app/api/session` → { admin }
- `GET /app/api/docs`, `GET /app/api/docs/<slug>`, `GET /app/d/<slug>` (le fichier HTML)
- `GET|POST /app/api/comments?doc=<slug>`, admin : `PATCH|DELETE /app/api/comments?id=`
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

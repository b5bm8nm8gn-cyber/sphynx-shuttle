-- Sphynx Shuttle : modération des commentaires (validé après correction, masqué).
ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE comments ADD COLUMN resolved_at TEXT;
ALTER TABLE comments ADD COLUMN resolved_version TEXT;
ALTER TABLE comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

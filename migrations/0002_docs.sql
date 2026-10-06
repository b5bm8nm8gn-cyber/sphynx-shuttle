-- Sphynx Shuttle : documents partagés (le fichier HTML est dans le stockage objet, ou livré avec l'app pour les premiers).
CREATE TABLE IF NOT EXISTS docs (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  kind       TEXT,
  version    TEXT,
  summary    TEXT,
  file_key   TEXT NOT NULL,
  size       INTEGER,
  position   INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO docs (slug, title, kind, version, summary, file_key, size, position, hidden, created_at, updated_at) VALUES
('sputnik-dashboard', 'Sputnik · Dashboard', 'Preuve de concept', 'v0.53',
 'Maquette navigable de la plateforme Sputnik avec le plan d''action : Trajectory board des leviers, carte Opportunities, détail des leviers et des actions.',
 'asset:_files/8d7e96d5ac5c3c1567fdd4361989a35a/sputnik-dashboard-v0-53.html', 389948, 1, 0, '2026-10-04T12:00:00.000Z', '2026-10-04T12:00:00.000Z'),
('sputnik-color-chart', 'Sputnik · Color Chart', 'Design system', 'v0.54',
 'Couleurs des graphiques : tags déclaré et mesuré, Global Emissions, barres par défaut, et trois propositions de palette pour les cinq séries d''émissions, chacune montrée sur la plateforme.',
 'asset:_files/8d7e96d5ac5c3c1567fdd4361989a35a/sputnik-color-chart-v0-54.html', 1529469, 2, 0, '2026-10-04T12:00:00.000Z', '2026-10-04T12:00:00.000Z');

-- Nettoyage des commentaires de recette du 6 octobre 2026.
DELETE FROM comments WHERE doc = 'test-recette';

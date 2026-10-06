-- Sphynx Shuttle : commentaires signés laissés sur les documents partagés.
CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  doc        TEXT NOT NULL,
  doc_title  TEXT,
  name       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_doc_date ON comments (doc, created_at DESC);

-- D1 Schema: Engineering Papers
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  year INTEGER DEFAULT 0,
  volume TEXT DEFAULT '',
  issue TEXT DEFAULT '',
  total_citations INTEGER DEFAULT 0,
  citations_2026 INTEGER DEFAULT 0,
  authors TEXT DEFAULT '',
  doi TEXT DEFAULT '',
  bibtex_key TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_papers_topic ON papers(topic);
CREATE INDEX IF NOT EXISTS idx_papers_citations ON papers(total_citations DESC);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year DESC);

-- Admin user: admin / admin123
-- SHA-256 hash of 'admin123' = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT OR IGNORE INTO users (username, password_hash)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

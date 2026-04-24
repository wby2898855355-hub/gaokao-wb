import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'gaokao.db');

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT,
      nickname TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      forum_key TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_edited INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Add is_anonymous column if upgrading from old schema
  try { db.run('ALTER TABLE posts ADD COLUMN is_anonymous INTEGER NOT NULL DEFAULT 0'); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_edited INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_posts_forum ON posts(forum_key, created_at DESC)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC)
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Convert object params to array for sql.js positional ? placeholders
// Input: { '?': val0, '?1': val1, '?2': val2 } → [val0, val1, val2]
function paramsToArray(params) {
  if (Array.isArray(params)) return params;
  const keys = Object.keys(params);
  if (keys.length === 0) return [];
  const arr = [];
  for (const key of keys) {
    const idx = key === '?' ? 0 : parseInt(key.slice(1));
    arr[idx] = params[key];
  }
  return arr;
}

// Helper: run a query and return rows as array of objects
export function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(paramsToArray(params));
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a single row query
export function queryOne(sql, params = {}) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: execute a statement (INSERT/UPDATE/DELETE)
export function execute(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(paramsToArray(params));
  stmt.step();
  stmt.free();

  // Get last insert rowid before saveDb (in case export interferes)
  const idStmt = db.prepare("SELECT last_insert_rowid()");
  idStmt.step();
  const row = idStmt.getAsObject();
  const lastId = row ? row['last_insert_rowid()'] : null;
  idStmt.free();

  saveDb();

  return {
    lastInsertRowid: typeof lastId === 'bigint' ? Number(lastId) : (lastId || 0),
    changes: db.getRowsModified()
  };
}

export { saveDb };

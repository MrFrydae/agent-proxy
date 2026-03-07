import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "codex-flare.db");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    // Auto-create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        label TEXT NOT NULL,
        api_key TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        quota_five_hr_percent REAL,
        quota_five_hr_resets_at TEXT,
        quota_weekly_percent REAL,
        quota_weekly_resets_at TEXT,
        quota_last_checked_at TEXT,
        rate_limited_until TEXT,
        rate_limit_status TEXT
      );

      CREATE TABLE IF NOT EXISTS request_logs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        account_id TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        model TEXT,
        status_code INTEGER NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        latency_ms INTEGER NOT NULL,
        is_failover INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_request_logs_provider ON request_logs(provider);
      CREATE INDEX IF NOT EXISTS idx_request_logs_account_id ON request_logs(account_id);
    `);

    // Migrate: add OAuth columns if missing
    const columns = sqlite.pragma("table_info(accounts)") as Array<{ name: string }>;
    const colNames = new Set(columns.map((c) => c.name));
    if (!colNames.has("auth_method")) {
      sqlite.exec(`ALTER TABLE accounts ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'api_key'`);
    }
    if (!colNames.has("refresh_token")) {
      sqlite.exec(`ALTER TABLE accounts ADD COLUMN refresh_token TEXT`);
    }
    if (!colNames.has("access_token_expires_at")) {
      sqlite.exec(`ALTER TABLE accounts ADD COLUMN access_token_expires_at TEXT`);
    }
    if (!colNames.has("oauth_scopes")) {
      sqlite.exec(`ALTER TABLE accounts ADD COLUMN oauth_scopes TEXT`);
    }

    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

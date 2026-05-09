import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  var __sql: Sql | undefined;
  var __schemaPromise: Promise<void> | undefined;
}

function makeSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. For Vercel: connect a Postgres database in Storage (it auto-injects DATABASE_URL). For local dev: put a connection string in .env.local.",
    );
  }
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

function getSqlInstance(): Sql {
  return (globalThis.__sql ??= makeSql());
}

// Lazy proxy: the postgres client is created on first use, not at module load.
// This lets the Next.js production build succeed without DATABASE_URL — the
// connection is only established when a request actually queries the DB.
export const sql = new Proxy({} as Sql, {
  get(_t, prop) {
    const target = getSqlInstance() as unknown as Record<string | symbol, unknown>;
    const value = target[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  apply(_t, _this, args) {
    return (getSqlInstance() as unknown as (...a: unknown[]) => unknown)(...args);
  },
}) as Sql;

async function runSchema() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS selections (
      id              SERIAL PRIMARY KEY,
      roll_no         TEXT NOT NULL,
      rotation        INT  NOT NULL CHECK (rotation BETWEEN 1 AND 4),
      department      TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (roll_no, rotation),
      UNIQUE (roll_no, department)
    );
    CREATE INDEX IF NOT EXISTS idx_selections_dept_rotation ON selections (department, rotation);
    CREATE INDEX IF NOT EXISTS idx_selections_roll ON selections (roll_no);
    CREATE TABLE IF NOT EXISTS submissions (
      roll_no         TEXT PRIMARY KEY,
      submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS dept_overrides (
      name            TEXT PRIMARY KEY,
      capacity        INT  NOT NULL CHECK (capacity >= 0)
    );
    CREATE TABLE IF NOT EXISTS student_overrides (
      roll_no         TEXT PRIMARY KEY,
      name            TEXT,
      total           INT,
      overall         TEXT CHECK (overall IN ('Pass','Fail')),
      rank            INT,
      hidden          BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id              SERIAL PRIMARY KEY,
      actor           TEXT NOT NULL,
      action          TEXT NOT NULL,
      detail          JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function ensureSchema(): Promise<void> {
  return (globalThis.__schemaPromise ??= runSchema());
}

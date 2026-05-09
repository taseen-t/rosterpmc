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
      "DATABASE_URL is not set. Connect a Postgres database in Vercel Storage (it auto-injects DATABASE_URL), or put a connection string in .env.local for local dev.",
    );
  }
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export const sql: Sql = (globalThis.__sql ??= makeSql());

async function runSchema() {
  // Postgres has a known race on CREATE TABLE IF NOT EXISTS when concurrent
  // connections target the same metadata row. Serialize with a session-level
  // advisory lock so only one connection runs DDL at a time.
  const LOCK_KEY = 914829417;
  await sql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  try {
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
  } finally {
    await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

export function ensureSchema(): Promise<void> {
  return (globalThis.__schemaPromise ??= runSchema());
}

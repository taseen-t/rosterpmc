import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  var __sql: Sql | undefined;
  var __schemaPromise: Promise<void> | undefined;
  var __schemaDone: boolean | undefined;
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
    // Hard cap on any single statement so a stuck migration can't wedge
    // the whole process. 8 seconds is plenty for IF-NOT-EXISTS DDL on
    // tables this size. `connection` is the postgres-js escape hatch for
    // raw libpq/GUC params sent at startup.
    connection: { statement_timeout: 8000 },
    prepare: false,
  });
}

export const sql: Sql = (globalThis.__sql ??= makeSql());

async function runSchema() {
  // Wrap everything in a transaction with a TRANSACTION-scoped advisory
  // lock. The lock auto-releases the moment the transaction commits or
  // rolls back — even if the function instance dies mid-DDL.
  const LOCK_KEY = 914829417;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    await tx.unsafe(`
      -- ── One-time cleanup: drop the tables that powered student auth,
      -- support tickets, notifications and the access log. The model is
      -- now admin-only. Safe to re-run; IF EXISTS makes it idempotent.
      DROP TABLE IF EXISTS student_credentials CASCADE;
      DROP TABLE IF EXISTS support_requests CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS access_log CASCADE;
      DROP TABLE IF EXISTS google_links CASCADE;

      -- ── Core tables that remain ─────────────────────────────────────

      -- Per-student rotation picks. Admin writes one row per rotation per
      -- student. UNIQUE on (roll_no, rotation) keeps each student to one
      -- pick per rotation; UNIQUE on (roll_no, department) enforces the
      -- "no department twice" rule.
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

      -- Per-student "finalized" flag — admin flips this when picks are
      -- locked. Unlocking just deletes the row; picks themselves remain
      -- as the draft.
      CREATE TABLE IF NOT EXISTS submissions (
        roll_no         TEXT PRIMARY KEY,
        submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Admin overrides for department capacity (number of seats per
      -- rotation). Null row = use the static default from departments.json.
      CREATE TABLE IF NOT EXISTS dept_overrides (
        name            TEXT PRIMARY KEY,
        capacity        INT  NOT NULL CHECK (capacity >= 0)
      );

      -- Admin overrides for individual students (name/total/result/rank
      -- override, plus a hidden flag to suppress a stale OCR row).
      CREATE TABLE IF NOT EXISTS student_overrides (
        roll_no         TEXT PRIMARY KEY,
        name            TEXT,
        total           INT,
        overall         TEXT CHECK (overall IN ('Pass','Fail')),
        rank            INT,
        hidden          BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- Net-new students added by admin (not in original OCR'd PDF).
      -- Re-ranked alongside OCR students by total marks.
      CREATE TABLE IF NOT EXISTS student_additions (
        roll_no         TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        total           INT,
        medicine_marks  INT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Students an admin has marked "skipped". Their slot is passed
      -- over in any merit-ordered view.
      CREATE TABLE IF NOT EXISTS skipped_students (
        roll_no         TEXT PRIMARY KEY,
        reason          TEXT,
        skipped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Append-only history of every admin action, for accountability.
      CREATE TABLE IF NOT EXISTS audit_log (
        id              SERIAL PRIMARY KEY,
        actor           TEXT NOT NULL,
        action          TEXT NOT NULL,
        detail          JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  });
  globalThis.__schemaDone = true;
}

export function ensureSchema(): Promise<void> {
  // Fast-path once we know the schema's good in this instance.
  if (globalThis.__schemaDone) return Promise.resolve();
  return (globalThis.__schemaPromise ??= runSchema().catch((err) => {
    // Reset so the next request can retry instead of being permanently
    // stuck on a one-time hiccup (e.g. cold-start statement timeout).
    globalThis.__schemaPromise = undefined;
    throw err;
  }));
}

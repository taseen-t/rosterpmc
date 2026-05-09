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

      -- Net-new student records added by admin (not in original OCR'd PDF).
      -- These get re-ranked alongside OCR students by total marks.
      CREATE TABLE IF NOT EXISTS student_additions (
        roll_no         TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        total           INT,
        medicine_marks  INT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Students an admin has marked "skipped" so they don't block lower
      -- ranks (e.g. won't be joining, abroad, dropped out). Their rank slot
      -- is essentially passed over for the rotation-locking gate.
      CREATE TABLE IF NOT EXISTS skipped_students (
        roll_no         TEXT PRIMARY KEY,
        reason          TEXT,
        skipped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- User-submitted requests for corrections / help, viewable in admin.
      CREATE TABLE IF NOT EXISTS support_requests (
        id              SERIAL PRIMARY KEY,
        roll_no         TEXT,
        contact         TEXT,
        category        TEXT,
        message         TEXT NOT NULL,
        resolved        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_support_unresolved ON support_requests (created_at DESC) WHERE NOT resolved;

      -- Audit trail of every access attempt against a roll number - login
      -- successes/failures and select-page views. Lets the admin see who
      -- tried to log in as whom, from where, and when.
      CREATE TABLE IF NOT EXISTS access_log (
        id              SERIAL PRIMARY KEY,
        roll_no         TEXT NOT NULL,
        actor           TEXT,
        action          TEXT NOT NULL,
        ip              TEXT,
        country         TEXT,
        city            TEXT,
        user_agent      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_access_log_roll ON access_log (roll_no, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_access_log_recent ON access_log (created_at DESC);

      -- Google OAuth: link a Google identity to a roll number. The same
      -- email cannot link to two rolls; the same roll can be linked to
      -- exactly one Google email at a time. Admin can unlink to allow
      -- relinking.
      CREATE TABLE IF NOT EXISTS google_links (
        google_email    TEXT PRIMARY KEY,
        google_sub      TEXT,
        google_name     TEXT,
        google_picture  TEXT,
        roll_no         TEXT,
        linked_at       TIMESTAMPTZ,
        first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_google_links_roll
        ON google_links (roll_no) WHERE roll_no IS NOT NULL;
    `);
  } finally {
    await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

export function ensureSchema(): Promise<void> {
  return (globalThis.__schemaPromise ??= runSchema());
}

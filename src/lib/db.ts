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
  // lock. That way the lock is auto-released the moment the transaction
  // commits or rolls back — even if the function instance dies. Replaces
  // an earlier session-scoped lock that could leak when postgres-js
  // returned the connection to the pool without unlocking.
  const LOCK_KEY = 914829417;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
    await tx.unsafe(`
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

      -- google_links was the previous OAuth-based auth scheme. We've moved
      -- to CNIC-based credentials below, so just leave any existing
      -- google_links rows alone (don't read them, don't create new ones).
      -- The CREATE IF NOT EXISTS keeps old deployments compatible.
      CREATE TABLE IF NOT EXISTS google_links (
        google_email    TEXT PRIMARY KEY,
        roll_no         TEXT,
        first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Lightweight notifications: students get pinged when their support
      -- request is resolved; admin recipient is the literal string '@admin'
      -- and any logged-in admin sees those.
      CREATE TABLE IF NOT EXISTS notifications (
        id              SERIAL PRIMARY KEY,
        recipient       TEXT NOT NULL,
        kind            TEXT NOT NULL,
        title           TEXT NOT NULL,
        body            TEXT,
        link            TEXT,
        read            BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notif_recipient
        ON notifications (recipient, read, created_at DESC);

      -- CNIC-based credentials. The student types (name, CNIC, roll) the
      -- first time, and on every login after that just types CNIC.
      CREATE TABLE IF NOT EXISTS student_credentials (
        roll_no         TEXT PRIMARY KEY,
        cnic            TEXT NOT NULL,
        display_name    TEXT,
        registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_creds_cnic
        ON student_credentials (cnic);
    `);
  });
  globalThis.__schemaDone = true;
}

export function ensureSchema(): Promise<void> {
  // Fast-path once we know the schema's good in this instance — skips the
  // round-trip to the lock manager on every request.
  if (globalThis.__schemaDone) return Promise.resolve();
  return (globalThis.__schemaPromise ??= runSchema().catch((err) => {
    // Reset so the next request can retry instead of being permanently
    // stuck on a one-time hiccup (e.g. cold-start statement timeout).
    globalThis.__schemaPromise = undefined;
    throw err;
  }));
}

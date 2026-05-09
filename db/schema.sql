-- Allied Hospital House Job seat-selection portal
-- Tables: selections, admin_session, audit_log
-- Static data (students, departments) lives in /data/*.json and is loaded at runtime.

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

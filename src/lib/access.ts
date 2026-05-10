import { headers } from "next/headers";
import { sql, ensureSchema } from "./db";

export type AccessAction =
  | "login_success"
  | "login_fail_unknown"
  | "login_fail_not_pass"
  | "login_fail_name_mismatch"
  | "login_fail_rank_mismatch"
  | "view_select"
  | "view_select_blocked"
  | "submit"
  | "admin_view_log";

export type AccessEntry = {
  roll_no: string;
  actor?: string | null;
  action: AccessAction;
};

export async function logAccess(entry: AccessEntry): Promise<void> {
  try {
    await ensureSchema();
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip =
      (fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || null) ?? null;
    const country = h.get("x-vercel-ip-country") || null;
    const city = h.get("x-vercel-ip-city")
      ? decodeURIComponent(h.get("x-vercel-ip-city")!)
      : null;
    const ua = h.get("user-agent")?.slice(0, 400) ?? null;
    await sql`
      INSERT INTO access_log (roll_no, actor, action, ip, country, city, user_agent)
      VALUES (${entry.roll_no}, ${entry.actor ?? null}, ${entry.action}, ${ip}, ${country}, ${city}, ${ua})
    `;
  } catch {
    // Logging is best-effort - never let it break the user flow.
  }
}

export type AccessRow = {
  id: number;
  roll_no: string;
  actor: string | null;
  action: AccessAction;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function getAccessLog(roll: string, limit = 100): Promise<AccessRow[]> {
  await ensureSchema();
  return await sql<AccessRow[]>`
    SELECT id, roll_no, actor, action, ip, country, city, user_agent, created_at::text AS created_at
    FROM access_log
    WHERE roll_no = ${roll}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function getRecentAccessLog(limit = 200): Promise<AccessRow[]> {
  await ensureSchema();
  return await sql<AccessRow[]>`
    SELECT id, roll_no, actor, action, ip, country, city, user_agent, created_at::text AS created_at
    FROM access_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function getAccessSummary(roll: string): Promise<{
  total: number;
  successes: number;
  failures: number;
  uniqueIps: number;
  lastAt: string | null;
}> {
  await ensureSchema();
  const rows = await sql<
    {
      total: number;
      successes: number;
      failures: number;
      unique_ips: number;
      last_at: string | null;
    }[]
  >`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE action = 'login_success')::int AS successes,
      COUNT(*) FILTER (WHERE action LIKE 'login_fail%')::int AS failures,
      COUNT(DISTINCT ip)::int AS unique_ips,
      MAX(created_at)::text AS last_at
    FROM access_log
    WHERE roll_no = ${roll}
  `;
  const r = rows[0] ?? { total: 0, successes: 0, failures: 0, unique_ips: 0, last_at: null };
  return {
    total: r.total,
    successes: r.successes,
    failures: r.failures,
    uniqueIps: r.unique_ips,
    lastAt: r.last_at,
  };
}

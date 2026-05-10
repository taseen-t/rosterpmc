import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql, ensureSchema } from "./db";

const STATE_COOKIE = "ho_oauth_state";
const GOOGLE_COOKIE = "ho_google";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "dev-only-secret-please-set-SESSION_SECRET-in-prod";
  return new TextEncoder().encode(s);
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function getRedirectUri(): Promise<string> {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host") || "rosterpmc.vercel.app";
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function buildGoogleAuthUrl(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = await getRedirectUri();
  const state = crypto.randomUUID();
  // remember the state in a cookie so the callback can validate
  const c = await cookies();
  c.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

export async function exchangeCode(
  code: string,
): Promise<GoogleProfile> {
  const redirectUri = await getRedirectUri();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status}`);
  }
  const tokens = (await tokenRes.json()) as { access_token: string };
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!profileRes.ok) throw new Error("Profile fetch failed");
  const profile = (await profileRes.json()) as {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    email_verified?: boolean;
  };
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture ?? null,
  };
}

export async function consumeState(provided: string | null): Promise<boolean> {
  const c = await cookies();
  const stored = c.get(STATE_COOKIE)?.value;
  c.delete(STATE_COOKIE);
  return Boolean(stored && provided && stored === provided);
}

export async function setGoogleSession(profile: GoogleProfile): Promise<void> {
  const tok = await mintGoogleToken(profile);
  const c = await cookies();
  c.set(GOOGLE_COOKIE, tok, googleCookieOptions());
}

/** Build the JWT for a Google session — exposed so route handlers can attach
 *  the cookie directly to a NextResponse instead of relying on the implicit
 *  cookies() helper, which can drop the Set-Cookie on redirect responses. */
export async function mintGoogleToken(profile: GoogleProfile): Promise<string> {
  return await new SignJWT({
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export function googleCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export const GOOGLE_COOKIE_NAME = GOOGLE_COOKIE;

export async function getGoogleSession(): Promise<GoogleProfile | null> {
  const c = await cookies();
  const tok = c.get(GOOGLE_COOKIE)?.value;
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, getSecret());
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}

export async function clearGoogleSession(): Promise<void> {
  const c = await cookies();
  c.delete(GOOGLE_COOKIE);
}

export async function upsertGoogleProfile(profile: GoogleProfile): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO google_links (google_email, google_sub, google_name, google_picture)
    VALUES (${profile.email}, ${profile.sub}, ${profile.name}, ${profile.picture})
    ON CONFLICT (google_email) DO UPDATE SET
      google_sub = EXCLUDED.google_sub,
      google_name = EXCLUDED.google_name,
      google_picture = EXCLUDED.google_picture,
      last_seen_at = NOW()
  `;
}

export async function getLinkedRoll(email: string): Promise<string | null> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string | null }[]>`
    SELECT roll_no FROM google_links WHERE google_email = ${email}
  `;
  return rows[0]?.roll_no ?? null;
}

export async function linkRollToGoogle(
  email: string,
  roll: string,
  extras?: { displayName?: string; cnic?: string },
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const existing = await sql<{ google_email: string }[]>`
    SELECT google_email FROM google_links WHERE roll_no = ${roll}
  `;
  if (existing.length && existing[0].google_email !== email) {
    return {
      ok: false,
      error: `Roll ${roll} is already linked to another Google account. Contact Support to release it.`,
    };
  }
  await sql`
    UPDATE google_links
       SET roll_no = ${roll},
           display_name = ${extras?.displayName ?? null},
           cnic = ${extras?.cnic ?? null},
           linked_at = NOW(),
           last_seen_at = NOW()
     WHERE google_email = ${email}
  `;
  return { ok: true };
}

/** Returns the public display name a student set when they linked their Google account. */
export async function getDisplayNamesByRoll(): Promise<Map<string, string>> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string; display_name: string | null }[]>`
    SELECT roll_no, display_name FROM google_links
    WHERE roll_no IS NOT NULL AND display_name IS NOT NULL AND display_name <> ''
  `;
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.display_name) m.set(r.roll_no, r.display_name);
  }
  return m;
}

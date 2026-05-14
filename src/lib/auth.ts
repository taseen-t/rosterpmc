import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Admin-only auth. Students no longer log in — the admin owns the entire
 * roster and edits it directly. A single password-gated cookie is enough.
 */

const ADMIN_COOKIE = "ho_admin";

function getSecret(): Uint8Array {
  const s =
    process.env.SESSION_SECRET ||
    "dev-only-secret-please-set-SESSION_SECRET-in-prod";
  return new TextEncoder().encode(s);
}

export async function setAdminSession() {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
  const c = await cookies();
  c.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  const tok = c.get(ADMIN_COOKIE)?.value;
  if (!tok) return false;
  try {
    const { payload } = await jwtVerify(tok, getSecret());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "rabiya4196";
  return input === expected;
}

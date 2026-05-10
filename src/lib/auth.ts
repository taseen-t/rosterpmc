import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ho_session";
const ADMIN_COOKIE = "ho_admin";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "dev-only-secret-please-set-SESSION_SECRET-in-prod";
  return new TextEncoder().encode(s);
}

export type Session = { roll: string };

export async function setStudentSession(roll: string) {
  const token = await mintStudentToken(roll);
  const c = await cookies();
  c.set(COOKIE_NAME, token, studentCookieOptions());
}

export async function mintStudentToken(roll: string): Promise<string> {
  return await new SignJWT({ roll })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export function studentCookieOptions(): {
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
    maxAge: 60 * 60 * 24 * 7,
  };
}

export const STUDENT_COOKIE_NAME = COOKIE_NAME;

export async function clearStudentSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getStudentSession(): Promise<Session | null> {
  const c = await cookies();
  const tok = c.get(COOKIE_NAME)?.value;
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, getSecret());
    // Trust the signed JWT for identity. We used to also gate this on the
    // roll being in the static OCR list, but that locked out manually-added
    // students (who only live in `student_additions`). Pages that need to
    // confirm the roll is still in the active roster (e.g. /select) do that
    // explicit lookup themselves and clear the cookie if it's gone.
    if (typeof payload.roll === "string") return { roll: payload.roll };
    return null;
  } catch {
    return null;
  }
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

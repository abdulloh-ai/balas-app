import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "balas_super_secret_platform_owner_key_2026"
);

const PLATFORM_SESSION_COOKIE = "balas_admin_session";
const BUSINESS_SESSION_COOKIE = "balas_business_session";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Export alias for comparePassword
export const comparePassword = verifyPassword;

export async function createSession(payload: { id: string; email: string; name: string }) {
  const token = await new SignJWT({ ...payload, role: "PLATFORM_OWNER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function createBusinessSession(payload: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}) {
  const token = await new SignJWT({ ...payload, role: "BUSINESS_OWNER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(BUSINESS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function getPlatformOwnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "PLATFORM_OWNER") return null;
    return payload as { id: string; email: string; name: string; role: string };
  } catch {
    return null;
  }
}

export async function getBusinessOwnerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(BUSINESS_SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "BUSINESS_OWNER") return null;
    return payload as {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
    };
  } catch {
    return null;
  }
}

export async function destroyPlatformOwnerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_SESSION_COOKIE);
}

export async function destroyBusinessOwnerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(BUSINESS_SESSION_COOKIE);
}

// Export aliases for logout routes
export const clearSession = destroyPlatformOwnerSession;
export const clearBusinessSession = destroyBusinessOwnerSession;

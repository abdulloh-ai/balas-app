import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "balas_super_secret_platform_owner_key_2026"
);

const ADMIN_COOKIE_NAME = "balas_admin_session";
const BUSINESS_COOKIE_NAME = "balas_business_session";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// -------------------------------------------------------------
// 1. PlatformOwner Session Helpers
// -------------------------------------------------------------
export async function createSession(payload: { id: string; email: string; name: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function getPlatformOwnerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { id: string; email: string; name: string };
  } catch (error) {
    return null;
  }
}

// -------------------------------------------------------------
// 2. BusinessOwner Session Helpers
// -------------------------------------------------------------
export async function createBusinessSession(payload: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(BUSINESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function clearBusinessSession() {
  const cookieStore = await cookies();
  cookieStore.delete(BUSINESS_COOKIE_NAME);
}

export async function getBusinessOwnerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(BUSINESS_COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
    };
  } catch (error) {
    return null;
  }
}

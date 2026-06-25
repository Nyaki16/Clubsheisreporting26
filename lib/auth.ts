import type { NextRequest } from "next/server";

// Centralised session signing + verification.
//
// Sessions are stateless signed tokens: `<payloadB64url>.<hmacB64url>` where the
// HMAC-SHA256 is computed over the payload with a server-only secret. Because the
// signature can't be forged without the secret, a client can no longer just send
// `Cookie: admin_session=true` (or hand-craft a `client_session` JSON) to gain
// access — every value is verified against the signature on the way in.
//
// Secret resolution: prefer a dedicated SESSION_SECRET, otherwise fall back to
// ADMIN_PASSWORD (always set in this deployment) so signing works without adding
// new env config. Set SESSION_SECRET in Vercel for a key independent of the admin
// password (rotating the admin password won't then invalidate every session).

const enc = new TextEncoder();

export const ADMIN_SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
export const CLIENT_SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("SESSION_SECRET or ADMIN_PASSWORD must be set to sign sessions");
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

type SessionPayload = Record<string, unknown> & { exp?: number };

async function signSession(payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  const body: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = await globalThis.crypto.subtle.sign("HMAC", await getKey(), enc.encode(data));
  return `${data}.${Buffer.from(sig).toString("base64url")}`;
}

async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let valid = false;
  try {
    valid = await globalThis.crypto.subtle.verify(
      "HMAC",
      await getKey(),
      Buffer.from(sig, "base64url"),
      enc.encode(data),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
  return payload;
}

// ---- Cookie helpers ------------------------------------------------------

// Shared cookie attributes. SameSite=None + Secure + Partitioned (CHIPS) so the
// session is sent when the dashboard runs inside the Ghutte iframe (cross-site),
// surviving Chrome's third-party cookie blocking.
export function sessionCookieOptions(maxAgeSeconds: number) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    partitioned: isProd,
    maxAge: maxAgeSeconds,
    path: "/",
  };
}

export function createAdminSession(): Promise<string> {
  return signSession({ role: "admin" }, ADMIN_SESSION_TTL);
}

export function createClientSession(clientId: string, slug: string): Promise<string> {
  return signSession({ clientId, slug }, CLIENT_SESSION_TTL);
}

// ---- Request-side verification (use these everywhere auth is checked) -----

// True if the request carries a valid admin session cookie, or the
// ADMIN_PASSWORD Bearer header (used by server-to-server / scripts).
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get("authorization");
  if (adminPassword && authHeader === `Bearer ${adminPassword}`) return true;

  const payload = await verifySession(request.cookies.get("admin_session")?.value);
  return payload?.role === "admin";
}

export interface ClientSession {
  clientId: string;
  slug: string;
}

// Returns the verified client session, or null if absent/invalid/expired.
export async function getClientSession(request: NextRequest): Promise<ClientSession | null> {
  const payload = await verifySession(request.cookies.get("client_session")?.value);
  if (payload && typeof payload.slug === "string") {
    return { clientId: typeof payload.clientId === "string" ? payload.clientId : "", slug: payload.slug };
  }
  return null;
}

export interface AuthResult {
  ok: boolean;
  role?: "admin" | "client";
  slug?: string;
  clientId?: string;
}

// Allows admin (any client) OR a client whose verified session matches `expectedSlug`.
export async function authorizeForSlug(request: NextRequest, expectedSlug: string): Promise<AuthResult> {
  if (await isAdminRequest(request)) return { ok: true, role: "admin" };

  const session = await getClientSession(request);
  if (session && session.slug === expectedSlug) {
    return { ok: true, role: "client", slug: session.slug, clientId: session.clientId };
  }
  return { ok: false };
}

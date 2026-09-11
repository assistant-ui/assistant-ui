import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const ANONYMOUS_SESSION_COOKIE = "aui_anon_session";
export const ANONYMOUS_SESSION_HEADER = "x-assistant-ui-anonymous-session";
export const ANONYMOUS_SESSION_TTL_SECONDS = 24 * 60 * 60;

export const PUBLIC_ASSISTANT_CROSS_ORIGINS: ReadonlySet<string> = new Set([
  "https://assistant-ui-expo.vercel.app",
  "https://assistant-ui-ink.vercel.app",
  "http://localhost:8081",
]);

type AnonymousSessionPayload = {
  v: 1;
  id: string;
  exp: number;
};

export type AnonymousSession = {
  id: string;
  expiresAt: number;
};

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function getAnonymousSessionSecret(): string | null {
  const secret = process.env.AUI_ANONYMOUS_SESSION_SECRET?.trim();
  if (secret) return secret;
  return process.env.NODE_ENV === "production"
    ? null
    : "assistant-ui-local-anonymous-session";
}

export function createAnonymousSessionToken({
  secret,
  id = randomUUID(),
  now = Date.now(),
}: {
  secret: string;
  id?: string;
  now?: number;
}): string {
  const payload: AnonymousSessionPayload = {
    v: 1,
    id,
    exp: now + ANONYMOUS_SESSION_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyAnonymousSessionToken({
  token,
  secret,
  now = Date.now(),
}: {
  token: string;
  secret: string;
  now?: number;
}): AnonymousSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
  if (!signaturesMatch(signature, sign(encoded, secret))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<AnonymousSessionPayload>;
    if (
      payload.v !== 1 ||
      typeof payload.id !== "string" ||
      payload.id.length < 16 ||
      payload.id.length > 128 ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) {
      return null;
    }
    return { id: payload.id, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const item of cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;
    if (item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim() || null;
  }
  return null;
}

function headerOrigin(request: Request): string | null {
  const value =
    request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedPublicAssistantOrigin(origin: string): boolean {
  return PUBLIC_ASSISTANT_CROSS_ORIGINS.has(origin);
}

export function isPublicAssistantBrowserRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  const fetchMode = request.headers.get("sec-fetch-mode");
  if (fetchMode !== "cors") return false;
  if (fetchSite === "same-origin") return true;
  if (!["same-site", "cross-site"].includes(fetchSite ?? "")) return false;

  const origin = headerOrigin(request);
  if (!origin) return false;
  return isAllowedPublicAssistantOrigin(origin);
}

export function getAnonymousSessionToken(request: Request): string | null {
  return (
    readCookie(request, ANONYMOUS_SESSION_COOKIE) ??
    request.headers.get(ANONYMOUS_SESSION_HEADER)?.trim() ??
    null
  );
}

export function getAnonymousSession(request: Request): AnonymousSession | null {
  const secret = getAnonymousSessionSecret();
  const token = getAnonymousSessionToken(request);
  if (!secret || !token) return null;
  return verifyAnonymousSessionToken({ token, secret });
}

export function requirePublicAssistantSession(
  request: Request,
): AnonymousSession | Response {
  if (!isPublicAssistantBrowserRequest(request)) {
    return Response.json(
      { error: "The public assistant is available through the website." },
      { status: 403 },
    );
  }
  if (!getAnonymousSessionSecret()) {
    return Response.json(
      { error: "Anonymous session protection is not configured." },
      { status: 503 },
    );
  }
  const session = getAnonymousSession(request);
  if (!session) {
    return Response.json(
      { error: "A valid anonymous browser session is required." },
      { status: 401 },
    );
  }
  return session;
}

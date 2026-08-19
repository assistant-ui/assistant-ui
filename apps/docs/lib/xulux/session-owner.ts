const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_XULUX_SESSION_ID_CHARS = 128;

export function createXuluxSessionId(userId: string): string {
  return `${userId}.${crypto.randomUUID()}`;
}

export function migrateLegacyXuluxSessionId(
  sessionId: string,
  userId: string,
): string {
  if (isXuluxSessionOwnedByUser(sessionId, userId)) return sessionId;
  if (UUID_PATTERN.test(sessionId)) return `${userId}.${sessionId}`;
  return createXuluxSessionId(userId);
}

export function isXuluxSessionOwnedByUser(
  sessionId: unknown,
  userId: string,
): sessionId is string {
  if (typeof sessionId !== "string") return false;
  if (sessionId.length > MAX_XULUX_SESSION_ID_CHARS) return false;
  const prefix = `${userId}.`;
  if (!sessionId.startsWith(prefix)) return false;
  return UUID_PATTERN.test(sessionId.slice(prefix.length));
}

export function requireXuluxSessionOwner(
  sessionId: string,
  userId: string,
): Response | null {
  if (isXuluxSessionOwnedByUser(sessionId, userId)) return null;
  return Response.json(
    { error: "This workspace belongs to another user." },
    { status: 403 },
  );
}

import type { AuthenticatedRequest } from "../types/oauth";

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader) return null;

  const parts = authorizationHeader.split(" ");
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (scheme?.toLowerCase() !== "bearer") return null;

  return token && token.length > 0 ? token : null;
}

/**
 * Create authenticated request context from headers
 */
export function createAuthenticatedRequest(
  headers: Record<string, string | string[] | undefined>,
): AuthenticatedRequest {
  const authHeader = headers["authorization"];
  const authorizationHeader = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;
  const bearerToken = extractBearerToken(authorizationHeader);

  const result: AuthenticatedRequest = {
    isAuthenticated: false,
  };

  if (authorizationHeader !== undefined) {
    result.authorizationHeader = authorizationHeader;
  }

  if (bearerToken !== null) {
    result.bearerToken = bearerToken;
  }

  return result;
}

import type { OAuthResourceServerConfig } from "../types/oauth";
import type { ProtectedResourceMetadata } from "../schemas/oauth";

/**
 * Generate RFC 9728 Protected Resource Metadata
 *
 * This metadata is served at `/.well-known/oauth-protected-resource`
 * and allows OAuth clients to discover how to authenticate with this server.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 */
export function generateProtectedResourceMetadata(
  config: OAuthResourceServerConfig,
): ProtectedResourceMetadata {
  return {
    resource: config.resource,
    authorization_servers: config.authorizationServers,
    scopes_supported: config.scopesSupported,
    bearer_methods_supported: config.bearerMethodsSupported ?? ["header"],
    resource_documentation: config.resourceDocumentation,
  };
}

/**
 * Validate that a resource URL matches expected format
 */
export function validateResourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract scopes from all tools with OAuth security schemes
 */
export function collectScopesFromTools<
  T extends { securitySchemes?: Array<{ type: string; scopes?: string[] }> },
>(tools: T[]): string[] {
  const scopes = new Set<string>();

  for (const tool of tools) {
    if (!tool.securitySchemes) continue;

    for (const scheme of tool.securitySchemes) {
      if (scheme.type === "oauth2" && scheme.scopes) {
        for (const scope of scheme.scopes) {
          scopes.add(scope);
        }
      }
    }
  }

  return Array.from(scopes).sort();
}

import type { IncomingMessage, ServerResponse } from "http";
import type { OAuthResourceServerConfig } from "../types/oauth";
import { generateProtectedResourceMetadata } from "./protected-resource-metadata";

/**
 * HTTP handler for /.well-known/oauth-protected-resource
 *
 * Returns RFC 9728 compliant protected resource metadata.
 */
export function createProtectedResourceMetadataHandler(
  config: OAuthResourceServerConfig,
) {
  const metadata = generateProtectedResourceMetadata(config);
  const body = JSON.stringify(metadata, null, 2);

  return function handleProtectedResourceMetadata(
    _req: IncomingMessage,
    res: ServerResponse,
  ): void {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  };
}

/**
 * Path for the protected resource metadata endpoint
 */
export const PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource";

/**
 * Check if a request path matches the metadata endpoint
 */
export function isProtectedResourceMetadataRequest(path: string): boolean {
  return path === PROTECTED_RESOURCE_METADATA_PATH;
}

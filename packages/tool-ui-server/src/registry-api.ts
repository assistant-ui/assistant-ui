/**
 * Registry API Types
 *
 * This file defines the API contract for the Tool UI Registry service.
 * The registry is hosted at registry.assistant-ui.com and provides:
 * - Server discovery and listing
 * - Manifest hosting and validation
 * - Bundle publishing and integrity verification
 *
 * PSL-isolated hosting is provided at *.auiusercontent.com
 */

import type { UIManifest, UICapability } from "./types";

// =============================================================================
// Registry API Endpoints
// =============================================================================

/**
 * Base URL for the registry API
 */
export const REGISTRY_BASE_URL = "https://registry.assistant-ui.com";

/**
 * Base URL for PSL-isolated component hosting
 */
export const HOSTING_BASE_URL = "auiusercontent.com";

// =============================================================================
// GET /v1/servers - List all registered servers
// =============================================================================

export interface ListServersRequest {
  /** Filter by category (optional) */
  category?: string;
  /** Pagination cursor */
  cursor?: string;
  /** Page size (default: 20, max: 100) */
  limit?: number;
  /** Search query */
  search?: string;
}

export interface ServerSummary {
  /** Unique server identifier */
  serverId: string;
  /** Human-readable name */
  serverName: string;
  /** Short description */
  description?: string;
  /** Server categories/tags */
  categories?: string[];
  /** Number of UI components */
  componentCount: number;
  /** Last updated timestamp */
  updatedAt: string;
  /** Bundle hash for integrity */
  bundleHash: string;
}

export interface ListServersResponse {
  /** List of server summaries */
  servers: ServerSummary[];
  /** Next page cursor (null if no more pages) */
  nextCursor: string | null;
  /** Total count (if available) */
  total?: number;
}

// =============================================================================
// GET /v1/servers/:serverId - Get server details
// =============================================================================

export interface GetServerRequest {
  /** Server ID from URL path */
  serverId: string;
}

export interface ServerDetails extends ServerSummary {
  /** Full manifest */
  manifest: UIManifest;
  /** Author information */
  author?: {
    name: string;
    url?: string;
    email?: string;
  };
  /** Repository URL */
  repository?: string;
  /** Documentation URL */
  documentation?: string;
  /** Version history */
  versions?: Array<{
    version: string;
    bundleHash: string;
    publishedAt: string;
  }>;
  /** Download statistics */
  stats?: {
    downloads: number;
    weeklyDownloads: number;
  };
}

export interface GetServerResponse {
  server: ServerDetails;
}

// =============================================================================
// GET /v1/servers/:serverId/manifest.json - Get UI manifest
// =============================================================================

/**
 * Returns the raw manifest.json for a server.
 * Content-Type: application/json
 * Cache-Control: public, max-age=3600
 */
export type GetManifestResponse = UIManifest;

// =============================================================================
// POST /v1/servers/:serverId/publish - Publish/update server
// =============================================================================

export interface PublishRequest {
  /** Complete UI manifest */
  manifest: UIManifest;
  /** Base64-encoded bundle content */
  bundle: string;
  /** SHA-256 hash of the bundle (must match manifest.bundleHash) */
  bundleHash: string;
}

export interface PublishResponse {
  /** Success status */
  success: boolean;
  /** Published server ID */
  serverId: string;
  /** Bundle URL */
  bundleUrl: string;
  /** Render URL for iframe embedding */
  renderUrl: string;
  /** Manifest URL */
  manifestUrl: string;
  /** Publication timestamp */
  publishedAt: string;
}

export interface PublishErrorResponse {
  /** Error status */
  success: false;
  /** Error code */
  error: "UNAUTHORIZED" | "INVALID_MANIFEST" | "HASH_MISMATCH" | "SERVER_ERROR";
  /** Human-readable message */
  message: string;
  /** Detailed validation errors (for INVALID_MANIFEST) */
  details?: Record<string, string[]>;
}

// =============================================================================
// DELETE /v1/servers/:serverId - Unpublish server
// =============================================================================

export interface UnpublishRequest {
  /** Server ID from URL path */
  serverId: string;
}

export interface UnpublishResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// GET /v1/servers/:serverId/capability - Get MCP capability object
// =============================================================================

/**
 * Returns the MCPUICapability object that should be included in
 * the server's initialize response.
 */
export type GetCapabilityResponse = UICapability;

// =============================================================================
// Authentication
// =============================================================================

/**
 * Authentication is required for publish/unpublish operations.
 *
 * Use the Authorization header with a Bearer token:
 * Authorization: Bearer <token>
 *
 * Tokens can be obtained from the assistant-ui dashboard.
 * Environment variable: ASSISTANT_UI_TOKEN
 */
export interface AuthHeaders {
  Authorization: `Bearer ${string}`;
}

// =============================================================================
// PSL-Isolated Hosting Endpoints
// =============================================================================

/**
 * Bundle endpoint: https://{serverId}.auiusercontent.com/bundle.js
 *
 * Serves the compiled JavaScript bundle for the UI components.
 * - Content-Type: application/javascript
 * - Cache-Control: public, max-age=31536000, immutable (hash-based URL)
 * - CSP: script-src 'self'
 */

/**
 * Render endpoint: https://{serverId}.auiusercontent.com/render
 *
 * Serves the HTML page that hosts the UI components in an iframe.
 * Query parameters:
 * - component: Component name to render
 *
 * Security headers:
 * - X-Frame-Options: ALLOWALL (must be embeddable)
 * - Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
 * - X-Content-Type-Options: nosniff
 *
 * The page:
 * 1. Loads the bundle.js
 * 2. Initializes the tool UI runtime
 * 3. Listens for postMessage from parent
 * 4. Renders the requested component
 */

/**
 * Example render page HTML structure:
 *
 * ```html
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <meta charset="utf-8">
 *   <meta name="viewport" content="width=device-width, initial-scale=1">
 *   <script type="module" src="/bundle.js"></script>
 * </head>
 * <body>
 *   <div id="root"></div>
 * </body>
 * </html>
 * ```
 */

// =============================================================================
// Error Codes
// =============================================================================

export const RegistryErrorCodes = {
  /** Authentication required or token invalid */
  UNAUTHORIZED: 401,
  /** Server not found */
  NOT_FOUND: 404,
  /** Manifest validation failed */
  INVALID_MANIFEST: 422,
  /** Bundle hash doesn't match declared hash */
  HASH_MISMATCH: 422,
  /** Rate limit exceeded */
  RATE_LIMITED: 429,
  /** Internal server error */
  SERVER_ERROR: 500,
} as const;

// =============================================================================
// Rate Limits
// =============================================================================

export const RateLimits = {
  /** List servers: 100 requests per minute */
  LIST_SERVERS: { requests: 100, window: 60 },
  /** Get server details: 200 requests per minute */
  GET_SERVER: { requests: 200, window: 60 },
  /** Publish: 10 requests per hour */
  PUBLISH: { requests: 10, window: 3600 },
  /** Get manifest: 1000 requests per minute (cached) */
  GET_MANIFEST: { requests: 1000, window: 60 },
} as const;

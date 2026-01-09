# OAuth Setup Guide for @assistant-ui/tool-ui-server

This guide explains how to add OAuth 2.1 authentication to your MCP tools, allowing users to authenticate via identity providers like Auth0, Okta, or AWS Cognito.

## Table of Contents

- [Overview](#overview)
- [When to Use OAuth](#when-to-use-oauth)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Provider Setup](#provider-setup)
  - [Auth0](#auth0)
  - [Okta](#okta)
  - [AWS Cognito](#aws-cognito)
- [Configuring Your MCP Server](#configuring-your-mcp-server)
- [Securing Tools with Security Schemes](#securing-tools-with-security-schemes)
- [Token Validation](#token-validation)
- [Handling Authentication Errors](#handling-authentication-errors)
- [Scope Upgrades (Step-Up Auth)](#scope-upgrades-step-up-auth)
- [Testing OAuth Flows](#testing-oauth-flows)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Overview

The `@assistant-ui/tool-ui-server` package provides OAuth 2.1 authentication support following the [MCP Authorization Specification](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/authorization/). This implementation is compatible with ChatGPT's MCP integration and other MCP clients.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP Client (ChatGPT, etc.)                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Discover     │───>│ OAuth Flow   │───>│ Attach Bearer Token  │  │
│  │ Auth Server  │    │ (PKCE)       │    │ to MCP Requests      │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
└───────────┬─────────────────────────────────────────┬───────────────┘
            │                                         │
            │ GET /.well-known/                       │ Authorization: Bearer <token>
            │ oauth-protected-resource                │
            ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Your MCP Server (tool-ui-server)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Protected        │  │ Security Scheme  │  │ Token            │  │
│  │ Resource         │  │ Validation       │  │ Validator        │  │
│  │ Metadata         │  │                  │  │ (JWKS/JWT)       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ Validate token via JWKS
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Authorization Server                            │
│                    (Auth0, Okta, Cognito, etc.)                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ OAuth Metadata   │  │ Token Endpoint   │  │ JWKS Endpoint    │  │
│  │ /.well-known/    │  │ /oauth/token     │  │ /.well-known/    │  │
│  │ openid-config    │  │                  │  │ jwks.json        │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## When to Use OAuth

### Use OAuth (`oauth2`) when:

- Your tool accesses user-specific data (documents, emails, calendars)
- You need to identify which user is making requests
- Actions should be attributed to a specific user
- You're integrating with third-party APIs that require user authorization

### Use No Auth (`noauth`) when:

- The tool provides public information (weather, public APIs)
- No user-specific data is accessed
- The tool performs read-only operations on public resources
- You want the simplest possible setup

### Mixed Security Schemes

You can offer both options, letting authenticated users access more features:

```typescript
// Optional auth - works for anyone, but authenticated users get more features
securitySchemes: [
  { type: "noauth" },
  { type: "oauth2", scopes: ["user:read"] }
]
```

---

## Quick Start

Here's a minimal example of adding OAuth to your MCP server:

```typescript
import { createToolUIServer, OAuth } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

// 1. Create server with OAuth configuration
const { server, toolWithUI } = createToolUIServer({
  serverId: "my-secure-mcp",
  name: "My Secure MCP Server",
  version: "1.0.0",
  bundleHash: "sha256:...",
  oauth: {
    resource: "https://my-mcp.example.com",
    authorizationServers: ["https://my-tenant.auth0.com"],
    scopesSupported: ["read", "write"],
  },
});

// 2. Create a helper for auth errors
const wwwAuthHelper = OAuth.createWWWAuthenticateHelper({
  resource: "https://my-mcp.example.com",
  authorizationServers: ["https://my-tenant.auth0.com"],
});

// 3. Define a protected tool
toolWithUI({
  name: "get_user_documents",
  description: "Get the authenticated user's documents",
  parameters: z.object({}),
  component: "DocumentList",
  securitySchemes: [{ type: "oauth2", scopes: ["read"] }],
  execute: async (_args, context) => {
    // Check authentication
    if (!context?.auth?.isAuthenticated) {
      return OAuth.createMCPAuthError(
        "Please sign in to access your documents",
        wwwAuthHelper.unauthorized()
      );
    }
    
    // Access user info from token claims
    const userId = context.auth.claims?.sub;
    return fetchUserDocuments(userId);
  },
});
```

---

## Core Concepts

### Security Schemes

Security schemes define authentication requirements for tools:

```typescript
import type { SecurityScheme } from "@assistant-ui/tool-ui-server";

// No authentication required
const publicScheme: SecurityScheme = { type: "noauth" };

// OAuth 2.0 with specific scopes
const protectedScheme: SecurityScheme = {
  type: "oauth2",
  scopes: ["documents:read", "documents:write"],
};
```

### OAuth Resource Server Configuration

Your MCP server acts as an OAuth **Resource Server** (not an Authorization Server). Configure it with:

```typescript
import type { OAuthResourceServerConfig } from "@assistant-ui/tool-ui-server";

const oauthConfig: OAuthResourceServerConfig = {
  // Your server's canonical HTTPS URL
  resource: "https://my-mcp.example.com",
  
  // Authorization servers that can issue tokens for your resource
  authorizationServers: ["https://my-tenant.auth0.com"],
  
  // All scopes your tools might require
  scopesSupported: ["read", "write", "admin"],
  
  // Optional: Link to your API documentation
  resourceDocumentation: "https://docs.example.com/api",
  
  // How tokens can be sent (default: ["header"])
  bearerMethodsSupported: ["header"],
};
```

### Protected Resource Metadata

When OAuth is configured, your server automatically exposes RFC 9728 metadata at:

```
GET /.well-known/oauth-protected-resource
```

Response:

```json
{
  "resource": "https://my-mcp.example.com",
  "authorization_servers": ["https://my-tenant.auth0.com"],
  "scopes_supported": ["read", "write", "admin"],
  "bearer_methods_supported": ["header"]
}
```

MCP clients use this to discover how to authenticate with your server.

---

## Provider Setup

### Auth0

#### 1. Create an API in Auth0

1. Go to **Auth0 Dashboard > APIs**
2. Click **Create API**
3. Configure:
   - **Name**: My MCP Server API
   - **Identifier**: `https://my-mcp.example.com` (your resource URL)
   - **Signing Algorithm**: RS256

#### 2. Define Permissions (Scopes)

In your API settings, go to **Permissions** and add:

| Permission | Description |
|------------|-------------|
| `read` | Read access to resources |
| `write` | Write access to resources |
| `admin` | Administrative access |

#### 3. Create a Machine-to-Machine Application (for testing)

1. Go to **Applications > Create Application**
2. Choose **Machine to Machine**
3. Authorize it for your API with required scopes

#### 4. Configure Your MCP Server

```typescript
const oauthConfig: OAuthResourceServerConfig = {
  resource: "https://my-mcp.example.com",
  authorizationServers: ["https://YOUR_TENANT.auth0.com"],
  scopesSupported: ["read", "write", "admin"],
};
```

#### Auth0 Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://YOUR_TENANT.auth0.com/authorize` |
| Token | `https://YOUR_TENANT.auth0.com/oauth/token` |
| JWKS | `https://YOUR_TENANT.auth0.com/.well-known/jwks.json` |
| OpenID Config | `https://YOUR_TENANT.auth0.com/.well-known/openid-configuration` |

---

### Okta

#### 1. Create an Authorization Server

1. Go to **Okta Admin Console > Security > API**
2. Click **Add Authorization Server**
3. Configure:
   - **Name**: My MCP Server
   - **Audience**: `https://my-mcp.example.com`

#### 2. Add Scopes

In the Authorization Server settings, go to **Scopes** and add:

| Name | Description |
|------|-------------|
| `read` | Read access |
| `write` | Write access |

#### 3. Create an Access Policy

1. Go to **Access Policies > Add Policy**
2. Add rules for which users/groups can request which scopes

#### 4. Configure Your MCP Server

```typescript
const oauthConfig: OAuthResourceServerConfig = {
  resource: "https://my-mcp.example.com",
  authorizationServers: ["https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID"],
  scopesSupported: ["read", "write"],
};
```

#### Okta Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID/v1/authorize` |
| Token | `https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID/v1/token` |
| JWKS | `https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID/v1/keys` |
| OpenID Config | `https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID/.well-known/openid-configuration` |

---

### AWS Cognito

#### 1. Create a User Pool

1. Go to **AWS Console > Cognito**
2. Create a new User Pool
3. Configure sign-in options

#### 2. Create a Resource Server

1. In your User Pool, go to **App Integration > Resource servers**
2. Click **Create resource server**
3. Configure:
   - **Resource server identifier**: `https://my-mcp.example.com`
   - **Scopes**: `read`, `write`

#### 3. Configure App Client

1. Go to **App Integration > App clients**
2. Create or edit an app client
3. Enable the OAuth scopes you need

#### 4. Configure Your MCP Server

```typescript
const oauthConfig: OAuthResourceServerConfig = {
  resource: "https://my-mcp.example.com",
  authorizationServers: [
    "https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID"
  ],
  scopesSupported: ["read", "write"],
};
```

#### Cognito Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/oauth2/authorize` |
| Token | `https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/oauth2/token` |
| JWKS | `https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID/.well-known/jwks.json` |
| OpenID Config | `https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID/.well-known/openid-configuration` |

---

## Configuring Your MCP Server

### Basic Configuration

```typescript
import { createToolUIServer } from "@assistant-ui/tool-ui-server";

const { server, toolWithUI, handleOAuthMetadata, isOAuthMetadataRequest } = 
  createToolUIServer({
    serverId: "my-mcp",
    name: "My MCP Server",
    version: "1.0.0",
    bundleHash: "sha256:...",
    oauth: {
      resource: "https://my-mcp.example.com",
      authorizationServers: ["https://auth.example.com"],
      scopesSupported: ["read", "write"],
    },
  });
```

### Handling OAuth Metadata Requests (HTTP Transport)

If using HTTP transport, handle the metadata endpoint before your MCP handler:

```typescript
import { createServer } from "http";

const httpServer = createServer((req, res) => {
  // Handle OAuth metadata requests
  if (isOAuthMetadataRequest(req.url ?? "")) {
    handleOAuthMetadata?.(req, res);
    return;
  }
  
  // Handle MCP requests
  // ... your MCP handler
});
```

---

## Securing Tools with Security Schemes

### Public Tool (No Auth Required)

```typescript
toolWithUI({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({ location: z.string() }),
  component: "WeatherCard",
  securitySchemes: [{ type: "noauth" }],
  execute: async ({ location }) => {
    return fetchWeather(location);
  },
});
```

### Protected Tool (OAuth Required)

```typescript
toolWithUI({
  name: "get_user_profile",
  description: "Get the authenticated user's profile",
  parameters: z.object({}),
  component: "UserProfile",
  securitySchemes: [{ type: "oauth2", scopes: ["user:read"] }],
  execute: async (_args, context) => {
    if (!context?.auth?.isAuthenticated) {
      return OAuth.createMCPAuthError(
        "Sign in to view your profile",
        wwwAuthHelper.unauthorized()
      );
    }
    return fetchUserProfile(context.auth.claims?.sub);
  },
});
```

### Tool with Multiple Required Scopes

```typescript
toolWithUI({
  name: "delete_document",
  description: "Delete a document",
  parameters: z.object({ documentId: z.string() }),
  component: "DeleteConfirmation",
  securitySchemes: [{ type: "oauth2", scopes: ["documents:read", "documents:delete"] }],
  execute: async ({ documentId }, context) => {
    // Verify user has all required scopes
    const claims = context?.auth?.claims;
    const scopes = parseScopes(claims?.scope);
    
    if (!scopes.includes("documents:delete")) {
      return OAuth.createScopeUpgradeError(wwwAuthHelper, {
        requiredScopes: ["documents:delete"],
        message: "You need delete permission to remove documents",
      });
    }
    
    return deleteDocument(documentId);
  },
});

function parseScopes(scope: string | string[] | undefined): string[] {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope;
  return scope.split(" ");
}
```

### Optional Authentication

Tools can work both anonymously and authenticated:

```typescript
toolWithUI({
  name: "search_documents",
  description: "Search documents (more results when signed in)",
  parameters: z.object({ query: z.string() }),
  component: "SearchResults",
  securitySchemes: [
    { type: "noauth" },
    { type: "oauth2", scopes: ["documents:read"] },
  ],
  execute: async ({ query }, context) => {
    if (context?.auth?.isAuthenticated) {
      // Return user's private + public documents
      return searchDocuments(query, { userId: context.auth.claims?.sub });
    }
    // Return only public documents
    return searchDocuments(query, { publicOnly: true });
  },
});
```

---

## Token Validation

### Using the Built-in Token Validator

```typescript
import { OAuth } from "@assistant-ui/tool-ui-server";

// Create a validator from your OAuth config
const validator = OAuth.createTokenValidator({
  resource: "https://my-mcp.example.com",
  authorizationServers: ["https://auth.example.com"],
});

// Validate a token
async function validateToken(bearerToken: string) {
  const result = await validator.validate(bearerToken);
  
  if (!result.valid) {
    console.error("Token invalid:", result.error);
    return null;
  }
  
  console.log("User:", result.claims.sub);
  console.log("Scopes:", result.claims.scope);
  return result.claims;
}
```

### Custom Token Validator Configuration

```typescript
const validator = new OAuth.TokenValidator({
  jwks: {
    jwksUri: "https://auth.example.com/.well-known/jwks.json",
    cacheTtlMs: 60 * 60 * 1000, // 1 hour
    timeoutMs: 10 * 1000, // 10 seconds
  },
  issuer: "https://auth.example.com",
  audience: "https://my-mcp.example.com",
  clockSkewSeconds: 60, // Allow 60 seconds clock drift
});
```

### Checking Scopes

```typescript
const result = await validator.validate(token);

if (result.valid) {
  const hasReadScope = validator.hasScopes(result.claims, ["read"]);
  const hasAdminScope = validator.hasScopes(result.claims, ["admin"]);
  
  if (!hasReadScope) {
    // Request scope upgrade
  }
}
```

---

## Handling Authentication Errors

### Missing Token (401 Unauthorized)

When a request lacks authentication:

```typescript
import { OAuth } from "@assistant-ui/tool-ui-server";

const wwwAuthHelper = OAuth.createWWWAuthenticateHelper(oauthConfig);

// In your tool handler:
if (!context?.auth?.bearerToken) {
  return OAuth.createMCPAuthError(
    "Please sign in to continue",
    wwwAuthHelper.unauthorized()
  );
}
```

Generated `WWW-Authenticate` header:
```
Bearer error="invalid_request", error_description="Authorization required", 
resource_metadata="https://my-mcp.example.com/.well-known/oauth-protected-resource"
```

### Invalid Token (401 with invalid_token)

When a token is expired or malformed:

```typescript
const validationResult = await validator.validate(token);

if (!validationResult.valid) {
  return OAuth.createMCPAuthError(
    "Your session has expired. Please sign in again.",
    wwwAuthHelper.invalidToken(validationResult.error)
  );
}
```

### Insufficient Scope (403 Forbidden)

When a valid token lacks required scopes:

```typescript
const requiredScopes = ["documents:write"];

if (!validator.hasScopes(claims, requiredScopes)) {
  return OAuth.createMCPAuthError(
    "This action requires additional permissions",
    wwwAuthHelper.insufficientScope(requiredScopes)
  );
}
```

### Error Response Structure

All auth errors return an MCP-compliant structure:

```typescript
{
  content: [{ type: "text", text: "User-friendly error message" }],
  _meta: {
    "mcp/www_authenticate": ["Bearer error=\"...\", ..."]
  },
  isError: true
}
```

MCP clients (like ChatGPT) parse the `_meta["mcp/www_authenticate"]` field to trigger their OAuth UI.

---

## Scope Upgrades (Step-Up Auth)

Sometimes a user is authenticated but needs additional permissions for certain actions:

```typescript
import { OAuth } from "@assistant-ui/tool-ui-server";

toolWithUI({
  name: "export_all_data",
  description: "Export all user data (requires admin scope)",
  parameters: z.object({}),
  component: "ExportProgress",
  securitySchemes: [{ type: "oauth2", scopes: ["admin"] }],
  execute: async (_args, context) => {
    const claims = context?.auth?.claims;
    const currentScopes = parseScopes(claims?.scope);
    
    // User is authenticated but doesn't have admin scope
    if (!currentScopes.includes("admin")) {
      return OAuth.createScopeUpgradeError(wwwAuthHelper, {
        currentScopes,
        requiredScopes: ["admin"],
        message: "Data export requires administrator permissions. Please authorize additional access.",
      });
    }
    
    return startExport(claims?.sub);
  },
});
```

The client will prompt the user to re-authenticate with the additional scopes.

---

## Testing OAuth Flows

### Local Development Setup

#### 1. Use ngrok for HTTPS

OAuth requires HTTPS. Use ngrok to expose your local server:

```bash
# Terminal 1: Start your MCP server
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 3000
```

Update your OAuth config to use the ngrok URL:

```typescript
const oauthConfig: OAuthResourceServerConfig = {
  resource: "https://abc123.ngrok.io", // Your ngrok URL
  authorizationServers: ["https://my-tenant.auth0.com"],
};
```

#### 2. Register ngrok URL in Auth Provider

Add your ngrok callback URL to your OAuth provider's allowed callbacks:
- Auth0: **Applications > Your App > Allowed Callback URLs**
- Okta: **Applications > Your App > Sign-in redirect URIs**

### Testing with curl

#### Get Protected Resource Metadata

```bash
curl https://your-mcp.example.com/.well-known/oauth-protected-resource
```

#### Test with a Bearer Token

```bash
# Get a token from your auth provider (example with Auth0)
TOKEN=$(curl -s -X POST "https://YOUR_TENANT.auth0.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://your-mcp.example.com",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

# Call your MCP endpoint with the token
curl https://your-mcp.example.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "get_user_documents"}}'
```

### Unit Testing

```typescript
import { describe, it, expect } from "vitest";
import { OAuth } from "@assistant-ui/tool-ui-server";

describe("OAuth Security", () => {
  const config = {
    resource: "https://test.example.com",
    authorizationServers: ["https://auth.example.com"],
  };
  
  it("should generate valid WWW-Authenticate challenges", () => {
    const helper = OAuth.createWWWAuthenticateHelper(config);
    
    const challenge = helper.unauthorized();
    expect(challenge).toContain('error="invalid_request"');
    expect(challenge).toContain("resource_metadata=");
  });
  
  it("should create valid MCP auth errors", () => {
    const helper = OAuth.createWWWAuthenticateHelper(config);
    const error = OAuth.createMCPAuthError(
      "Please sign in",
      helper.unauthorized()
    );
    
    expect(error.isError).toBe(true);
    expect(error._meta["mcp/www_authenticate"]).toHaveLength(1);
  });
  
  it("should extract bearer tokens correctly", () => {
    const token = OAuth.extractBearerToken("Bearer abc123");
    expect(token).toBe("abc123");
    
    const noToken = OAuth.extractBearerToken("Basic abc123");
    expect(noToken).toBe(null);
  });
});
```

---

## Troubleshooting

### Common Issues

#### "Token validation failed: Unknown signing key"

**Cause**: The JWKS cache might be stale, or the token was signed with a rotated key.

**Solution**: The JWKS client automatically retries with fresh keys. If persists:
1. Clear the JWKS cache: `jwksClient.clearCache()`
2. Verify your JWKS endpoint is accessible
3. Check that the token's `kid` matches a key in your JWKS

#### "Invalid audience" error

**Cause**: The token's `aud` claim doesn't match your resource URL.

**Solution**:
1. Ensure your OAuth provider is configured with the correct audience
2. Verify your `resource` config matches exactly (including trailing slashes)

```typescript
// Auth0: Set audience when getting token
const token = await auth0.getToken({
  audience: "https://my-mcp.example.com" // Must match your resource config
});
```

#### OAuth metadata not returned

**Cause**: The metadata handler isn't being called.

**Solution**: Ensure you check for metadata requests before your MCP handler:

```typescript
// CORRECT: Check metadata first
if (isOAuthMetadataRequest(req.url)) {
  handleOAuthMetadata(req, res);
  return;
}
// Then handle MCP

// WRONG: MCP handler catches all requests first
```

#### CORS errors on metadata endpoint

The metadata endpoint includes CORS headers by default. If you're still seeing issues:
1. Check your reverse proxy isn't stripping headers
2. Ensure preflight (OPTIONS) requests are handled

### Debug Logging

```typescript
import { OAuth } from "@assistant-ui/tool-ui-server";

// Create validator with debug logging
const validator = new OAuth.TokenValidator({
  jwks: { jwksUri: "..." },
  issuer: "...",
  audience: "...",
});

// Validate and log results
const result = await validator.validate(token);
console.log("Validation result:", JSON.stringify(result, null, 2));

if (!result.valid) {
  console.log("Error:", result.error);
  console.log("Error code:", result.errorCode);
}
```

---

## API Reference

### Types

#### `SecurityScheme`

```typescript
type SecurityScheme = NoAuthSecurityScheme | OAuth2SecurityScheme;

interface NoAuthSecurityScheme {
  type: "noauth";
}

interface OAuth2SecurityScheme {
  type: "oauth2";
  scopes: string[];
}
```

#### `OAuthResourceServerConfig`

```typescript
interface OAuthResourceServerConfig {
  /** Your MCP server's canonical HTTPS URL */
  resource: string;
  
  /** Authorization servers that can issue tokens */
  authorizationServers: string[];
  
  /** All scopes supported by your server */
  scopesSupported?: string[];
  
  /** Link to API documentation */
  resourceDocumentation?: string;
  
  /** How tokens can be sent (default: ["header"]) */
  bearerMethodsSupported?: ("header" | "body" | "query")[];
}
```

#### `TokenClaims`

```typescript
interface TokenClaims {
  iss: string;           // Token issuer
  sub: string;           // User identifier
  aud: string | string[]; // Audience(s)
  exp: number;           // Expiration (Unix timestamp)
  iat: number;           // Issued at (Unix timestamp)
  nbf?: number;          // Not before (Unix timestamp)
  scope?: string | string[]; // Granted scopes
  [key: string]: unknown; // Additional claims
}
```

#### `ToolExecutionContext`

```typescript
interface ToolExecutionContext {
  auth?: AuthenticatedRequest;
  headers?: Record<string, string>;
}

interface AuthenticatedRequest {
  authorizationHeader?: string;
  bearerToken?: string;
  claims?: TokenClaims;
  isAuthenticated: boolean;
}
```

### Functions

#### `createWWWAuthenticateHelper(config)`

Creates a helper for generating WWW-Authenticate challenges.

```typescript
const helper = OAuth.createWWWAuthenticateHelper(config);

helper.unauthorized(description?);      // Missing token challenge
helper.invalidToken(description?);      // Invalid/expired token
helper.insufficientScope(scopes, desc?); // Missing required scopes
```

#### `createMCPAuthError(message, wwwAuthenticate)`

Creates an MCP-compliant error response that triggers client auth UI.

```typescript
const error = OAuth.createMCPAuthError(
  "User-friendly message",
  wwwAuthHelper.unauthorized()
);
```

#### `createScopeUpgradeError(helper, options)`

Creates an error for scope upgrade scenarios.

```typescript
const error = OAuth.createScopeUpgradeError(wwwAuthHelper, {
  currentScopes: ["read"],
  requiredScopes: ["read", "write"],
  message: "Writing requires additional permissions",
});
```

#### `createTokenValidator(config, jwksPath?)`

Creates a token validator from OAuth config.

```typescript
const validator = OAuth.createTokenValidator(config);
const result = await validator.validate(token);
```

#### `extractBearerToken(header)`

Extracts Bearer token from Authorization header.

```typescript
const token = OAuth.extractBearerToken("Bearer abc123"); // "abc123"
const noToken = OAuth.extractBearerToken("Basic xyz");   // null
```

### Schemas (Zod)

All types have corresponding Zod schemas for runtime validation:

```typescript
import {
  SecuritySchemeSchema,
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
  OAuthResourceServerConfigSchema,
  ProtectedResourceMetadataSchema,
} from "@assistant-ui/tool-ui-server";

// Validate configuration
const result = OAuthResourceServerConfigSchema.safeParse(config);
if (!result.success) {
  console.error("Invalid config:", result.error);
}
```

---

## Related Resources

- [MCP Authorization Specification](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/authorization/)
- [RFC 9728 - OAuth Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [RFC 6750 - Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750)
- [Auth0 API Authorization](https://auth0.com/docs/get-started/apis)
- [Okta Authorization Servers](https://developer.okta.com/docs/concepts/auth-servers/)
- [AWS Cognito Resource Servers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html)

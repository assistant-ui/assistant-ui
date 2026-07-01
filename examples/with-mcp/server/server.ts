/**
 * Standalone test MCP server with OAuth.
 *
 * - OAuth 2.1 authorization server (PKCE + DCR) via @modelcontextprotocol/sdk auth router.
 * - One MCP tool, `echo`, that returns its input.
 * - All state in memory; for local development / E2E only.
 *
 * Run: `pnpm dev:server` (defaults to http://localhost:8787)
 */
import express from "express";
import cors from "cors";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 8787);
const ISSUER = process.env.ISSUER ?? `http://localhost:${PORT}`;

// ───────────────────────────────────────────────────────────────────────────
// In-memory OAuth provider
// ───────────────────────────────────────────────────────────────────────────

type AuthorizationGrant = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  state?: string;
};

const clients = new Map<string, OAuthClientInformationFull>();
const authCodes = new Map<string, AuthorizationGrant>();
const tokens = new Map<string, AuthInfo>();
const refreshTokens = new Map<string, { clientId: string; scopes: string[] }>();

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    return clients.get(clientId);
  },
  async registerClient(client) {
    const clientId = `client_${randomUUID()}`;
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    clients.set(clientId, full);
    return full;
  },
};

const provider: OAuthServerProvider = {
  get clientsStore() {
    return clientsStore;
  },

  async authorize(client, params, res) {
    // Auto-approve for the test server.
    const code = randomBytes(24).toString("base64url");
    authCodes.set(code, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scopes: params.scopes ?? [],
      ...(params.state !== undefined ? { state: params.state } : {}),
    });

    const target = new URL(params.redirectUri);
    target.searchParams.set("code", code);
    if (params.state) target.searchParams.set("state", params.state);
    res.redirect(target.toString());
  },

  async challengeForAuthorizationCode(_client, authorizationCode) {
    const grant = authCodes.get(authorizationCode);
    if (!grant) throw new Error("invalid authorization code");
    return grant.codeChallenge;
  },

  async exchangeAuthorizationCode(
    client,
    authorizationCode,
  ): Promise<OAuthTokens> {
    const grant = authCodes.get(authorizationCode);
    if (!grant) throw new Error("invalid authorization code");
    if (grant.clientId !== client.client_id) {
      throw new Error("authorization code/client mismatch");
    }
    authCodes.delete(authorizationCode);

    const accessToken = randomBytes(32).toString("base64url");
    const refreshToken = randomBytes(32).toString("base64url");
    tokens.set(accessToken, {
      token: accessToken,
      clientId: client.client_id,
      scopes: grant.scopes,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    refreshTokens.set(refreshToken, {
      clientId: client.client_id,
      scopes: grant.scopes,
    });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 60 * 60,
      scope: grant.scopes.join(" "),
    };
  },

  async exchangeRefreshToken(
    client,
    refreshToken,
    scopes,
  ): Promise<OAuthTokens> {
    const grant = refreshTokens.get(refreshToken);
    if (!grant) throw new Error("invalid refresh token");
    if (grant.clientId !== client.client_id) {
      throw new Error("refresh token/client mismatch");
    }
    const newAccess = randomBytes(32).toString("base64url");
    const newRefresh = randomBytes(32).toString("base64url");
    const effectiveScopes = scopes ?? grant.scopes;
    refreshTokens.delete(refreshToken);
    tokens.set(newAccess, {
      token: newAccess,
      clientId: client.client_id,
      scopes: effectiveScopes,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    refreshTokens.set(newRefresh, {
      clientId: client.client_id,
      scopes: effectiveScopes,
    });
    return {
      access_token: newAccess,
      refresh_token: newRefresh,
      token_type: "Bearer",
      expires_in: 60 * 60,
      scope: effectiveScopes.join(" "),
    };
  },

  async verifyAccessToken(token): Promise<AuthInfo> {
    const info = tokens.get(token);
    if (!info) throw new Error("invalid access token");
    return info;
  },
};

// ───────────────────────────────────────────────────────────────────────────
// MCP server
// ───────────────────────────────────────────────────────────────────────────

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "aui-mcp-test", version: "0.0.1" });
  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Echo back the provided text.",
      inputSchema: { text: z.string().describe("Text to echo back") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ text }) => ({
      content: [{ type: "text" as const, text: `echo: ${text}` }],
    }),
  );
  server.registerTool(
    "fingerprint",
    {
      title: "Fingerprint",
      description:
        "Return a deterministic fingerprint of a string (sha256 hex).",
      inputSchema: { input: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ input }) => ({
      content: [
        {
          type: "text" as const,
          text: createHash("sha256").update(input).digest("hex"),
        },
      ],
    }),
  );
  return server;
}

// ───────────────────────────────────────────────────────────────────────────
// Express wiring
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: false,
      // Without these the browser won't expose MCP session/auth headers.
      exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Mcp-Session-Id",
        "Accept",
        "mcp-protocol-version",
      ],
    }),
  );

  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(ISSUER),
      scopesSupported: ["mcp"],
      resourceName: "aui-mcp-test",
    }),
  );

  const bearer = requireBearerAuth({ verifier: provider });

  app.post("/mcp", bearer, async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => transport.close());
      const server = buildMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP request error:", err);
      if (!res.headersSent) res.status(500).end();
    }
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`MCP test server listening on ${ISSUER}`);
    console.log(
      `  - OAuth metadata: ${ISSUER}/.well-known/oauth-authorization-server`,
    );
    console.log(`  - MCP endpoint:   ${ISSUER}/mcp`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

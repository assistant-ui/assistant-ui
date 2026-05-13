/**
 * OAuthServerProvider implementation that proxies to GitHub.
 *
 * Why a proxy and not just declaring GitHub as the OAuth server?
 * - GitHub OAuth doesn't support RFC 7591 dynamic client registration. MCP
 *   clients expect DCR; without it, every client has to be pre-registered.
 * - GitHub doesn't issue PKCE-bound auth codes for public clients in a way
 *   that interoperates cleanly with the MCP SDK.
 * - We need a stable callback URL pre-registered with GitHub. Our server
 *   uses one fixed callback; the per-client redirect_uri is honored
 *   internally and applied at the final hop.
 *
 * Flow:
 *   client → /authorize (with PKCE, redirect_uri=client-cb)
 *           → we save the grant, redirect user to GitHub OAuth
 *   GitHub → /oauth/github/callback (our pre-registered URL)
 *           → we look up the grant by `state`, swap GitHub code for GitHub
 *             token, store it under our own auth code, redirect to the
 *             client-cb with our auth code
 *   client → POST /token (with code + verifier)
 *           → we verify PKCE, mint our own access token bound to the
 *             stored GitHub user + token, return it
 *   client → GET /mcp (Authorization: Bearer <our-token>)
 *           → bearer middleware verifies, we attach GitHub user info to
 *             req.auth so tools can call api.github.com
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import express from "express";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export type GithubAuthExtras = {
  githubUserId: number;
  githubLogin: string;
  githubAccessToken: string;
};

type AuthInfoWithGithub = AuthInfo & { extra: GithubAuthExtras };

type AuthorizationGrant = {
  clientId: string;
  clientRedirectUri: string;
  clientState?: string;
  codeChallenge: string;
  scopes: string[];
  // Once GitHub returns and we mint our auth code, these are filled in:
  githubUserId?: number;
  githubLogin?: string;
  githubAccessToken?: string;
};

const clientsByGrantState = new Map<string, AuthorizationGrant>(); // state issued to GitHub
const clientsByOurCode = new Map<string, AuthorizationGrant>(); // code we return to client

const clientsStoreMap = new Map<string, OAuthClientInformationFull>();
const tokens = new Map<string, AuthInfoWithGithub>();
const refreshTokens = new Map<
  string,
  { clientId: string; scopes: string[]; extras: GithubAuthExtras }
>();

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    return clientsStoreMap.get(clientId);
  },
  async registerClient(client) {
    const clientId = `aui_${randomUUID()}`;
    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    clientsStoreMap.set(clientId, full);
    return full;
  },
};

type ProviderOptions = {
  githubClientId: string;
  githubClientSecret: string;
  serverOrigin: string;
};

export function createGithubOAuthProvider(
  opts: ProviderOptions,
): OAuthServerProvider {
  const githubCallback = `${opts.serverOrigin}/oauth/github/callback`;

  const provider: OAuthServerProvider = {
    get clientsStore() {
      return clientsStore;
    },

    async authorize(client, params, res) {
      const ourState = randomBytes(24).toString("base64url");
      clientsByGrantState.set(ourState, {
        clientId: client.client_id,
        clientRedirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        scopes: params.scopes ?? [],
        ...(params.state !== undefined ? { clientState: params.state } : {}),
      });

      const ghUrl = new URL("https://github.com/login/oauth/authorize");
      ghUrl.searchParams.set("client_id", opts.githubClientId);
      ghUrl.searchParams.set("redirect_uri", githubCallback);
      // Translate MCP scopes to GitHub scopes. We just need `read:user`
      // and `repo` for the demo tools (public + private repos read).
      ghUrl.searchParams.set("scope", "read:user repo");
      ghUrl.searchParams.set("state", ourState);
      res.redirect(ghUrl.toString());
    },

    async challengeForAuthorizationCode(_client, authorizationCode) {
      const grant = clientsByOurCode.get(authorizationCode);
      if (!grant) throw new Error("invalid authorization code");
      return grant.codeChallenge;
    },

    async exchangeAuthorizationCode(client, code): Promise<OAuthTokens> {
      const grant = clientsByOurCode.get(code);
      if (!grant) throw new Error("invalid authorization code");
      if (grant.clientId !== client.client_id) {
        throw new Error("authorization code/client mismatch");
      }
      if (
        !grant.githubAccessToken ||
        !grant.githubLogin ||
        grant.githubUserId === undefined
      ) {
        throw new Error("authorization code has no associated GitHub session");
      }
      clientsByOurCode.delete(code);

      return mintTokens(client.client_id, grant.scopes, {
        githubUserId: grant.githubUserId,
        githubLogin: grant.githubLogin,
        githubAccessToken: grant.githubAccessToken,
      });
    },

    async exchangeRefreshToken(
      client,
      refreshToken,
      scopes,
    ): Promise<OAuthTokens> {
      const entry = refreshTokens.get(refreshToken);
      if (!entry) throw new Error("invalid refresh token");
      if (entry.clientId !== client.client_id) {
        throw new Error("refresh token/client mismatch");
      }
      refreshTokens.delete(refreshToken);
      return mintTokens(client.client_id, scopes ?? entry.scopes, entry.extras);
    },

    async verifyAccessToken(token): Promise<AuthInfo> {
      const info = tokens.get(token);
      if (!info) throw new Error("invalid access token");
      return info;
    },
  };

  // ─── Express handler for the GitHub callback (pre-registered with GitHub) ──
  const githubCallbackRouter = express.Router();
  githubCallbackRouter.get(
    "/oauth/github/callback",
    async (req: Request, res: Response) => {
      const state = String(req.query.state ?? "");
      const ghCode = String(req.query.code ?? "");
      const error = String(req.query.error ?? "");
      const grant = clientsByGrantState.get(state);
      if (!grant) {
        res.status(400).type("text/plain").send("Unknown OAuth state");
        return;
      }
      clientsByGrantState.delete(state);

      const redirectBack = new URL(grant.clientRedirectUri);
      if (grant.clientState)
        redirectBack.searchParams.set("state", grant.clientState);

      if (error) {
        redirectBack.searchParams.set("error", error);
        const desc = req.query.error_description;
        if (typeof desc === "string") {
          redirectBack.searchParams.set("error_description", desc);
        }
        res.redirect(redirectBack.toString());
        return;
      }

      try {
        // Exchange code with GitHub
        const tokenResp = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: opts.githubClientId,
              client_secret: opts.githubClientSecret,
              code: ghCode,
              redirect_uri: githubCallback,
            }),
          },
        );
        const tokenJson = (await tokenResp.json()) as {
          access_token?: string;
          error?: string;
          error_description?: string;
        };
        if (!tokenJson.access_token) {
          const msg =
            tokenJson.error_description ??
            tokenJson.error ??
            "github exchange failed";
          redirectBack.searchParams.set("error", "server_error");
          redirectBack.searchParams.set("error_description", msg);
          res.redirect(redirectBack.toString());
          return;
        }

        // Fetch user info to bind to our token
        const userResp = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokenJson.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "aui-mcp-showcase",
          },
        });
        const user = (await userResp.json()) as { id: number; login: string };

        // Mint our own auth code bound to this GitHub session
        const ourCode = randomBytes(24).toString("base64url");
        grant.githubAccessToken = tokenJson.access_token;
        grant.githubLogin = user.login;
        grant.githubUserId = user.id;
        clientsByOurCode.set(ourCode, grant);

        redirectBack.searchParams.set("code", ourCode);
        res.redirect(redirectBack.toString());
      } catch (err) {
        redirectBack.searchParams.set("error", "server_error");
        redirectBack.searchParams.set(
          "error_description",
          err instanceof Error ? err.message : String(err),
        );
        res.redirect(redirectBack.toString());
      }
    },
  );

  return Object.assign(provider, { _githubCallback: githubCallbackRouter });
}

function mintTokens(
  clientId: string,
  scopes: string[],
  extras: GithubAuthExtras,
): OAuthTokens {
  const access = randomBytes(32).toString("base64url");
  const refresh = randomBytes(32).toString("base64url");
  tokens.set(access, {
    token: access,
    clientId,
    scopes,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
    extra: extras,
  });
  refreshTokens.set(refresh, { clientId, scopes, extras });
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: "Bearer",
    expires_in: 60 * 60,
    scope: scopes.join(" "),
  };
}

/** Resolves the GitHub session bound to the verified bearer token. */
export function getGithubAuth(
  authInfo: AuthInfo | undefined,
): GithubAuthExtras | null {
  const extras = authInfo?.extra as GithubAuthExtras | undefined;
  if (!extras?.githubAccessToken) return null;
  return extras;
}

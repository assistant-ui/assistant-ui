/**
 * GitHub MCP showcase server.
 *
 * - OAuth proxy to GitHub (PKCE + DCR on the MCP side; OAuth web flow on the
 *   GitHub side). See ./oauth.ts.
 * - Tools that wrap a slice of the GitHub REST API and return MCP Apps
 *   (HTML widgets) for visualization-friendly results.
 * - Single Express server on PORT (default 8788).
 */
import express from "express";
import cors from "cors";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  createGithubOAuthProvider,
  getGithubAuth,
  type GithubAuthExtras,
} from "./oauth";
import {
  listUserRepos,
  getRepoLanguages,
  getCommitActivity,
  listPullRequests,
} from "./github";
import { LANGUAGE_PIE_HTML } from "./widgets/languagePie";
import { COMMIT_HEATMAP_HTML } from "./widgets/commitHeatmap";
import { PR_LANES_HTML } from "./widgets/prLanes";

const PORT = Number(process.env.PORT ?? 8788);
const ORIGIN = process.env.MCP_SERVER_ORIGIN ?? `http://localhost:${PORT}`;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error(
    "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set. See .env.example.",
  );
  process.exit(1);
}

const provider = createGithubOAuthProvider({
  githubClientId: GITHUB_CLIENT_ID,
  githubClientSecret: GITHUB_CLIENT_SECRET,
  serverOrigin: ORIGIN,
});

const MIME = "text/html;profile=mcp-app";

const URIS = {
  languagePie: "ui://aui-github-mcp/language-pie.html",
  commitHeatmap: "ui://aui-github-mcp/commit-heatmap.html",
  prLanes: "ui://aui-github-mcp/pr-lanes.html",
} as const;

const RESOURCE_BODIES: Record<string, string> = {
  [URIS.languagePie]: LANGUAGE_PIE_HTML,
  [URIS.commitHeatmap]: COMMIT_HEATMAP_HTML,
  [URIS.prLanes]: PR_LANES_HTML,
};

function requireGithub(authInfo: AuthInfo | undefined): GithubAuthExtras {
  const gh = getGithubAuth(authInfo);
  if (!gh) {
    throw new Error("No GitHub session bound to this MCP token");
  }
  return gh;
}

function buildMcpServer(authInfo: AuthInfo | undefined): McpServer {
  const server = new McpServer({ name: "aui-github-mcp", version: "0.0.1" });

  // ─── Resources (one per widget) ──────────────────────────────────────
  for (const [uri, html] of Object.entries(RESOURCE_BODIES)) {
    const name = uri.split("/").pop() ?? uri;
    server.registerResource(name, uri, { mimeType: MIME }, async () => ({
      contents: [{ uri, mimeType: MIME, text: html }],
    }));
  }

  // ─── whoami ──────────────────────────────────────────────────────────
  server.registerTool(
    "whoami",
    {
      description: "Return the authenticated GitHub user.",
      inputSchema: {},
    },
    async () => {
      const gh = requireGithub(authInfo);
      return {
        content: [
          {
            type: "text",
            text: `Authenticated as @${gh.githubLogin} (id ${gh.githubUserId}).`,
          },
        ],
        structuredContent: { login: gh.githubLogin, id: gh.githubUserId },
      };
    },
  );

  // ─── list_repos ──────────────────────────────────────────────────────
  server.registerTool(
    "list_repos",
    {
      description:
        "List the authenticated user's accessible repositories (owner, collaborator, org).",
      inputSchema: {
        sort: z
          .enum(["pushed", "created", "full_name"])
          .optional()
          .describe("Sort order. Default: pushed."),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ sort, limit }) => {
      const gh = requireGithub(authInfo);
      const repos = await listUserRepos(gh.githubAccessToken, {
        ...(sort !== undefined ? { sort } : {}),
        ...(limit !== undefined ? { perPage: limit } : {}),
      });
      const summary = repos
        .slice(0, 20)
        .map(
          (r) =>
            `${r.full_name}${r.private ? " (private)" : ""} · ★${r.stargazers_count} · ${r.language ?? "—"}${r.description ? ` · ${r.description}` : ""}`,
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text:
              repos.length === 0
                ? "No repositories."
                : `${repos.length} repositories:\n${summary}`,
          },
        ],
        structuredContent: {
          repos: repos.map((r) => ({
            full_name: r.full_name,
            stars: r.stargazers_count,
            language: r.language,
            private: r.private,
            pushed_at: r.pushed_at,
          })),
        },
      };
    },
  );

  // ─── repo_languages (with MCP App) ───────────────────────────────────
  server.registerTool(
    "repo_languages",
    {
      description:
        "Get the byte-level language breakdown of a repo as a pie chart.",
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
      },
      _meta: { "ui/resourceUri": URIS.languagePie },
    },
    async ({ owner, repo }) => {
      const gh = requireGithub(authInfo);
      const langs = await getRepoLanguages(gh.githubAccessToken, owner, repo);
      const total = Object.values(langs).reduce((s, v) => s + v, 0);
      const summary = Object.entries(langs)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([name, bytes]) =>
            `${name}: ${((bytes / Math.max(1, total)) * 100).toFixed(1)}%`,
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text:
              total === 0
                ? `No language data for ${owner}/${repo}.`
                : `Language breakdown for ${owner}/${repo}:\n${summary}`,
          },
        ],
        structuredContent: { repo: `${owner}/${repo}`, languages: langs },
        _meta: { "ui/resourceUri": URIS.languagePie },
      };
    },
  );

  // ─── commit_activity (with MCP App) ──────────────────────────────────
  server.registerTool(
    "commit_activity",
    {
      description:
        "Return the 52-week commit activity for a repo as a GitHub-style heatmap.",
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
      },
      _meta: { "ui/resourceUri": URIS.commitHeatmap },
    },
    async ({ owner, repo }) => {
      const gh = requireGithub(authInfo);
      const weeks = await getCommitActivity(gh.githubAccessToken, owner, repo);
      const total = weeks.reduce((s, w) => s + w.total, 0);
      return {
        content: [
          {
            type: "text",
            text:
              weeks.length === 0
                ? `GitHub is computing stats for ${owner}/${repo}; try again in a moment.`
                : `Commit activity for ${owner}/${repo}: ${total} commits across the last 52 weeks.`,
          },
        ],
        structuredContent: { repo: `${owner}/${repo}`, weeks },
        _meta: { "ui/resourceUri": URIS.commitHeatmap },
      };
    },
  );

  // ─── list_pull_requests (with MCP App) ───────────────────────────────
  server.registerTool(
    "list_pull_requests",
    {
      description:
        "List pull requests for a repo. Returns a two-lane (ready / draft) widget.",
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
      },
      _meta: { "ui/resourceUri": URIS.prLanes },
    },
    async ({ owner, repo, state }) => {
      const gh = requireGithub(authInfo);
      const prs = await listPullRequests(gh.githubAccessToken, owner, repo, {
        ...(state !== undefined ? { state } : {}),
      });
      const summary =
        prs.length === 0
          ? `No ${state ?? "open"} PRs in ${owner}/${repo}.`
          : `${prs.length} ${state ?? "open"} PRs:\n` +
            prs
              .slice(0, 20)
              .map(
                (p) =>
                  `#${p.number} ${p.draft ? "(draft) " : ""}${p.title} — @${p.user.login}`,
              )
              .join("\n");
      return {
        content: [{ type: "text", text: summary }],
        structuredContent: {
          repo: `${owner}/${repo}`,
          prs: prs.map((p) => ({
            number: p.number,
            title: p.title,
            draft: p.draft,
            user: p.user,
            labels: p.labels,
            html_url: p.html_url,
          })),
        },
        _meta: { "ui/resourceUri": URIS.prLanes },
      };
    },
  );

  return server;
}

// ─── Express wiring ─────────────────────────────────────────────────────
async function main() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: false,
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

  // GitHub callback (pre-registered with the GitHub OAuth app).
  app.use(
    (provider as unknown as { _githubCallback: express.Router })
      ._githubCallback,
  );

  // MCP-side OAuth endpoints (metadata, /authorize, /token, /register, /revoke).
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(ORIGIN),
      scopesSupported: ["mcp", "repo"],
      resourceName: "aui-github-mcp",
    }),
  );

  const bearer = requireBearerAuth({ verifier: provider });

  app.post("/mcp", bearer, async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on("close", () => transport.close());
      const server = buildMcpServer(req.auth);
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("MCP request error:", err);
      if (!res.headersSent) res.status(500).end();
    }
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`GitHub MCP showcase listening on ${ORIGIN}`);
    console.log(
      `  - OAuth metadata: ${ORIGIN}/.well-known/oauth-authorization-server`,
    );
    console.log(`  - MCP endpoint:   ${ORIGIN}/mcp`);
    console.log(
      `  - GitHub callback: ${ORIGIN}/oauth/github/callback (register this with your GitHub OAuth app)`,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

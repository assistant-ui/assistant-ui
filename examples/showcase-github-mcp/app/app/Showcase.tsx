"use client";

import { useState } from "react";
import {
  McpManagerPrimitive,
  McpServerPrimitive,
} from "@assistant-ui/react-mcp";
import { useAuiState } from "@assistant-ui/store";
import {
  MCPAppFrame,
  type MCPAppMetadata,
  type MCPAppResource,
} from "@assistant-ui/react";
import { MCPAppFromCallButton } from "./ToolButton";

type ToolResult = {
  toolName: string;
  args: unknown;
  raw: {
    content?: { type: string; text?: string }[];
    structuredContent?: unknown;
    _meta?: Record<string, unknown>;
  };
  app: MCPAppMetadata | null;
  resource: MCPAppResource | null;
};

export function Showcase() {
  const [result, setResult] = useState<ToolResult | null>(null);
  const [owner, setOwner] = useState("vercel");
  const [repo, setRepo] = useState("ai");

  return (
    <McpManagerPrimitive.Root>
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Connect</h2>
        <McpManagerPrimitive.Connectors>
          <ConnectCard />
        </McpManagerPrimitive.Connectors>
      </section>

      <McpManagerPrimitive.Connectors>
        <ConnectedOnly>
          <section style={{ marginBottom: 24 }}>
            <h2>Try a tool</h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <MCPAppFromCallButton
                toolName="whoami"
                args={{}}
                onResult={setResult}
              >
                whoami
              </MCPAppFromCallButton>
              <MCPAppFromCallButton
                toolName="list_repos"
                args={{ limit: 30 }}
                onResult={setResult}
              >
                list_repos
              </MCPAppFromCallButton>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13 }}>Repo:</span>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                style={input}
                placeholder="owner"
                aria-label="owner"
              />
              <span>/</span>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                style={input}
                placeholder="repo"
                aria-label="repo"
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <MCPAppFromCallButton
                toolName="repo_languages"
                args={{ owner, repo }}
                onResult={setResult}
              >
                repo_languages
              </MCPAppFromCallButton>
              <MCPAppFromCallButton
                toolName="commit_activity"
                args={{ owner, repo }}
                onResult={setResult}
              >
                commit_activity
              </MCPAppFromCallButton>
              <MCPAppFromCallButton
                toolName="list_pull_requests"
                args={{ owner, repo }}
                onResult={setResult}
              >
                list_pull_requests
              </MCPAppFromCallButton>
            </div>
          </section>

          {result && (
            <section>
              <h2>
                Result — <code>{result.toolName}</code>
              </h2>
              {result.raw.content?.map(
                (c, i) =>
                  c.type === "text" && (
                    <pre
                      key={i}
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        background: "#f6f8fa",
                        padding: 12,
                        borderRadius: 6,
                        margin: "0 0 12px",
                        fontSize: 12,
                      }}
                    >
                      {c.text}
                    </pre>
                  ),
              )}

              {result.app && result.resource && (
                <MCPAppFrame
                  app={result.app}
                  resource={result.resource}
                  input={result.args}
                  output={result.raw}
                  sandbox={{
                    sandbox: [
                      "allow-scripts",
                      "allow-same-origin-disabled-cors",
                    ],
                  }}
                />
              )}
            </section>
          )}
        </ConnectedOnly>
      </McpManagerPrimitive.Connectors>
    </McpManagerPrimitive.Root>
  );
}

const input: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid #d0d7de",
  borderRadius: 4,
  fontSize: 13,
  width: 140,
};

function ConnectedOnly({ children }: { children: React.ReactNode }) {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  if (state !== "connected") return null;
  return <>{children}</>;
}

function ConnectCard() {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  return (
    <McpServerPrimitive.Root
      style={{
        padding: 16,
        border: "1px solid #d0d7de",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background:
          state === "connected" ? "rgba(46, 160, 67, 0.06)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>
          <McpServerPrimitive.Name />
        </strong>
        <span
          style={{
            padding: "2px 8px",
            background: "#eef",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <McpServerPrimitive.Status />
        </span>
      </div>
      <McpServerPrimitive.Error style={{ color: "#cc0000", fontSize: 12 }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <McpServerPrimitive.ConnectButton style={btn}>
          Connect with GitHub
        </McpServerPrimitive.ConnectButton>
        <McpServerPrimitive.OAuthLink style={oauthLink}>
          Authorize on GitHub ↗
        </McpServerPrimitive.OAuthLink>
        <McpServerPrimitive.DisconnectButton style={btn}>
          Disconnect
        </McpServerPrimitive.DisconnectButton>
      </div>
    </McpServerPrimitive.Root>
  );
}

const btn: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #d0d7de",
  borderRadius: 6,
  background: "#f6f8fa",
  cursor: "pointer",
  fontSize: 13,
};

const oauthLink: React.CSSProperties = {
  padding: "6px 12px",
  background: "#1f883d",
  color: "white",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 13,
};

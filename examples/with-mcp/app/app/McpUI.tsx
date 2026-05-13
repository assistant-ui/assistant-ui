"use client";

import { useId, useState } from "react";
import {
  McpManagerPrimitive,
  McpServerPrimitive,
  McpAddFormPrimitive,
  useMcpTools,
  useMcpManager,
} from "@assistant-ui/react-mcp";

export function McpUI() {
  const [showForm, setShowForm] = useState(false);
  const nameId = useId();
  const urlId = useId();
  const authId = useId();

  return (
    <McpManagerPrimitive.Root>
      <section>
        <h2>Connectors</h2>
        <McpManagerPrimitive.Connectors>
          <ServerCard />
        </McpManagerPrimitive.Connectors>
      </section>

      <section>
        <h2>Custom servers</h2>
        <McpManagerPrimitive.CustomServers>
          <ServerCard />
        </McpManagerPrimitive.CustomServers>
        <McpManagerPrimitive.AddCustomTrigger
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Hide form" : "Add custom server"}
        </McpManagerPrimitive.AddCustomTrigger>

        {showForm && (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid #ccc" }}>
            <McpAddFormPrimitive.Root onSubmitted={() => setShowForm(false)}>
              <Row>
                <label htmlFor={nameId}>Name</label>
                <McpAddFormPrimitive.NameField id={nameId} style={inputStyle} />
              </Row>
              <Row>
                <label htmlFor={urlId}>URL</label>
                <McpAddFormPrimitive.UrlField id={urlId} style={inputStyle} />
              </Row>
              <Row>
                <label htmlFor={authId}>Auth</label>
                <McpAddFormPrimitive.AuthSelect
                  id={authId}
                  style={inputStyle}
                />
              </Row>
              <Row>
                <span>Auth fields</span>
                <McpAddFormPrimitive.AuthFields />
              </Row>
              <McpAddFormPrimitive.Error
                style={{ color: "red", marginTop: 8 }}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <McpAddFormPrimitive.Submit>Add</McpAddFormPrimitive.Submit>
                <McpAddFormPrimitive.Cancel onClick={() => setShowForm(false)}>
                  Cancel
                </McpAddFormPrimitive.Cancel>
              </div>
            </McpAddFormPrimitive.Root>
          </div>
        )}
      </section>

      <section>
        <h2>Tools</h2>
        <ToolsList />
      </section>
    </McpManagerPrimitive.Root>
  );
}

const inputStyle = {
  width: "100%",
  padding: 6,
  boxSizing: "border-box" as const,
};

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function ServerCard() {
  return (
    <McpServerPrimitive.Root
      style={{
        padding: 12,
        border: "1px solid #ccc",
        borderRadius: 6,
        marginBottom: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <McpServerPrimitive.Icon style={{ width: 24, height: 24 }} />
        <strong>
          <McpServerPrimitive.Name />
        </strong>
        <span
          style={{
            padding: "2px 8px",
            background: "#eee",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <McpServerPrimitive.Status />
        </span>
      </div>
      <McpServerPrimitive.Error style={{ color: "red" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <McpServerPrimitive.ConnectButton>
          Connect
        </McpServerPrimitive.ConnectButton>
        <McpServerPrimitive.OAuthLink
          style={{
            display: "inline-block",
            padding: "4px 10px",
            background: "#0066ff",
            color: "white",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Authorize ↗
        </McpServerPrimitive.OAuthLink>
        <McpServerPrimitive.DisconnectButton>
          Disconnect
        </McpServerPrimitive.DisconnectButton>
        <McpServerPrimitive.RemoveButton>
          Remove
        </McpServerPrimitive.RemoveButton>
      </div>
      <McpServerPrimitive.Tools>
        <li>
          <McpServerPrimitive.ToolName />
        </li>
      </McpServerPrimitive.Tools>
    </McpServerPrimitive.Root>
  );
}

function ToolsList() {
  const { tools } = useMcpTools();
  const mcp = useMcpManager();
  const [result, setResult] = useState<string>("");

  const entries = Object.entries(tools);
  if (entries.length === 0) return <p>(no connected tools)</p>;
  return (
    <div>
      <ul>
        {entries.map(([key, t]) => (
          <li key={key}>
            <code>{key}</code>{" "}
            <button
              type="button"
              onClick={async () => {
                try {
                  const out = await mcp
                    .server({ id: t.serverId })
                    .callTool(t.name, { text: "hello", input: "hello" });
                  setResult(JSON.stringify(out, null, 2));
                } catch (err) {
                  setResult(String(err));
                }
              }}
            >
              Call
            </button>
          </li>
        ))}
      </ul>
      {result && (
        <pre
          style={{
            background: "#f5f5f5",
            padding: 8,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}

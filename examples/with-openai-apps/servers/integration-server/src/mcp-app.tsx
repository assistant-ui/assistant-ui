/**
 * @file App that demonstrates a few features using MCP Apps SDK + React.
 */
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./mcp-app.module.css";

const IMPLEMENTATION = { name: "Get Time App", version: "1.0.0" };

const log = {
  info: console.log.bind(console, "[APP]"),
  warn: console.warn.bind(console, "[APP]"),
  error: console.error.bind(console, "[APP]"),
};

function extractTime(callToolResult: CallToolResult): string {
  const text = callToolResult
    .content!.filter(
      (c): c is { type: "text"; text: string } => c.type === "text",
    )
    .map((c) => c.text)
    .join("");
  const { time } = JSON.parse(text) as { time: string };
  return time;
}

function GetTimeApp() {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [hostContext, setHostContext] = useState<
    McpUiHostContext | undefined
  >();
  const { app, error } = useApp({
    appInfo: IMPLEMENTATION,
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => {
        log.info("App is being torn down");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate cleanup work
        log.info("App teardown complete");
        return {};
      };
      app.ontoolinput = async (input) => {
        log.info("Received tool call input:", input);
      };

      app.ontoolresult = async (result) => {
        log.info("Received tool call result:", result);
        setToolResult(result);
      };

      app.onerror = log.error;

      app.onhostcontextchanged = (params) => {
        setHostContext((prev) => ({ ...prev, ...params }));
      };
    },
  });

  useEffect(() => {
    if (app) {
      setHostContext(app.getHostContext());
    }
  }, [app]);

  if (error)
    return (
      <div>
        <strong>ERROR:</strong> {error.message}
      </div>
    );
  if (!app) return <div>Connecting...</div>;

  return (
    <GetTimeAppInner
      app={app}
      toolResult={toolResult}
      hostContext={hostContext}
    />
  );
}

interface GetTimeAppInnerProps {
  app: App;
  toolResult: CallToolResult | null;
  hostContext?: McpUiHostContext;
}
function GetTimeAppInner({
  app,
  toolResult,
  hostContext,
}: GetTimeAppInnerProps) {
  const [serverTime, setServerTime] = useState("Loading...");
  const [messageText, setMessageText] = useState("This is message text.");
  const [logText, setLogText] = useState("This is log text.");
  const [linkUrl, setLinkUrl] = useState("https://modelcontextprotocol.io/");

  useEffect(() => {
    if (toolResult) {
      setServerTime(extractTime(toolResult));
    }
  }, [toolResult]);

  const handleGetTime = useCallback(async () => {
    try {
      log.info("Calling get-time tool...");
      const result = await app.callServerTool({
        name: "get-time",
        arguments: {},
      });
      log.info("get-time result:", result);
      setServerTime(extractTime(result));
    } catch (e) {
      log.error(e);
      setServerTime("[ERROR]");
    }
  }, [app]);

  const handleSendMessage = useCallback(async () => {
    const signal = AbortSignal.timeout(5000);
    try {
      log.info("Sending message text to Host:", messageText);
      const { isError } = await app.sendMessage(
        { role: "user", content: [{ type: "text", text: messageText }] },
        { signal },
      );
      log.info("Message", isError ? "rejected" : "accepted");
    } catch (e) {
      log.error("Message send error:", signal.aborted ? "timed out" : e);
    }
  }, [app, messageText]);

  const handleSendLog = useCallback(async () => {
    log.info("Sending log text to Host:", logText);
    await app.sendLog({ level: "info", data: logText });
  }, [app, logText]);

  const handleOpenLink = useCallback(async () => {
    log.info("Sending open link request to Host:", linkUrl);
    const { isError } = await app.openLink({ url: linkUrl });
    log.info("Open link request", isError ? "rejected" : "accepted");
  }, [app, linkUrl]);

  return (
    <main
      className={styles.main}
      style={{
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <p className={styles.notice}>Watch activity in the DevTools console!</p>

      <div className={styles.action}>
        <p>
          <strong>Server Time:</strong>{" "}
          <code id="server-time">{serverTime}</code>
        </p>
        <button onClick={handleGetTime}>Get Server Time</button>
      </div>

      <div className={styles.action}>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send Message</button>
      </div>

      <div className={styles.action}>
        <input
          type="text"
          value={logText}
          onChange={(e) => setLogText(e.target.value)}
        />
        <button onClick={handleSendLog}>Send Log</button>
      </div>

      <div className={styles.action}>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <button onClick={handleOpenLink}>Open Link</button>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GetTimeApp />
  </StrictMode>,
);

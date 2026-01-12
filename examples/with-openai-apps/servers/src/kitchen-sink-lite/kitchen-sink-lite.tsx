/**
 * Kitchen Sink Lite widget.
 *
 * Demonstrates the window.openai surface end-to-end:
 * - Reads toolInput/toolOutput/toolResponseMetadata/userAgent.
 * - Persists widget state via setWidgetState (note + highlight) and shows it live.
 * - Calls tools from the widget (refresh + arbitrary tool invocation).
 * - Uses host helpers: requestDisplayMode, openExternal, sendFollowUpMessage, requestModal, requestClose.
 * - Embeds an iframe, runs a simple fetch demo, and logs host calls.
 *
 * Styling uses Apps SDK UI components/tokens with minimal custom CSS for code sizing.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { CodeBlock } from "@openai/apps-sdk-ui/components/CodeBlock";
import { Checkbox } from "@openai/apps-sdk-ui/components/Checkbox";
import { Input } from "@openai/apps-sdk-ui/components/Input";
import { Textarea } from "@openai/apps-sdk-ui/components/Textarea";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import type { DisplayMode, Theme } from "../types";

type DemoContent = {
  message: string;
  accentColor?: string;
  details?: string;
  fromTool?: string;
};

type DemoWidgetState = {
  note: string;
  highlight: boolean;
  savedAt: string;
};

const fallbackContent: DemoContent = {
  message:
    "Run the MCP tool to hydrate this widget. The structured content shows up here.",
  accentColor: "#2d6cdf",
  details: "This is placeholder content shown when no tool output is present.",
  fromTool: "widget shell",
};

// Lightweight card wrapper that keeps the layout aligned with the Apps SDK UI tokens.
function Card({
  title,
  children,
  apiLabel,
  description,
}: {
  title: string;
  children: React.ReactNode;
  apiLabel?: string;
  description?: string;
}) {
  return (
    <section className="border border-default rounded-xl bg-surface shadow-sm p-4 flex flex-col gap-3">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/80 inline-block" />
          {apiLabel ? (
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-subtle px-2 py-1 font-mono text-[11px] text-primary/80">
              {apiLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-sm font-semibold text-primary leading-tight truncate">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-secondary leading-snug">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function PillRow({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2 text-sm">
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-primary">{value ?? "—"}</span>
    </div>
  );
}

export default function KitchenSinkLite() {
  const toolOutput = (useOpenAiGlobal("toolOutput") ??
    null) as DemoContent | null;
  const toolInput = useOpenAiGlobal("toolInput") as Record<string, unknown>;
  const toolResponseMetadata = useOpenAiGlobal(
    "toolResponseMetadata"
  ) as Record<string, unknown> | null;
  const userAgent = useOpenAiGlobal("userAgent") as Record<string, unknown> | null;
  const theme = (useOpenAiGlobal("theme") ?? "light") as Theme;
  const displayMode = (useOpenAiGlobal("displayMode") ??
    "inline") as DisplayMode;

  const [widgetState, setWidgetState] = useWidgetState<DemoWidgetState>({
    note: "Tap save to persist widget state on the host.",
    highlight: false,
    savedAt: new Date().toISOString(),
  });

  const [noteDraft, setNoteDraft] = useState(widgetState?.note ?? "");
  const [highlightDraft, setHighlightDraft] = useState(
    widgetState?.highlight ?? false
  );

  const [refreshText, setRefreshText] = useState(
    "Ask the MCP server to refresh this widget."
  );
  const [callResult, setCallResult] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [displayModeResult, setDisplayModeResult] = useState<DisplayMode | "">(
    ""
  );
  const [events, setEvents] = useState<string[]>([]);
  const [anyToolName, setAnyToolName] = useState("kitchen-sink-show");
  const [anyToolArgs, setAnyToolArgs] = useState(
    '{"message": "Hello from any tool"}'
  );
  const [anyToolResult, setAnyToolResult] = useState<string | null>(null);
  const [anyToolError, setAnyToolError] = useState<string | null>(null);
  const [anyToolLoading, setAnyToolLoading] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<string | null>(null);

  useEffect(() => {
    setNoteDraft(widgetState?.note ?? "");
    setHighlightDraft(widgetState?.highlight ?? false);
  }, [widgetState?.note, widgetState?.highlight]);

  const content = useMemo(
    () => toolOutput ?? fallbackContent,
    [toolOutput]
  );

  // Keep a short rolling log of host API calls to render in the event log.
  const logEvent = (text: string) => {
    setEvents((prev) => {
      const next = [
        `${new Date().toLocaleTimeString([], { hour12: false })} ${text}`,
        ...prev,
      ];
      return next.slice(0, 12);
    });
  };

  const handleSaveWidgetState = async () => {
    await setWidgetState((prev) => ({
      ...prev,
      note: noteDraft,
      highlight: highlightDraft,
      savedAt: new Date().toISOString(),
    }));
    logEvent("setWidgetState()");
  };

  const handleRequestDisplayMode = async (mode: DisplayMode) => {
    if (!window.openai?.requestDisplayMode) {
      setDisplayModeResult("inline");
      logEvent("requestDisplayMode unavailable (defaulted to inline)");
      return;
    }

    const result = await window.openai.requestDisplayMode({ mode });
    setDisplayModeResult(result?.mode ?? "");
    logEvent(`requestDisplayMode(${mode}) → ${result?.mode ?? "unknown"}`);
  };

  const handleCallTool = async () => {
    if (!window.openai?.callTool) {
      setCallError("callTool is not available in this context.");
      logEvent("callTool unavailable");
      return;
    }

    setIsCalling(true);
    setCallError(null);
    setCallResult(null);
    try {
      const response = await window.openai.callTool("kitchen-sink-refresh", {
        message: refreshText,
      });
      const serialized =
        typeof response === "string"
          ? response
          : JSON.stringify(response, null, 2);
      setCallResult(serialized);
      logEvent('callTool("kitchen-sink-refresh") succeeded');
    } catch (error) {
      setCallError(
        error instanceof Error ? error.message : "Failed to call tool"
      );
      logEvent('callTool("kitchen-sink-refresh") failed');
    } finally {
      setIsCalling(false);
    }
  };

  const handleRefreshWidgetStateView = () => {
    const hostState = (window.openai?.widgetState as DemoWidgetState | null) ?? null;
    if (hostState) {
      setNoteDraft(hostState.note ?? "");
      setHighlightDraft(Boolean(hostState.highlight));
      logEvent("Refreshed widgetState view from host");
    } else {
      logEvent("No widgetState available on host");
    }
  };

  const handleSendFollowUp = async () => {
    if (!window.openai?.sendFollowUpMessage) {
      setCallError("sendFollowUpMessage is not available in this context.");
      logEvent("sendFollowUpMessage unavailable");
      return;
    }

    await window.openai.sendFollowUpMessage({
      prompt: "Show me the kitchen sink widget again.",
    });
    logEvent("sendFollowUpMessage()");
  };

  const handleOpenExternal = () => {
    window.openai?.openExternal?.({
      href: "https://platform.openai.com/docs/guides/apps",
    });
    logEvent("openExternal()");
  };

  const handleCallAnyTool = async () => {
    if (!window.openai?.callTool) {
      setAnyToolError("callTool is not available in this context.");
      logEvent("callTool unavailable (any tool)");
      return;
    }
    setAnyToolLoading(true);
    setAnyToolError(null);
    setAnyToolResult(null);
    try {
      const parsed =
        anyToolArgs.trim().length === 0 ? {} : JSON.parse(anyToolArgs);
      const response = await window.openai.callTool(anyToolName, parsed);
      const serialized =
        typeof response === "string"
          ? response
          : JSON.stringify(response, null, 2);
      setAnyToolResult(serialized);
      logEvent(`callTool("${anyToolName}") succeeded`);
    } catch (error) {
      setAnyToolError(
        error instanceof Error ? error.message : "Failed to call tool"
      );
      logEvent(`callTool("${anyToolName}") failed`);
    } finally {
      setAnyToolLoading(false);
    }
  };

  const handleFetchDemo = async () => {
    setFetchError(null);
    setFetchResult(null);
    try {
      const resp = await fetch("https://jsonplaceholder.typicode.com/todos/1");
      const json = await resp.json();
      setFetchResult(JSON.stringify(json, null, 2));
      logEvent("fetch demo succeeded");
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : "Fetch demo failed"
      );
      logEvent("fetch demo failed");
    }
  };

  const handleThrowError = () => {
    logEvent("simulated render error");
    throw new Error("Simulated error for demo");
  };

  const handleRequestModal = async () => {
    if (!window.openai?.requestModal) {
      setModalResult("requestModal is not available in this context.");
      logEvent("requestModal unavailable");
      return;
    }
    try {
      const resp = await window.openai.requestModal({
        title: "Kitchen sink modal",
        params: { message: "Hello from the widget" },
      });
      setModalResult(
        resp ? JSON.stringify(resp, null, 2) : "Modal closed without result"
      );
      logEvent("requestModal resolved");
    } catch (error) {
      setModalResult(
        error instanceof Error ? error.message : "requestModal failed"
      );
      logEvent("requestModal failed");
    }
  };

  return (
    <div className="bg-surface border border-default rounded-2xl shadow-sm p-4 flex flex-col gap-4 text-primary">
      <header className="flex flex-col gap-1 border-l-4 border-primary/70 pl-3">
        <p className="uppercase tracking-[0.16em] text-[11px] font-semibold text-secondary">
          Kitchen sink lite
        </p>
        <h1 className="text-xl font-semibold">Minimal widget + MCP server example</h1>
        <p className="text-secondary text-sm leading-snug">
          Tool output populates the widget; window.openai powers callbacks like widget state,
          callTool, openExternal, and display mode.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="soft" color="secondary" pill className="uppercase tracking-wide">
          Reads window.openai.*
        </Badge>
        <Badge variant="soft" color="info" pill className="uppercase tracking-wide">
          Calls window.openai.*()
        </Badge>
        <Badge variant="soft" color="primary" pill className="uppercase tracking-wide">
          From MCP tool (structuredContent)
        </Badge>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Capability
          </p>
          <h2 className="text-base font-semibold text-primary">Tool I/O</h2>
          <p className="text-sm text-secondary">
            See what the model sent and what your MCP tool returned.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card
            title="Tool input"
            apiLabel="window.openai.toolInput"
            description="What the model sent your MCP tool."
          >
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {JSON.stringify(toolInput ?? {}, null, 2)}
            </CodeBlock>
            <p className="text-xs text-secondary">Source: model → MCP tool</p>
          </Card>

          <Card
            title="Tool output"
            apiLabel="window.openai.toolOutput / structuredContent"
            description="What your MCP tool returned."
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.08em] text-secondary">message</p>
              <p
                className="text-lg font-semibold"
                style={
                  widgetState?.highlight
                    ? {
                        background: "rgba(99, 102, 241, 0.16)",
                        padding: "8px 10px",
                        borderRadius: "12px",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                      }
                    : undefined
                }
              >
                {content.message}
              </p>
              {content.details ? (
                <p className="text-sm text-secondary leading-snug">{content.details}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {widgetState?.highlight ? (
                  <Badge variant="solid" color="primary" pill>
                    Highlight on
                  </Badge>
                ) : null}
                <Badge variant="soft" color="secondary" pill>
                  from tool: {content.fromTool ?? "n/a"}
                </Badge>
                <Badge variant="soft" color="info" pill>
                  display: {displayMode}
                </Badge>
                <Badge variant="soft" color="info" pill>
                  theme: {theme}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Card
            title="Tool response metadata"
            apiLabel="window.openai.toolResponseMetadata"
            description="Additional data returned alongside tool output."
          >
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {JSON.stringify(toolResponseMetadata ?? {}, null, 2)}
            </CodeBlock>
          </Card>
          <Card
            title="User agent"
            apiLabel="window.openai.userAgent"
            description="Capabilities and device info provided by the host."
          >
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {JSON.stringify(userAgent ?? {}, null, 2)}
            </CodeBlock>
          </Card>
        </div>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Capability
          </p>
          <h2 className="text-base font-semibold text-primary">Widget state</h2>
          <p className="text-sm text-secondary">
            Host-persisted state for this widget; survives tool calls.
          </p>
        </div>
        <Card
          title="window.openai.widgetState"
          apiLabel="widgetState + setWidgetState()"
          description="Persist UI state on the host between tool calls."
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary">Note (saved on host)</span>
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
              />
            </label>
            <Checkbox
              checked={highlightDraft}
              onCheckedChange={(next) => {
                const nextValue = Boolean(next);
                setHighlightDraft(nextValue);
                void setWidgetState((prev) => ({
                  ...prev,
                  note: noteDraft,
                  highlight: nextValue,
                  savedAt: new Date().toISOString(),
                }));
                logEvent("setWidgetState() via highlight toggle");
              }}
              label="Highlight the message"
            />
            <Button color="primary" onClick={handleSaveWidgetState} className="w-fit">
              Save widget state
            </Button>
            <Button
              variant="outline"
              color="secondary"
              onClick={handleRefreshWidgetStateView}
              className="w-fit"
            >
              Refresh widgetState view
            </Button>
            <div className="text-xs text-secondary">
              Reads: window.openai.widgetState · Writes: setWidgetState()
            </div>
            <div className="text-xs text-secondary">
              Last saved: {widgetState?.savedAt ?? "not set"}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-secondary uppercase tracking-[0.08em] text-[11px]">
                Current widgetState
              </span>
              <CodeBlock
                className="ks-code-block ks-code-block--compact"
                language="json"
                showLineNumbers={false}
                wrapLongLines
              >
                {JSON.stringify(widgetState ?? {}, null, 2)}
              </CodeBlock>
            </div>
          </div>
        </Card>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Capability
          </p>
          <h2 className="text-base font-semibold text-primary">
            Call another tool from the widget
          </h2>
          <p className="text-sm text-secondary">
            Invoke an MCP tool directly with window.openai.callTool().
          </p>
        </div>
        <Card
          title='window.openai.callTool("kitchen-sink-refresh")'
          apiLabel="callTool()"
          description="Trigger another MCP tool directly from the widget."
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary">message to send</span>
              <Input
                value={refreshText}
                onChange={(e) => setRefreshText(e.target.value)}
              />
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-secondary uppercase tracking-[0.08em] text-[11px]">
                Call preview
              </span>
              <CodeBlock
                className="ks-code-block ks-code-block--compact"
                language="javascript"
                showLineNumbers={false}
                wrapLongLines
              >{`window.openai.callTool("kitchen-sink-refresh", {\n  message: "${refreshText}"\n})`}</CodeBlock>
            </div>
            <Button color="primary" onClick={handleCallTool} disabled={isCalling} className="w-fit">
              {isCalling ? "Calling…" : "Call kitchen-sink-refresh"}
            </Button>
            {callResult ? (
              <div className="flex flex-col gap-1">
                <span className="text-secondary uppercase tracking-[0.08em] text-[11px]">
                  structuredContent
                </span>
                <CodeBlock
                  className="ks-code-block"
                  language="json"
                  showLineNumbers={false}
                  wrapLongLines
                >
                  {callResult}
                </CodeBlock>
              </div>
            ) : null}
            {callError ? <p className="text-sm text-red-600">{callError}</p> : null}
          </div>
        </Card>
        <Card
          title="Call any MCP tool"
          apiLabel='window.openai.callTool("<name>", <args>)'
          description="Manually invoke any tool by name with JSON args."
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary">tool name</span>
              <Input value={anyToolName} onChange={(e) => setAnyToolName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary">arguments (JSON)</span>
              <Textarea
                rows={4}
                value={anyToolArgs}
                onChange={(e) => setAnyToolArgs(e.target.value)}
              />
            </label>
            <Button
              color="primary"
              onClick={handleCallAnyTool}
              disabled={anyToolLoading}
              className="w-fit"
            >
              {anyToolLoading ? "Calling…" : "Call tool"}
            </Button>
            {anyToolResult ? (
              <CodeBlock
                className="ks-code-block"
                language="json"
                showLineNumbers={false}
                wrapLongLines
              >
                {anyToolResult}
              </CodeBlock>
            ) : null}
            {anyToolError ? <p className="text-sm text-red-600">{anyToolError}</p> : null}
          </div>
        </Card>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Host
          </p>
          <h2 className="text-base font-semibold text-primary">
            Host capabilities (window.openai)
          </h2>
          <p className="text-sm text-secondary">Environment and helpers exposed by ChatGPT.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card
            title="Layout & messaging"
            apiLabel="requestDisplayMode(), sendFollowUpMessage()"
            description="Ask ChatGPT to change layout or send a follow-up."
          >
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                color="secondary"
                onClick={() => handleRequestDisplayMode("fullscreen")}
              >
                requestDisplayMode("fullscreen")
              </Button>
              <Button variant="outline" color="secondary" onClick={handleSendFollowUp}>
                sendFollowUpMessage()
              </Button>
            </div>
            {displayModeResult ? (
              <p className="text-xs text-secondary">
                Host granted mode: {displayModeResult}
              </p>
            ) : (
              <p className="text-xs text-secondary">Current displayMode: {displayMode}</p>
            )}
          </Card>

          <Card
            title="External links"
            apiLabel="openExternal()"
            description="Open a link in the host."
          >
            <Button variant="outline" color="secondary" onClick={handleOpenExternal} className="w-fit">
              openExternal({"{ href }"})
            </Button>
            <p className="text-xs text-secondary">Example: platform.openai.com/docs/guides/apps</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                color="secondary"
                onClick={() =>
                  window.openai?.openExternal?.({
                    href: "https://maps.apple.com/?q=Golden+Gate+Bridge",
                  })
                }
              >
                Deep link (Maps)
              </Button>
              <Button
                variant="outline"
                color="secondary"
                onClick={() =>
                  window.openai?.openExternal?.({
                    href: "https://spotify.com",
                  })
                }
              >
                Open Spotify
              </Button>
            </div>
          </Card>
        </div>

        <Card
          title="Snapshot of window.openai"
          apiLabel="window.openai.*"
          description="Selected fields available to the widget."
        >
          <div className="grid grid-cols-2 gap-2">
            <PillRow label="theme" value={theme} />
            <PillRow label="displayMode" value={displayMode} />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-secondary uppercase tracking-[0.08em] text-[11px]">
              toolInput
            </span>
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {JSON.stringify(toolInput ?? {}, null, 2)}
            </CodeBlock>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-secondary uppercase tracking-[0.08em] text-[11px]">
              widgetState
            </span>
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {JSON.stringify(widgetState ?? {}, null, 2)}
            </CodeBlock>
          </div>
        </Card>
        <Card
          title="Modal & close"
          apiLabel="requestModal(), requestClose()"
          description="Open a modal from the host or close this widget."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" color="secondary" onClick={handleRequestModal}>
              requestModal()
            </Button>
            <Button
              variant="outline"
              color="secondary"
              onClick={() => window.openai?.requestClose?.()}
            >
              requestClose()
            </Button>
          </div>
          {modalResult ? (
            <CodeBlock
              className="ks-code-block ks-code-block--compact"
              language="json"
              showLineNumbers={false}
              wrapLongLines
            >
              {modalResult}
            </CodeBlock>
          ) : null}
        </Card>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Navigation & embed
          </p>
          <h2 className="text-base font-semibold text-primary">Inline iframe</h2>
          <p className="text-sm text-secondary">
            Embedding external content directly inside the widget.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-default bg-subtle">
          <iframe
            title="Docs embed"
            src="https://example.com"
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            className="w-full h-60"
          />
        </div>
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Debug
          </p>
          <h2 className="text-base font-semibold text-primary">Fetch & errors</h2>
          <p className="text-sm text-secondary">
            Demo of in-widget fetch and a simulated error trigger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" color="secondary" onClick={handleFetchDemo}>
            Fetch sample JSON
          </Button>
          <Button variant="outline" color="danger" onClick={handleThrowError}>
            Throw error
          </Button>
        </div>
        {fetchResult ? (
          <CodeBlock
            className="ks-code-block ks-code-block--compact"
            language="json"
            showLineNumbers={false}
            wrapLongLines
          >
            {fetchResult}
          </CodeBlock>
        ) : null}
        {fetchError ? <p className="text-sm text-red-600">{fetchError}</p> : null}
      </div>

      <div className="border border-default rounded-2xl bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="uppercase tracking-[0.12em] text-[11px] font-semibold text-secondary">
            Debug
          </p>
          <h2 className="text-base font-semibold text-primary">Event log</h2>
          <p className="text-sm text-secondary">Recent calls from this widget to window.openai.</p>
        </div>
        <div className="border border-default rounded-lg bg-subtle p-3 max-h-48 overflow-auto">
          {events.length === 0 ? (
            <p className="text-sm text-secondary">No events yet.</p>
          ) : (
            <ul className="text-sm text-primary space-y-1">
              {events.map((evt, idx) => (
                <li key={idx}>{evt}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { startProbeListener } from "./probes";
import "./zod-jitless";
import { useEffect, useMemo, type FC } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAui,
  useLocalRuntime,
  type AssistantClient,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  createVSCodeModelAdapter,
  vscodeFetch,
} from "@assistant-ui/vscode/webview";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { FIXTURES } from "../src/fixtures/fixtures";
import {
  BOOT_ATTRIBUTE,
  CHAT_ROUTE,
  MODEL_ROUTE,
  type WebviewBootConfig,
} from "../src/protocol";
import type { SWITCHBOARD, Switchboard } from "../src/switchboard";
import { toolkit } from "./tools";

const boot = JSON.parse(
  document.body.getAttribute(BOOT_ATTRIBUTE) ?? "null",
) as WebviewBootConfig;

let client: AssistantClient | undefined;
startProbeListener(() => ({ boot, aui: client }));

const config = AuiConfig({
  tools: Tools({ toolkit }),
  suggestions: Suggestions(
    FIXTURES.map((f) => ({
      title: f.name,
      label: f.description,
      prompt: f.prompt,
    })),
  ),
});

function CaptureClient() {
  const aui = useAui();
  useEffect(() => {
    client = aui;
    return () => {
      client = undefined;
    };
  }, [aui]);
  return null;
}

function FixtureThread({ runtime }: { runtime: AssistantRuntime }) {
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <CaptureClient />
      <Thread />
    </AssistantRuntimeProvider>
  );
}

function LocalThread() {
  const adapter = useMemo(
    () => createVSCodeModelAdapter({ api: MODEL_ROUTE }),
    [],
  );
  return <FixtureThread runtime={useLocalRuntime(adapter)} />;
}

function AiSdkThread() {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: CHAT_ROUTE, fetch: vscodeFetch }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  return <FixtureThread runtime={runtime} />;
}

const RUNTIME_THREADS: Record<
  (typeof SWITCHBOARD.runtime.implemented)[number],
  FC
> = {
  "ai-sdk": AiSdkThread,
  local: LocalThread,
};

function NotImplementedBanner() {
  if (boot.unimplemented.length === 0) return null;
  return (
    <div
      role="status"
      className="bg-destructive/10 text-destructive border-b px-3 py-2 text-sm"
    >
      Not implemented:{" "}
      {boot.unimplemented
        .map(({ key, value }) => `auiTest.${key}=${value}`)
        .join(", ")}
    </div>
  );
}

function App() {
  const RuntimeThread = (
    RUNTIME_THREADS as Partial<Record<Switchboard["runtime"], FC>>
  )[boot.switchboard.runtime];
  const canMountThread = !boot.unimplemented.some(
    ({ key }) => key === "backend",
  );
  return (
    <main className="flex h-screen flex-col">
      <NotImplementedBanner />
      <div className="min-h-0 flex-1">
        {canMountThread && RuntimeThread && <RuntimeThread />}
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

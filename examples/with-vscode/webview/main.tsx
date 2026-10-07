import "./zod-jitless";
import { startProbeListener } from "./probes";
import { useEffect, useMemo } from "react";
import { createLocalStorageAdapter } from "@assistant-ui/core/react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAui,
  useRemoteThreadListRuntime,
  type AssistantClient,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  installLinkInterceptor,
  vscodeFetch,
} from "@assistant-ui/vscode/webview";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { ThreadList } from "@assistant-ui/ui/components/assistant-ui/elements/thread-list.aui.tsx";
import { FIXTURES } from "../src/fixtures/fixtures";
import {
  BOOT_ATTRIBUTE,
  CHAT_ROUTE,
  type WebviewBootConfig,
} from "../src/protocol";
import type { SWITCHBOARD, Switchboard } from "../src/switchboard";
import { FIXTURE_TOOLKIT, FixtureDataUIs } from "./fixture-uis";
import { threadStorage, threadStoragePrefix } from "./thread-storage";
import { toolkit } from "./tools";

const boot = JSON.parse(
  document.body.getAttribute(BOOT_ATTRIBUTE) ?? "null",
) as WebviewBootConfig;

installLinkInterceptor();

let client: AssistantClient | undefined;
startProbeListener(() => ({ boot, aui: client }));

const threadListAdapter = createLocalStorageAdapter({
  storage: threadStorage,
  prefix: threadStoragePrefix(boot.switchboard.runtime),
});

const config = AuiConfig({
  tools: Tools({ toolkit: { ...FIXTURE_TOOLKIT, ...toolkit } }),
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

function useAiSdkThreadRuntime() {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: CHAT_ROUTE, fetch: vscodeFetch }),
    [],
  );
  return useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
}

const RUNTIME_HOOKS: Record<
  (typeof SWITCHBOARD.runtime.implemented)[number],
  () => AssistantRuntime
> = {
  "ai-sdk": useAiSdkThreadRuntime,
};

function FixtureThreads({
  useThreadRuntime,
}: {
  useThreadRuntime: () => AssistantRuntime;
}) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useThreadRuntime,
    adapter: threadListAdapter,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <CaptureClient />
      <FixtureDataUIs />
      <div className="flex h-full flex-col">
        <nav
          aria-label="Threads"
          className="max-h-40 shrink-0 overflow-y-auto border-b p-2"
        >
          <ThreadList />
        </nav>
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

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
  const useThreadRuntime = (
    RUNTIME_HOOKS as Partial<
      Record<Switchboard["runtime"], () => AssistantRuntime>
    >
  )[boot.switchboard.runtime];
  const canMountThread = !boot.unimplemented.some(
    ({ key }) => key === "backend",
  );
  return (
    <main className="flex h-screen flex-col">
      <NotImplementedBanner />
      <div className="min-h-0 flex-1">
        {canMountThread && useThreadRuntime && (
          <FixtureThreads useThreadRuntime={useThreadRuntime} />
        )}
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

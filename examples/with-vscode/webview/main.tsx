import { startProbeListener } from "./probes";
import { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAui,
  useLocalRuntime,
  type AssistantClient,
} from "@assistant-ui/react";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { FIXTURES } from "../src/fixtures/fixtures";
import { createFixtureModelAdapter } from "../src/fixtures/model-adapter";
import type { WebviewBootConfig } from "../src/protocol";
import { toolkit } from "./tools";

const boot = JSON.parse(
  document.getElementById("aui-testbed-boot")?.textContent ?? "null",
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

function FixtureThread() {
  const adapter = useMemo(() => createFixtureModelAdapter(), []);
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <CaptureClient />
      <Thread />
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
  const canMountThread = !boot.unimplemented.some(
    ({ key }) => key === "runtime" || key === "backend",
  );
  return (
    <main className="flex h-screen flex-col">
      <NotImplementedBanner />
      <div className="min-h-0 flex-1">
        {canMountThread && <FixtureThread />}
      </div>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

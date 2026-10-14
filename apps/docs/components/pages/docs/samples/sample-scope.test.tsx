import { useMemo, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import {
  AssistantRuntimeProvider,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { describe, expect, it } from "vitest";
import { BranchPickerPrimitiveSample } from "./branch-picker-primitive";
import { DevToolsModalSample, DevToolsSample } from "./devtools";
import { ReasoningStreamingSample } from "./reasoning";
import { SampleRuntimeProvider } from "./sample-runtime-provider";
import { ThreadBranchSample } from "./thread/branching-response";
import { ThreadRunningSample } from "./thread/running-response";
import { ThreadWelcomeSuggestionsSample } from "./thread/welcome-with-suggestions";
import { ToolUIRendererSample } from "./tool-ui/custom-renderer";

function DocsRuntime({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function DocsRuntimeHook() {
      return useLocalRuntime({
        async run() {
          return { content: [] };
        },
      });
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function ProvidedSample() {
  return (
    <SampleRuntimeProvider>
      <p>sample</p>
    </SampleRuntimeProvider>
  );
}

describe("samples with their own runtime", () => {
  it.each<[string, ComponentType]>([
    ["SampleRuntimeProvider", ProvidedSample],
    ["BranchPickerPrimitiveSample", BranchPickerPrimitiveSample],
    ["ToolUIRendererSample", ToolUIRendererSample],
    ["ReasoningStreamingSample", ReasoningStreamingSample],
    ["ThreadBranchSample", ThreadBranchSample],
    ["ThreadRunningSample", ThreadRunningSample],
    ["ThreadWelcomeSuggestionsSample", ThreadWelcomeSuggestionsSample],
    ["DevToolsSample", DevToolsSample],
    ["DevToolsModalSample", DevToolsModalSample],
  ])("%s prerenders inside the docs runtime", (_, Sample) => {
    expect(() =>
      renderToString(
        <DocsRuntime>
          <Sample />
        </DocsRuntime>,
      ),
    ).not.toThrow();
  });
});

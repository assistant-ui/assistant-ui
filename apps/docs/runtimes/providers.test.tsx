import { afterEach, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  CloudFileAttachmentAdapter,
  SimpleImageAttachmentAdapter,
} from "@assistant-ui/react";

const useDocsChatRuntime = vi.hoisted(() => vi.fn(() => ({}) as never));
const useSpeechAdapters = vi.hoisted(() => vi.fn(() => ({ speech: "speech" })));
const useDocsCloud = vi.hoisted(() =>
  vi.fn(() => ({ cloud: "cloud", claims: 0 })),
);

vi.mock("./chat-runtime", () => ({
  useDocsChatRuntime,
  useSpeechAdapters,
  useDocsCloud,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AssistantRuntimeProvider: ({ children }: { children?: unknown }) => children,
  useAui: () => ({}),
  Tools: (v: unknown) => v,
  Suggestions: (v: unknown) => v,
  unstable_Interactables: () => ({}),
  ModelContextClient: () => ({}),
  CloudFileAttachmentAdapter: class CloudFileAttachmentAdapter {},
  SimpleImageAttachmentAdapter: class SimpleImageAttachmentAdapter {},
}));

vi.mock("@assistant-ui/react-devtools", () => ({ DevToolsModal: () => null }));
vi.mock("@/lib/docs-toolkit", () => ({ default: {} }));
vi.mock("./assistant-analytics", () => ({
  AssistantAnalyticsTracker: () => null,
  AssistantPageContext: () => null,
}));

const runtimeOptions = () =>
  useDocsChatRuntime.mock.calls.at(-1)![0] as {
    api?: string;
    cloud?: unknown;
    sendAutomatically?: boolean;
    adapters?: Record<string, unknown>;
  };

afterEach(() => {
  vi.clearAllMocks();
});

it("wires the docs surface with a cloud, dictation and cloud attachments", async () => {
  const { DocsRuntimeProvider } = await import("./docs");

  renderToString(<DocsRuntimeProvider>{null}</DocsRuntimeProvider>);

  expect(useSpeechAdapters).toHaveBeenCalledWith({ dictation: true });
  expect(useDocsCloud).toHaveBeenCalled();
  expect(runtimeOptions().cloud).toBe("cloud");
  expect(runtimeOptions().sendAutomatically).toBe(true);
  expect(runtimeOptions().adapters?.attachments).toBeInstanceOf(
    CloudFileAttachmentAdapter,
  );
  expect(runtimeOptions().adapters?.feedback).toBeDefined();
});

it("wires the artifacts surface with a cloud and dictation but no feedback", async () => {
  const { ArtifactsRuntimeProvider } = await import("./artifacts");

  renderToString(<ArtifactsRuntimeProvider>{null}</ArtifactsRuntimeProvider>);

  expect(useSpeechAdapters).toHaveBeenCalledWith({ dictation: true });
  expect(runtimeOptions().cloud).toBe("cloud");
  expect(runtimeOptions().sendAutomatically).toBe(true);
  expect(runtimeOptions().adapters?.feedback).toBeUndefined();
});

it("wires the docs assistant onto its own endpoint with no cloud", async () => {
  const { DocsAssistantRuntimeProvider } = await import("./docs-assistant");

  renderToString(
    <DocsAssistantRuntimeProvider>{null}</DocsAssistantRuntimeProvider>,
  );

  expect(runtimeOptions().api).toBe("/api/doc/chat");
  expect(runtimeOptions().cloud).toBeUndefined();
  expect(runtimeOptions().sendAutomatically).toBe(true);
  expect(runtimeOptions().adapters?.attachments).toBeInstanceOf(
    SimpleImageAttachmentAdapter,
  );
  expect(useSpeechAdapters).not.toHaveBeenCalled();
});

it("leaves the playground without a cloud or automatic sending", async () => {
  const { PlaygroundRuntimeProvider } = await import("./playground");

  renderToString(<PlaygroundRuntimeProvider>{null}</PlaygroundRuntimeProvider>);

  expect(useSpeechAdapters).toHaveBeenCalledWith();
  expect(runtimeOptions().cloud).toBeUndefined();
  expect(runtimeOptions().api).toBeUndefined();
  expect(runtimeOptions().sendAutomatically).toBeUndefined();
});

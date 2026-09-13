// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  Tools,
  useAui,
  type AssistantClient,
} from "@assistant-ui/react";
import { DocsRuntimeProvider } from "./docs";
import { ArtifactsRuntimeProvider } from "./artifacts";
import { InteractableRuntimeProvider } from "./interactable";

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  humanTool: () => async () => ({}),
}));

vi.mock("./chat-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./chat-runtime")>();
  const { useLocalRuntime } = await import("@assistant-ui/react");
  const adapter = { run: async () => ({ content: [] }) };
  return {
    ...actual,
    useDocsCloud: () => ({ cloud: {}, claims: 0 }),
    useSpeechAdapters: () => ({}),
    useDocsChatRuntime: () => useLocalRuntime(adapter),
  };
});

vi.mock("@assistant-ui/react-devtools", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DevToolsModal: () => null,
}));

vi.mock("@assistant-ui/react-generative-ui", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  defineGenerativeComponents: () => ({}),
}));

afterEach(cleanup);

it.each([
  ["docs", DocsRuntimeProvider, "get_weather"],
  ["artifacts", ArtifactsRuntimeProvider, "render_html"],
  ["interactable", InteractableRuntimeProvider, undefined],
] as const)(
  "preserves configured scopes and model-context boundaries in the %s runtime",
  async (name, Provider, toolName) => {
    let client!: AssistantClient;
    const Capture = () => {
      client = useAui();
      return null;
    };
    const config = AuiConfig({
      tools: Tools({
        toolkit: {
          parent_tool: { parameters: { type: "object", properties: {} } },
        },
      }),
    });

    await act(async () => {
      render(
        <AuiProvider config={config}>
          <Provider>
            <Capture />
          </Provider>
        </AuiProvider>,
      );
    });

    const tools = client.modelContext.getModelContext().tools;
    if (name === "artifacts") {
      expect(tools).not.toHaveProperty("parent_tool");
    } else {
      expect(tools).toHaveProperty("parent_tool");
    }
    expect(client.threads.getState().mainThreadId).toBeDefined();
    if (toolName) {
      expect(tools).toHaveProperty(toolName);
      expect(client.tools.getState().toolUIs[toolName]).toHaveLength(1);
    } else {
      expect(client.unstable_interactables.getState()).toBeDefined();
    }
    if (name === "docs") {
      expect(client.suggestions.getState().suggestions).toHaveLength(3);
    }
  },
);

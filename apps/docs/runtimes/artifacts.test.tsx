// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  Suggestions,
  Tools,
  useAui,
  type AssistantClient,
} from "@assistant-ui/react";
import { ArtifactsRuntimeProvider } from "./artifacts";

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

afterEach(cleanup);

it("isolates artifact model tools while inheriting other parent scopes", async () => {
  let client!: AssistantClient;
  const Capture = () => {
    client = useAui();
    return null;
  };
  const suggestions = [{ title: "Parent", label: "", prompt: "Parent prompt" }];
  const config = AuiConfig({
    tools: Tools({
      toolkit: {
        parent_tool: { parameters: { type: "object", properties: {} } },
      },
    }),
    suggestions: Suggestions(suggestions),
  });

  await act(async () => {
    render(
      <AuiProvider config={config}>
        <ArtifactsRuntimeProvider>
          <Capture />
        </ArtifactsRuntimeProvider>
      </AuiProvider>,
    );
  });

  const tools = client.modelContext.getModelContext().tools;
  expect(tools).not.toHaveProperty("parent_tool");
  expect(tools).toHaveProperty("render_html");
  expect(client.tools.getState().toolUIs.render_html).toHaveLength(1);
  expect(client.suggestions.getState().suggestions).toEqual(suggestions);
});

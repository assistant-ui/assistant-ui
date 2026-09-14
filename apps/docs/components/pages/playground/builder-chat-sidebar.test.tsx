// @vitest-environment jsdom

import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  Tools,
  useAui,
  type AssistantClient,
} from "@assistant-ui/react";
import {
  PlaygroundChatProvider,
  PlaygroundChatThread,
} from "./builder-chat-sidebar";
import { DEFAULT_CONFIG } from "./types";

const mountedClients = vi.hoisted(() => [] as AssistantClient[]);

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AssistantRuntimeProvider: ({ aui }: { aui: AssistantClient }) => {
    mountedClients.push(aui);
    return null;
  },
}));

vi.mock("@assistant-ui/ai-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/ai-sdk")>();
  const { useLocalRuntime } = await import("@assistant-ui/react");
  const adapter = { run: async () => ({ content: [] }) };
  return { ...actual, useChatRuntime: () => useLocalRuntime(adapter) };
});

afterEach(() => {
  cleanup();
  mountedClients.length = 0;
});

it("shares the isolated chat client and restores the surrounding client across updates", async () => {
  let surrounding!: AssistantClient;
  const Capture = () => {
    surrounding = useAui();
    return null;
  };
  const parentConfig = AuiConfig({
    tools: Tools({
      toolkit: {
        parent_tool: { parameters: { type: "object", properties: {} } },
      },
    }),
  });
  const firstUpdate = vi.fn();
  const secondUpdate = vi.fn();
  const tree = (setConfig: typeof firstUpdate) => (
    <StrictMode>
      <AuiProvider config={parentConfig}>
        <PlaygroundChatProvider config={DEFAULT_CONFIG} setConfig={setConfig}>
          <Capture />
          <PlaygroundChatThread />
          <PlaygroundChatThread />
        </PlaygroundChatProvider>
      </AuiProvider>
    </StrictMode>
  );
  const { rerender } = render(tree(firstUpdate));
  const chat = mountedClients.at(-1)!;

  expect(mountedClients.every((client) => client === chat)).toBe(true);
  expect(surrounding.modelContext.getModelContext().tools).toHaveProperty(
    "parent_tool",
  );
  expect(surrounding.modelContext.getModelContext().tools).not.toHaveProperty(
    "update_config",
  );
  expect(chat.modelContext.getModelContext().tools).not.toHaveProperty(
    "parent_tool",
  );
  expect(chat.tools.getState().toolUIs.update_config).toHaveLength(1);
  expect(chat.suggestions.getState().suggestions.length).toBeGreaterThan(0);

  rerender(tree(secondUpdate));
  expect(mountedClients.at(-1)).toBe(chat);
  expect(chat.tools.getState().toolUIs.update_config).toHaveLength(1);

  const tool = chat.modelContext.getModelContext().tools!.update_config!;
  await act(async () => {
    await tool.execute!({ customCSS: "body { color: red; }" }, {} as never);
  });
  expect(firstUpdate).not.toHaveBeenCalled();
  expect(secondUpdate).toHaveBeenCalledWith({
    ...DEFAULT_CONFIG,
    customCSS: "body { color: red; }",
  });
});

// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import { resource, useResource } from "@assistant-ui/tap";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  useExternalStoreRuntime,
  type ToolCallMessagePartProps,
} from "@assistant-ui/core/react";
import type { ThreadMessageLike } from "@assistant-ui/core";
import { expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../index";
import type { McpAppBridgeHandlers, McpAppsHost } from "./types";

const { framePropsMock } = vi.hoisted(() => ({ framePropsMock: vi.fn() }));

vi.mock("./app-frame", () => ({
  McpAppFrame: (props: unknown) => {
    framePropsMock(props);
    return null;
  },
}));

import { McpAppRenderer } from "./McpAppRenderer";

const Host = resource(({ host }: { host: McpAppsHost }) => host);

const host: McpAppsHost = {
  loadResource: vi.fn(async ({ uri }) => ({
    uri,
    mimeType: "text/html;profile=mcp-app" as const,
    html: "",
  })),
  callTool: vi.fn(),
  readResource: vi.fn(),
  listResources: vi.fn(),
};

const part: ToolCallMessagePartProps = {
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "search",
  args: {},
  argsText: "{}",
  status: { type: "complete" },
  mcp: { app: { resourceUri: "ui://example/search" } },
  addResult: vi.fn(),
  resume: vi.fn(),
  respondToApproval: vi.fn(),
};

const messages: ThreadMessageLike[] = [
  { role: "assistant", content: "Here is the app" },
];

const AppPart = () => {
  const renderer = useResource(McpAppRenderer({ host: Host({ host }) }));
  const Renderer = renderer.render;
  return <Renderer {...part} />;
};

let runtime!: AssistantRuntime;

const App = () => {
  runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageByIndexProvider index={0}>
        <AppPart />
      </MessageByIndexProvider>
    </AssistantRuntimeProvider>
  );
};

const renderApp = async () => {
  framePropsMock.mockClear();
  render(<App />);
  await waitFor(() => expect(framePropsMock).toHaveBeenCalled());
  const handlers = framePropsMock.mock.lastCall?.[0]
    .handlers as McpAppBridgeHandlers;
  return handlers;
};

it("fills the thread composer from an MCP App message inside a message", async () => {
  const handlers = await renderApp();

  let result: unknown;
  act(() => {
    result = handlers.sendMessage?.({ text: "Open Grade 5 Math" });
  });

  expect(result).toEqual({ ok: true });
  expect(runtime.thread.composer.getState().text).toBe("Open Grade 5 Math");
});

it("keeps the user's draft when an MCP App message arrives", async () => {
  const handlers = await renderApp();
  act(() => runtime.thread.composer.setText("Show my classes"));

  act(() => {
    handlers.sendMessage?.({ text: "Open Grade 5 Math" });
  });

  expect(runtime.thread.composer.getState().text).toBe(
    "Show my classes Open Grade 5 Math",
  );
});

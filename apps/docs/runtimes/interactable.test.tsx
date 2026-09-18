// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { z } from "zod";
import {
  unstable_useInteractable,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  taskBoardInitialState,
  taskBoardSchema,
} from "@/components/pages/docs/samples/interactable-state";
import { DocsRuntimeProvider } from "./docs";
import { InteractableRuntimeProvider } from "./interactable";

const mocks = vi.hoisted(() => ({
  runtimes: [] as AssistantRuntime[],
  requests: [] as { id?: string; tools?: Record<string, unknown> }[],
}));

vi.mock("./chat-runtime", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useDocsCloud: () => ({ cloud: undefined, claims: 0 }),
  useSpeechAdapters: () => ({}),
  useDocsChatRuntime: () => {
    const [transport] = useState(
      () => new AssistantChatTransport({ api: "/api/chat" }),
    );
    const runtime = useChatRuntime({ transport });
    mocks.runtimes.push(runtime);
    return runtime;
  },
}));

vi.mock("@assistant-ui/react-devtools", () => ({ DevToolsModal: () => null }));

vi.mock("@/lib/docs-toolkit", () => ({
  default: {
    remember: { description: "remember", parameters: z.object({}) },
    set_theme: { description: "set theme", parameters: z.object({}) },
  },
}));

const TaskBoard = () => {
  unstable_useInteractable("taskBoard", {
    description: "Task board",
    stateSchema: taskBoardSchema,
    initialState: taskBoardInitialState,
  });
  return null;
};

const toolNames = (runtime: AssistantRuntime) =>
  Object.keys(runtime.thread.getModelContext().tools ?? {}).sort();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mocks.runtimes.length = 0;
  mocks.requests.length = 0;
});

it("keeps the interactables runtime off the docs layout thread and model context", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      mocks.requests.push(JSON.parse(String(init?.body)));
      return new Response('data: {"type":"start"}\n\ndata: [DONE]\n\n', {
        headers: { "content-type": "text/event-stream" },
      });
    }),
  );

  render(
    <DocsRuntimeProvider>
      <InteractableRuntimeProvider>
        <TaskBoard />
      </InteractableRuntimeProvider>
    </DocsRuntimeProvider>,
  );
  await act(async () => {});

  const [docs, interactable] = [...new Set(mocks.runtimes)] as [
    AssistantRuntime,
    AssistantRuntime,
  ];
  expect(toolNames(interactable)).toEqual(["update_taskBoard"]);
  expect(toolNames(docs)).toEqual(["remember", "set_theme"]);

  await act(async () => {
    interactable.thread.append({
      role: "user",
      content: [{ type: "text", text: "add a task" }],
    });
    await vi.waitFor(() => expect(mocks.requests).toHaveLength(1));
  });

  const docsThread = docs.threads.mainItem.getState();
  expect(mocks.requests[0]!.id).not.toBe(docsThread.id);
  expect(docsThread.status).toBe("new");
});

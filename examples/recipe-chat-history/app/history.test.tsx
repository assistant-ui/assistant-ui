// @vitest-environment jsdom

import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, threads } from "@/lib/db";
import * as chatRoute from "./api/chat/route";
import * as messagesRoute from "./api/threads/[id]/messages/route";
import * as threadRoute from "./api/threads/[id]/route";
import * as threadsRoute from "./api/threads/route";
import { threadListAdapter } from "./thread-list-adapter";

const { models } = vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
  return { models: [] as unknown[] };
});

vi.mock("@ai-sdk/openai", async (importOriginal) => ({
  ...(await importOriginal()),
  openai: () => models.shift(),
}));

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const textModel = (text: string) =>
  new MockLanguageModelV4({
    doStream: {
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t" },
          { type: "text-delta" as const, id: "t", delta: text },
          { type: "text-end" as const, id: "t" },
          {
            type: "finish" as const,
            finishReason: { unified: "stop" as const, raw: undefined },
            usage,
          },
        ],
      }),
    },
  });

type Handler = (req: Request, ctx?: unknown) => Promise<Response>;

// Serves the app's fetch calls from its route handlers, the way Next.js would.
async function serve(input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : String(input);
  const req = new Request(new URL(url, "http://localhost"), init);
  const path = new URL(req.url).pathname;
  if (path === "/api/chat") return chatRoute.POST(req);
  const [, , , id, sub] = path.split("/");
  const method = req.method as "GET" | "POST" | "PATCH" | "DELETE";
  if (!id) return (threadsRoute as Record<string, Handler>)[method]!(req);
  const route = sub === "messages" ? messagesRoute : threadRoute;
  return (route as Record<string, Handler>)[method]!(req, {
    params: Promise.resolve({ id }),
  });
}

// Mounts the page's runtime, as app/page.tsx does.
function mountApp() {
  const ref: { runtime?: AssistantRuntime } = {};
  function App() {
    ref.runtime = useRemoteThreadListRuntime({
      runtimeHook: () => useChatRuntime(),
      adapter: threadListAdapter,
    });
    return (
      <AssistantRuntimeProvider runtime={ref.runtime}>
        <div />
      </AssistantRuntimeProvider>
    );
  }
  const view = render(<App />);
  return { runtime: () => ref.runtime!, unmount: view.unmount };
}

const texts = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.map((message) =>
      message.content.map((part) => (part.type === "text" ? part.text : "")),
    )
    .flat();

beforeEach(() => {
  models.length = 0;
  vi.stubGlobal("fetch", vi.fn(serve));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("chat history through the runtime", () => {
  it("saves a conversation and loads it back after a reload", async () => {
    models.push(textModel("Day one: Alfama."));
    const first = mountApp();

    await act(async () => {
      first.runtime().thread.append({
        role: "user",
        content: [{ type: "text", text: "Plan a weekend in Lisbon" }],
      });
    });
    await waitFor(() => {
      const [thread] = threads.list();
      expect(thread?.title).toBe("Plan a weekend in Lisbon");
      expect(messages.list(thread!.id)).toHaveLength(2);
    });

    const [thread] = threads.list();
    const rows = messages.list(thread!.id);
    expect(rows.map((row) => [row.format, row.content.role])).toEqual([
      ["ai-sdk/v6", "user"],
      ["ai-sdk/v6", "assistant"],
    ]);
    expect(rows[1]!.parent_id).toBe(rows[0]!.id);

    first.unmount();
    const second = mountApp();
    await waitFor(() =>
      expect(second.runtime().threads.getState().threadIds).toContain(
        thread!.id,
      ),
    );
    await act(async () => {
      await second.runtime().threads.switchToThread(thread!.id);
    });

    await waitFor(() =>
      expect(texts(second.runtime())).toEqual([
        "Plan a weekend in Lisbon",
        "Day one: Alfama.",
      ]),
    );
  });
});

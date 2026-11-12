import { describe, expect, it, vi } from "vitest";
import {
  HttpAgent,
  type AbstractAgent,
  runHttpRequest,
  transformHttpEventStream,
  type RunAgentInput,
} from "@ag-ui/client";
import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/core";
import { AgUiThreadController } from "./AgUiThreadController";
import { makeLogger } from "./logger";

const sse = (events: object[]) =>
  new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );

const inFlightRun = [
  { type: "RUN_STARTED", threadId: "thread", runId: "server-run" },
  { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "Hello " },
  { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "again" },
  { type: "TEXT_MESSAGE_END", messageId: "answer" },
  { type: "RUN_FINISHED", threadId: "thread", runId: "server-run" },
];

class ReconnectingAgent extends HttpAgent {
  readonly connectInputs: RunAgentInput[] = [];

  protected override connect(input: RunAgentInput) {
    this.connectInputs.push(input);
    return transformHttpEventStream(
      runHttpRequest(() =>
        this.fetch(`${this.url}/stream`, {
          signal: this.abortController.signal,
        }),
      ),
    );
  }
}

const storedUser: ThreadMessage = {
  id: "question",
  role: "user",
  content: [{ type: "text", text: "Hi" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const historyOf = (unstableResume: boolean): ThreadHistoryAdapter => ({
  load: vi.fn().mockResolvedValue({
    headId: storedUser.id,
    messages: [{ parentId: null, message: storedUser }],
    ...(unstableResume && { unstable_resume: true }),
  }),
  append: vi.fn().mockResolvedValue(undefined),
});

function setup(
  agent: AbstractAgent,
  unstableResume: boolean,
  onError?: (error: Error) => void,
) {
  return new AgUiThreadController({
    agent,
    logger: makeLogger(),
    showThinking: false,
    history: historyOf(unstableResume),
    ...(onError && { onError }),
  });
}

const fetchFor = (routes: Record<string, object[]>) =>
  vi.fn(async (url: string) => sse(routes[url] ?? []));

const transcript = (core: AgUiThreadController) =>
  core.getMessages().map((message) => ({
    id: message.id,
    role: message.role,
    text: message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
    status: message.role === "assistant" ? message.status?.type : undefined,
  }));

const openStream = (init?: RequestInit) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify(inFlightRun[0])}\n\n`,
          ),
        );
        init?.signal?.addEventListener("abort", () => controller.close(), {
          once: true,
        });
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );

describe("AgUiThreadController reconnect through agent.connect()", () => {
  it("joins the in-flight run instead of starting a new one", async () => {
    const fetch = fetchFor({ "https://agent.test/stream": inFlightRun });
    const agent = new ReconnectingAgent({ url: "https://agent.test", fetch });
    const core = setup(agent, true);

    await core.__internal_load();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://agent.test/stream",
    ]);
    expect(agent.connectInputs).toHaveLength(1);
    expect(transcript(core)).toEqual([
      { id: "question", role: "user", text: "Hi", status: undefined },
      {
        id: "answer",
        role: "assistant",
        text: "Hello again",
        status: "complete",
      },
    ]);
    expect(core.isRunning()).toBe(false);
  });

  it("rejoins the in-flight run after a thread switch", async () => {
    const onError = vi.fn();
    const fetch = fetchFor({ "https://agent.test/stream": inFlightRun });
    const agent = new ReconnectingAgent({ url: "https://agent.test", fetch });
    const core = setup(agent, false, onError);
    await core.__internal_load();

    await core.resumeInFlightRun(core.getMessages());

    expect(onError).not.toHaveBeenCalled();
    expect(transcript(core).map(({ id, text }) => [id, text])).toEqual([
      ["question", "Hi"],
      ["answer", "Hello again"],
    ]);
  });

  it("rejoins through a connect class field without starting a new run", async () => {
    class FieldReconnectingAgent extends HttpAgent {
      protected override connect = (_input: RunAgentInput) =>
        transformHttpEventStream(
          runHttpRequest(() =>
            this.fetch(`${this.url}/stream`, {
              signal: this.abortController.signal,
            }),
          ),
        );
    }
    const fetch = fetchFor({ "https://agent.test/stream": inFlightRun });
    const agent = new FieldReconnectingAgent({
      url: "https://agent.test",
      fetch,
    });
    const core = setup(agent, true);

    await core.__internal_load();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://agent.test/stream",
    ]);
    expect(transcript(core).map(({ id, text }) => [id, text])).toEqual([
      ["question", "Hi"],
      ["answer", "Hello again"],
    ]);
    expect(core.isRunning()).toBe(false);
  });

  it("keeps starting a run for an agent without connect()", async () => {
    const fetch = fetchFor({ "https://agent.test": inFlightRun });
    const agent = new HttpAgent({ url: "https://agent.test", fetch });
    const core = setup(agent, true);

    await core.__internal_load();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://agent.test",
    ]);
    expect(transcript(core).at(-1)).toMatchObject({ text: "Hello again" });
  });

  describe("a rejoined run that replays a messages snapshot", () => {
    const question = { id: "question", role: "user", content: "Hi" };
    const rejoin = async (events: object[]) => {
      const fetch = fetchFor({ "https://agent.test/stream": events });
      const agent = new ReconnectingAgent({ url: "https://agent.test", fetch });
      const core = setup(agent, true);
      await core.__internal_load();
      return core;
    };

    it("continues the answer the snapshot restored", async () => {
      const core = await rejoin([
        { type: "RUN_STARTED", threadId: "thread", runId: "server-run" },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            question,
            { id: "answer", role: "assistant", content: "Hello " },
          ],
        },
        { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "again" },
        { type: "TEXT_MESSAGE_END", messageId: "answer" },
        { type: "RUN_FINISHED", threadId: "thread", runId: "server-run" },
      ]);

      expect(transcript(core)).toEqual([
        { id: "question", role: "user", text: "Hi", status: undefined },
        {
          id: "answer",
          role: "assistant",
          text: "Hello again",
          status: "complete",
        },
      ]);
      expect(core.isRunning()).toBe(false);
    });

    it("keeps a snapshot taken mid-stream from duplicating the answer", async () => {
      const core = await rejoin([
        { type: "RUN_STARTED", threadId: "thread", runId: "server-run" },
        { type: "TEXT_MESSAGE_START", messageId: "answer", role: "assistant" },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "Hello " },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            question,
            { id: "answer", role: "assistant", content: "Hello " },
          ],
        },
        { type: "TEXT_MESSAGE_CONTENT", messageId: "answer", delta: "again" },
        { type: "TEXT_MESSAGE_END", messageId: "answer" },
        { type: "RUN_FINISHED", threadId: "thread", runId: "server-run" },
      ]);

      expect(transcript(core).map(({ id, text }) => [id, text])).toEqual([
        ["question", "Hi"],
        ["answer", "Hello again"],
      ]);
    });

    it("settles a snapshot's pending tool call when the stream ends early", async () => {
      const core = await rejoin([
        { type: "RUN_STARTED", threadId: "thread", runId: "server-run" },
        {
          type: "MESSAGES_SNAPSHOT",
          messages: [
            question,
            {
              id: "answer",
              role: "assistant",
              content: "Let me check.",
              toolCalls: [
                {
                  id: "call",
                  type: "function",
                  function: { name: "lookup", arguments: "{}" },
                },
              ],
            },
          ],
        },
      ]);

      expect(core.isRunning()).toBe(false);
      expect(transcript(core).at(-1)).toMatchObject({
        id: "answer",
        text: "Let me check.",
      });
      const answer = core.getMessages().at(-1);
      expect(answer?.status).toMatchObject({
        type: "incomplete",
        reason: "error",
      });
      expect(
        answer?.content.filter((part) => part.type === "tool-call"),
      ).toMatchObject([{ toolCallId: "call", toolName: "lookup" }]);
    });
  });

  describe("leaving a thread mid-run", () => {
    const startOpenRun = async () => {
      const agent = new ReconnectingAgent({
        url: "https://agent.test",
        fetch: vi.fn(async (_url: string, init?: RequestInit) =>
          openStream(init),
        ),
      });
      const abortRun = vi.spyOn(agent, "abortRun");
      const detachActiveRun = vi.spyOn(agent, "detachActiveRun");
      const core = setup(agent, true);
      void core.__internal_load();
      await vi.waitFor(() => expect(core.isRunning()).toBe(true));
      return { core, abortRun, detachActiveRun };
    };

    it("detaches on a thread switch so the run can be rejoined", async () => {
      const { core, abortRun, detachActiveRun } = await startOpenRun();

      core.resetThreadState();

      expect(detachActiveRun).toHaveBeenCalledTimes(1);
      expect(abortRun).not.toHaveBeenCalled();
      expect(core.isRunning()).toBe(false);
    });

    it("detaches when the runtime unmounts", async () => {
      const { core, abortRun, detachActiveRun } = await startOpenRun();

      core.detachRuntime();

      expect(detachActiveRun).toHaveBeenCalledTimes(1);
      expect(abortRun).not.toHaveBeenCalled();
    });

    it("aborts the run on an explicit cancel", async () => {
      const { core, abortRun, detachActiveRun } = await startOpenRun();

      await core.cancel();

      expect(abortRun).toHaveBeenCalledTimes(1);
      expect(detachActiveRun).not.toHaveBeenCalled();
    });
  });

  describe("with an agent built on another copy of @ag-ui/client", () => {
    // Same shape as AbstractAgent: a root class that defines connect() and
    // connectAgent() and extends nothing, as a second installed copy would.
    class ForeignAbstractAgent {
      threadId = "thread";
      messages: unknown[] = [];
      state = {};
      readonly runAgent = vi.fn(async () => ({ newMessages: [] }));
      readonly connectAgent = vi.fn(async () => ({ newMessages: [] }));
      readonly abortRun = vi.fn();
      readonly detachActiveRun = vi.fn(async () => {});
      connect(): never {
        throw new Error("connect not implemented");
      }
    }
    class ForeignReconnectingAgent extends ForeignAbstractAgent {
      override connect(): never {
        throw new Error("unused");
      }
    }
    const asAgent = (agent: ForeignAbstractAgent) =>
      agent as unknown as AbstractAgent;

    it("starts a run for a stock agent", async () => {
      const agent = new ForeignAbstractAgent();
      await setup(asAgent(agent), true).__internal_load();

      expect(agent.runAgent).toHaveBeenCalledTimes(1);
      expect(agent.connectAgent).not.toHaveBeenCalled();
    });

    it("rejoins through connectAgent() for an agent that overrides connect()", async () => {
      const agent = new ForeignReconnectingAgent();
      await setup(asAgent(agent), true).__internal_load();

      expect(agent.connectAgent).toHaveBeenCalledTimes(1);
      expect(agent.runAgent).not.toHaveBeenCalled();
    });
  });
});

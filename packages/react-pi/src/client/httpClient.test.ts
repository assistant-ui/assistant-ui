import { describe, expect, it, onTestFinished, vi } from "vitest";
import { createPiHttpClient } from "./httpClient";
import type {
  PiAnyClientEvent,
  PiThreadMetadata,
  PiThreadSnapshot,
} from "../types";

type Call = { url: string; method: string; body: unknown };

/** A fake `fetch` that records calls and returns whatever `responder` yields. */
const fakeFetch = (responder: (url: string) => Response) => {
  const calls: Call[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      body:
        typeof init?.body === "string"
          ? JSON.parse(init.body as string)
          : undefined,
    });
    return responder(url);
  }) as unknown as typeof fetch;
  return { fn, calls };
};

const json = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const sseResponse = (
  event: PiAnyClientEvent,
  { keepOpen = false }: { keepOpen?: boolean } = {},
): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
        );
        if (!keepOpen) controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );

const snapshot: PiThreadSnapshot = {
  metadata: { id: "t1", status: "idle" },
  messages: [],
};

const openSharedSse = () => {
  const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  const fetchImpl = vi.fn(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controllers.push(controller);
          },
        }),
        {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        },
      ),
  ) as unknown as typeof fetch;
  const client = createPiHttpClient({
    fetchImpl,
    reconnectDelay: () => Promise.resolve(),
    streamCloseDelayMs: 0,
  });
  const send = (index: number, event: PiAnyClientEvent) => {
    controllers[index]!.enqueue(
      new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
    );
  };
  const close = (index: number) => {
    controllers[index]!.close();
  };
  return { client, fetchImpl, send, close };
};

const snapshotAt = (
  seq: number,
  status: "idle" | "running" = "idle",
  messages: PiThreadSnapshot["messages"] = [],
) =>
  ({
    type: "snapshot",
    threadId: "t1",
    seq,
    snapshot: {
      metadata: { id: "t1", status, messageCount: messages.length },
      messages,
    },
  }) satisfies PiAnyClientEvent;

describe("createPiHttpClient", () => {
  it("lists threads with workspace + archived query params", async () => {
    const threads: PiThreadMetadata[] = [{ id: "t1", status: "idle" }];
    const { fn, calls } = fakeFetch(() => json(threads));
    const client = createPiHttpClient({ fetchImpl: fn });

    const result = await client.listThreads({
      workspacePath: "/ws",
      includeArchived: true,
    });

    expect(result).toEqual(threads);
    expect(calls[0]!.method).toBe("GET");
    expect(calls[0]!.url).toBe(
      "/api/pi/threads?workspacePath=%2Fws&includeArchived=true",
    );
  });

  it("omits empty query params when listing", async () => {
    const { fn, calls } = fakeFetch(() => json([]));
    await createPiHttpClient({ fetchImpl: fn }).listThreads();
    expect(calls[0]!.url).toBe("/api/pi/threads");
  });

  it("creates a thread by POSTing the input and parses the snapshot", async () => {
    const { fn, calls } = fakeFetch(() => json(snapshot));
    const client = createPiHttpClient({ fetchImpl: fn });

    const result = await client.createThread({ workspacePath: "/ws" });

    expect(result).toEqual(snapshot);
    expect(calls[0]).toMatchObject({
      url: "/api/pi/threads",
      method: "POST",
      body: { workspacePath: "/ws" },
    });
  });

  it("fetches a thread snapshot by id", async () => {
    const { fn, calls } = fakeFetch(() => json(snapshot));
    await createPiHttpClient({ fetchImpl: fn }).getThread("a/b");
    expect(calls[0]!.method).toBe("GET");
    // The id is URL-encoded into the path.
    expect(calls[0]!.url).toBe("/api/pi/threads/a%2Fb");
  });

  it("accepts activity flags on thread snapshots", async () => {
    const snapshotWithActivity = {
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        status: "running" as const,
        compactionActive: true,
        retryActive: true,
        retryAttempt: 2,
      },
      seq: 7,
    };
    const { fn } = fakeFetch(() => json(snapshotWithActivity));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).resolves.toEqual(snapshotWithActivity);
  });

  it("sends a message wrapped as { input }", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    await createPiHttpClient({ fetchImpl: fn }).sendMessage("t1", {
      content: "hi",
      streamingBehavior: "steer",
    });
    expect(calls[0]).toMatchObject({
      url: "/api/pi/threads/t1/messages",
      method: "POST",
      body: { input: { content: "hi", streamingBehavior: "steer" } },
    });
  });

  it("cancels and renames a thread", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    const client = createPiHttpClient({ fetchImpl: fn });

    await client.cancelRun("t1");
    await client.renameThread("t1", "New title");

    expect(calls[0]).toMatchObject({
      url: "/api/pi/threads/t1/cancel",
      method: "POST",
    });
    expect(calls[1]).toMatchObject({
      url: "/api/pi/threads/t1",
      method: "PATCH",
      body: { title: "New title" },
    });
  });

  it("clears the queue and parses the cleared text", async () => {
    const { fn, calls } = fakeFetch(() =>
      json({ steering: ["a"], followUp: ["b"] }),
    );
    const client = createPiHttpClient({ fetchImpl: fn });

    const cleared = await client.clearQueue("t1");

    expect(calls[0]).toMatchObject({
      url: "/api/pi/threads/t1/queue/clear",
      method: "POST",
    });
    expect(cleared).toEqual({ steering: ["a"], followUp: ["b"] });
  });

  it("gets models and sets model/thinking through routes", async () => {
    const { fn, calls } = fakeFetch((url) =>
      url.startsWith("/api/pi/models")
        ? json([{ provider: "anthropic", modelId: "claude" }])
        : new Response(null, { status: 204 }),
    );
    const client = createPiHttpClient({ fetchImpl: fn });

    await expect(
      client.getAvailableModels({ workspacePath: "/ws" }),
    ).resolves.toEqual([{ provider: "anthropic", modelId: "claude" }]);
    await client.setModel("t1", { provider: "anthropic", modelId: "claude" });
    await client.setThinkingLevel("t1", "high");

    expect(calls[0]).toMatchObject({
      url: "/api/pi/models?workspacePath=%2Fws",
      method: "GET",
    });
    expect(calls[1]).toMatchObject({
      url: "/api/pi/threads/t1/model",
      method: "POST",
      body: { provider: "anthropic", modelId: "claude" },
    });
    expect(calls[2]).toMatchObject({
      url: "/api/pi/threads/t1/thinking",
      method: "POST",
      body: { level: "high" },
    });
  });

  it("archives, unarchives, and deletes threads", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    const client = createPiHttpClient({ fetchImpl: fn });

    await client.archiveThread("t1");
    await client.unarchiveThread("t1");
    await client.deleteThread("t1");

    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ["POST", "/api/pi/threads/t1/archive"],
      ["POST", "/api/pi/threads/t1/unarchive"],
      ["DELETE", "/api/pi/threads/t1"],
    ]);
  });

  it("posts a host-ui response wrapped as { response }", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    await createPiHttpClient({ fetchImpl: fn }).respondToHostUiRequest("t1", {
      requestId: "r1",
      confirmed: true,
    });
    expect(calls[0]).toMatchObject({
      url: "/api/pi/threads/t1/host-ui",
      method: "POST",
      body: { response: { requestId: "r1", confirmed: true } },
    });
  });

  it("throws with the response body on a non-2xx status", async () => {
    const { fn } = fakeFetch(
      () => new Response("session not found", { status: 404 }),
    );
    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("missing"),
    ).rejects.toThrow(/404.*session not found/s);
  });

  it("rejects a malformed thread list response", async () => {
    const { fn } = fakeFetch(() => json({}));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).listThreads(),
    ).rejects.toThrow(
      "Invalid Pi HTTP response while listing threads: expected an array of threads.",
    );
  });

  it("identifies malformed thread metadata by index", async () => {
    const { fn } = fakeFetch(() => json([{ id: "t1" }]));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).listThreads(),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while listing threads: thread at index 0 must have a non-empty string "id", a string "status", and correctly typed known fields.',
    );
  });

  it("rejects malformed known thread metadata fields", async () => {
    const { fn } = fakeFetch(() =>
      json([{ id: "t1", status: "idle", archived: "yes" }]),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).listThreads(),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while listing threads: thread at index 0 must have a non-empty string "id", a string "status", and correctly typed known fields.',
    );
  });

  it("accepts unknown enum values from newer Pi servers", async () => {
    const thread = {
      id: "t1",
      status: "paused",
      queuedMessages: [{ id: "q1", mode: "priority", content: "later" }],
    };
    const listFetch = fakeFetch(() => json([thread])).fn;
    const snapshotWithUnknownValues = {
      metadata: thread,
      messages: [{ role: "futureRole" }],
      hostUiRequests: [{ id: "r1", kind: "form" }],
    };
    const snapshotFetch = fakeFetch(() => json(snapshotWithUnknownValues)).fn;

    await expect(
      createPiHttpClient({ fetchImpl: listFetch }).listThreads(),
    ).resolves.toEqual([thread]);
    await expect(
      createPiHttpClient({ fetchImpl: snapshotFetch }).getThread("t1"),
    ).resolves.toEqual(snapshotWithUnknownValues);
  });

  it("rejects malformed thread snapshots", async () => {
    const { fn } = fakeFetch(() => json({ metadata: snapshot.metadata }));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while fetching a thread: expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  });

  it("rejects malformed known transcript messages", async () => {
    const { fn } = fakeFetch(() =>
      json({
        ...snapshot,
        messages: [{ role: "assistant" }],
      }),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while fetching a thread: expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  });

  it("accepts renderable messages with missing or null scalar metadata", async () => {
    const message = {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      responseModel: null,
      errorMessage: null,
    };
    const response = { ...snapshot, messages: [message] };
    const { fn } = fakeFetch(() => json(response));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).resolves.toEqual(response);
  });

  it("accepts tool calls with null arguments", async () => {
    const response = {
      ...snapshot,
      messages: [
        {
          role: "assistant",
          content: [
            { type: "toolCall", id: "tc1", name: "search", arguments: null },
          ],
        },
      ],
    };
    const { fn } = fakeFetch(() => json(response));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).resolves.toEqual(response);
  });

  it("rejects bash executions without a command", async () => {
    const { fn } = fakeFetch(() =>
      json({
        ...snapshot,
        messages: [{ role: "bashExecution", output: "x" }],
      }),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while fetching a thread: expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  });

  it("accepts renderable bash executions without scalar metadata", async () => {
    const response = {
      ...snapshot,
      messages: [{ role: "bashExecution", command: "ls", output: "x" }],
    };
    const { fn } = fakeFetch(() => json(response));

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).resolves.toEqual(response);
  });

  it("rejects tool results without a tool call id", async () => {
    const { fn } = fakeFetch(() =>
      json({
        ...snapshot,
        messages: [{ role: "toolResult", content: [] }],
      }),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while fetching a thread: expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  });

  it("rejects malformed known host UI request shapes", async () => {
    const { fn } = fakeFetch(() =>
      json({
        ...snapshot,
        hostUiRequests: [{ id: "r1", kind: "select", title: "Choose" }],
      }),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).getThread("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while fetching a thread: expected a thread snapshot with valid "metadata", a "messages" array, and valid host UI requests when present.',
    );
  });

  it("rejects malformed queue and model responses", async () => {
    const queueFetch = fakeFetch(() =>
      json({ steering: [1], followUp: [] }),
    ).fn;
    const modelFetch = fakeFetch(() => json([{ provider: "anthropic" }])).fn;

    await expect(
      createPiHttpClient({ fetchImpl: queueFetch }).clearQueue("t1"),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while clearing a thread queue: expected an object with string arrays "steering" and "followUp".',
    );
    await expect(
      createPiHttpClient({ fetchImpl: modelFetch }).getAvailableModels(),
    ).rejects.toThrow(
      'Invalid Pi HTTP response while listing models: model at index 0 must have non-empty string "provider" and "modelId" fields.',
    );
  });

  it("adds operation context to invalid JSON errors", async () => {
    const { fn } = fakeFetch(
      () =>
        new Response("not json", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    );

    await expect(
      createPiHttpClient({ fetchImpl: fn }).listThreads(),
    ).rejects.toThrow(
      "Invalid Pi HTTP response while listing threads: expected valid JSON.",
    );
  });

  it("honors a custom baseUrl", async () => {
    const { fn, calls } = fakeFetch(() => json([]));
    await createPiHttpClient({
      fetchImpl: fn,
      baseUrl: "https://host.example/pi/",
    }).listThreads();
    expect(calls[0]!.url).toBe("https://host.example/pi/threads");
  });

  it("subscribes via SSE and forwards parsed events", async () => {
    const event: PiAnyClientEvent = {
      type: "agent_start",
      threadId: "t1",
      seq: 1,
    };
    const { fn } = fakeFetch((url) => {
      expect(url).toBe("/api/pi/threads/t1/events");
      return sseResponse(event);
    });

    const client = createPiHttpClient({
      fetchImpl: fn,
      reconnectDelay: () => Promise.resolve(),
      streamCloseDelayMs: 0,
    });

    const events: PiAnyClientEvent[] = [];
    await new Promise<void>((resolve) => {
      const unsubscribe = client.subscribe("t1", (event) => {
        events.push(event);
        unsubscribe();
        resolve();
      });
    });

    expect(events).toEqual([event]);
  });

  it("isolates listener errors while delivering shared stream events", async () => {
    const event: PiAnyClientEvent = {
      type: "agent_start",
      threadId: "t1",
      seq: 1,
    };
    const { fn } = fakeFetch(() => sseResponse(event, { keepOpen: true }));
    const onStreamError = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());
    const client = createPiHttpClient({
      fetchImpl: fn,
      onStreamError,
      streamCloseDelayMs: 0,
    });

    const listenerError = new Error("listener failed");
    const unsubscribeFirst = client.subscribe("t1", () => {
      throw listenerError;
    });

    const received = await new Promise<PiAnyClientEvent>((resolve) => {
      const unsubscribeSecond = client.subscribe("t1", (receivedEvent) => {
        unsubscribeFirst();
        unsubscribeSecond();
        resolve(receivedEvent);
      });
    });

    expect(received).toEqual(event);
    expect(onStreamError).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[react-pi] Listener threw an error",
      listenerError,
    );
  });

  it("replays a current cached snapshot to a late subscriber", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const initialSnapshot = snapshotAt(1);
    send(0, initialSnapshot);
    await vi.waitFor(() => expect(firstEvents).toEqual([initialSnapshot]));

    const replayTasks: (() => void)[] = [];
    const queueMicrotaskSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((task) => replayTasks.push(task));
    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });

    expect(replayTasks).toHaveLength(1);
    queueMicrotaskSpy.mockRestore();

    const agentStart = {
      type: "agent_start",
      threadId: "t1",
      seq: 2,
    } satisfies PiAnyClientEvent;
    send(0, agentStart);
    await vi.waitFor(() =>
      expect(firstEvents).toEqual([initialSnapshot, agentStart]),
    );
    expect(lateEvents).toEqual([]);

    replayTasks[0]!();
    await vi.waitFor(() => expect(lateEvents).toEqual(firstEvents));
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeLate();
  });

  it("shares one snapshot refresh and keeps out-of-band errors", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const outOfBandError = {
      type: "error",
      threadId: "t1",
      seq: 0,
      error: "subscription failed",
    } satisfies PiAnyClientEvent;
    const staleError = {
      type: "error",
      threadId: "t1",
      seq: 1,
      error: "stale failure",
    } satisfies PiAnyClientEvent;
    const agentEnd = {
      type: "agent_end",
      threadId: "t1",
      seq: 3,
    } satisfies PiAnyClientEvent;
    send(0, outOfBandError);
    send(0, staleError);
    send(0, agentEnd);
    await vi.waitFor(() =>
      expect(firstEvents.length).toBeGreaterThanOrEqual(5),
    );
    const refreshed = snapshotAt(2, "running");
    send(1, refreshed);

    await vi.waitFor(() =>
      expect(lateEvents).toEqual([refreshed, outOfBandError, agentEnd]),
    );

    unsubscribeFirst();
    unsubscribeLate();
  });

  it("dedupes concurrent stale-snapshot refreshes", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));
    const secondEvents: PiAnyClientEvent[] = [];
    const thirdEvents: PiAnyClientEvent[] = [];
    const unsubscribeSecond = client.subscribe("t1", (event) => {
      secondEvents.push(event);
    });
    const unsubscribeThird = client.subscribe("t1", (event) => {
      thirdEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const refreshed = snapshotAt(2);
    send(1, refreshed);
    await vi.waitFor(() => expect(secondEvents).toEqual([refreshed]));
    await vi.waitFor(() => expect(thirdEvents).toEqual([refreshed]));
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    unsubscribeSecond();
    unsubscribeThird();
  });

  it("starts a follow-up refresh when a listener joins after the helper snapshot", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const sixthEvents: PiAnyClientEvent[] = [];
    const unsubscribeSixth = client.subscribe("t1", (event) => {
      sixthEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const eventDuringSharedLoad = {
      type: "agent_end",
      threadId: "t1",
      seq: 3,
    } satisfies PiAnyClientEvent;
    send(0, eventDuringSharedLoad);
    await vi.waitFor(() => expect(firstEvents).toHaveLength(3));

    const seventhEvents: PiAnyClientEvent[] = [];
    const unsubscribeSeventh = client.subscribe("t1", (event) => {
      seventhEvents.push(event);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const snapshotBeforeSeventhJoin = snapshotAt(2, "running");
    send(1, snapshotBeforeSeventhJoin);
    await vi.waitFor(() =>
      expect(sixthEvents).toEqual([
        snapshotBeforeSeventhJoin,
        eventDuringSharedLoad,
      ]),
    );
    expect(seventhEvents).toEqual([]);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3));

    const snapshotForSeventh = snapshotAt(3, "idle");
    send(2, snapshotForSeventh);
    await vi.waitFor(() => expect(seventhEvents).toEqual([snapshotForSeventh]));

    unsubscribeFirst();
    unsubscribeSixth();
    unsubscribeSeventh();
  });

  it("keeps the highest-sequence snapshot when the main stream overtakes a helper", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const eighthEvents: PiAnyClientEvent[] = [];
    const unsubscribeEighth = client.subscribe("t1", (event) => {
      eighthEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const newerMainSnapshot = snapshotAt(4, "idle");
    send(0, newerMainSnapshot);
    await vi.waitFor(() =>
      expect(firstEvents.at(-1)).toEqual(newerMainSnapshot),
    );

    const olderHelperSnapshot = snapshotAt(3, "running");
    send(1, olderHelperSnapshot);
    await vi.waitFor(() =>
      expect(eighthEvents).toEqual([olderHelperSnapshot, newerMainSnapshot]),
    );

    const ninthEvents: PiAnyClientEvent[] = [];
    const unsubscribeNinth = client.subscribe("t1", (event) => {
      ninthEvents.push(event);
    });
    await vi.waitFor(() => expect(ninthEvents).toEqual([newerMainSnapshot]));
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    unsubscribeEighth();
    unsubscribeNinth();
  });

  it("delivers a delayed older main snapshot only to listeners behind it", async () => {
    const { client, fetchImpl, send } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const newerHelperSnapshot = snapshotAt(4, "idle");
    send(1, newerHelperSnapshot);
    await vi.waitFor(() => expect(lateEvents).toEqual([newerHelperSnapshot]));

    const delayedMainSnapshot = snapshotAt(3, "running");
    send(0, delayedMainSnapshot);
    await vi.waitFor(() =>
      expect(firstEvents).toEqual([
        snapshotAt(1),
        { type: "agent_start", threadId: "t1", seq: 2 },
        delayedMainSnapshot,
      ]),
    );
    expect(lateEvents).toEqual([newerHelperSnapshot]);

    const cachedEvents: PiAnyClientEvent[] = [];
    const unsubscribeCached = client.subscribe("t1", (event) => {
      cachedEvents.push(event);
    });
    await vi.waitFor(() => expect(cachedEvents).toEqual([newerHelperSnapshot]));
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    unsubscribeLate();
    unsubscribeCached();
  });

  it("rebases the cache when the main stream reconnects", async () => {
    const { client, fetchImpl, send, close } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    const preReconnectSnapshot = snapshotAt(50);
    send(1, preReconnectSnapshot);
    await vi.waitFor(() => expect(lateEvents).toEqual([preReconnectSnapshot]));

    close(0);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3));
    const reconnectSnapshot = snapshotAt(1, "running");
    send(2, reconnectSnapshot);
    await vi.waitFor(() =>
      expect(firstEvents.at(-1)).toEqual(reconnectSnapshot),
    );
    await vi.waitFor(() =>
      expect(lateEvents).toEqual([preReconnectSnapshot, reconnectSnapshot]),
    );

    const cachedEvents: PiAnyClientEvent[] = [];
    const unsubscribeCached = client.subscribe("t1", (event) => {
      cachedEvents.push(event);
    });
    await vi.waitFor(() => expect(cachedEvents).toEqual([reconnectSnapshot]));
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    unsubscribeFirst();
    unsubscribeLate();
    unsubscribeCached();
  });

  it("flushes pending listeners when a reconnect reports an error instead of a snapshot", async () => {
    const { client, fetchImpl, send, close } = openSharedSse();
    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(0, snapshotAt(1));
    send(0, { type: "agent_start", threadId: "t1", seq: 2 });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    close(0);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3));
    const openFailure = {
      type: "error",
      threadId: "t1",
      seq: 0,
      error: "session open failed",
    } satisfies PiAnyClientEvent;
    send(2, openFailure);

    await vi.waitFor(() => expect(lateEvents).toEqual([openFailure]));
    expect(firstEvents.at(-1)).toEqual(openFailure);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    unsubscribeFirst();
    unsubscribeLate();
  });

  it("caps stale snapshot retries after a server sequence reset", async () => {
    const streamControllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamControllers.push(controller);
            },
          }),
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        ),
    ) as unknown as typeof fetch;
    const client = createPiHttpClient({
      fetchImpl,
      streamCloseDelayMs: 0,
    });
    const send = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      event: PiAnyClientEvent,
    ) => {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    };
    const snapshotAt = (seq: number) =>
      ({
        type: "snapshot",
        threadId: "t1",
        seq,
        snapshot,
      }) satisfies PiAnyClientEvent;

    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    send(streamControllers[0]!, snapshotAt(50));
    send(streamControllers[0]!, {
      type: "agent_start",
      threadId: "t1",
      seq: 51,
    });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const resetSnapshot = snapshotAt(1);
    send(streamControllers[0]!, resetSnapshot);
    send(streamControllers[1]!, resetSnapshot);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3));
    send(streamControllers[2]!, resetSnapshot);

    await vi.waitFor(() => expect(lateEvents).toEqual([resetSnapshot]));
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    const nextEvents: PiAnyClientEvent[] = [];
    const unsubscribeNext = client.subscribe("t1", (event) => {
      nextEvents.push(event);
    });
    await vi.waitFor(() => expect(nextEvents).toEqual([resetSnapshot]));
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    unsubscribeFirst();
    unsubscribeLate();
    unsubscribeNext();
  });

  it("falls back to live events when a snapshot refresh fails", async () => {
    const streamControllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamControllers.push(controller);
            },
          }),
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        ),
    ) as unknown as typeof fetch;
    const client = createPiHttpClient({
      fetchImpl,
      streamCloseDelayMs: 0,
    });

    const firstEvents: PiAnyClientEvent[] = [];
    const unsubscribeFirst = client.subscribe("t1", (event) => {
      firstEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const send = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      event: PiAnyClientEvent,
    ) => {
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    };
    send(streamControllers[0]!, {
      type: "snapshot",
      threadId: "t1",
      seq: 1,
      snapshot,
    });
    send(streamControllers[0]!, {
      type: "agent_start",
      threadId: "t1",
      seq: 2,
    });
    await vi.waitFor(() => expect(firstEvents).toHaveLength(2));

    const lateEvents: PiAnyClientEvent[] = [];
    const unsubscribeLate = client.subscribe("t1", (event) => {
      lateEvents.push(event);
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    const liveEvent = {
      type: "agent_end",
      threadId: "t1",
      seq: 3,
    } satisfies PiAnyClientEvent;
    const snapshotError = {
      type: "error",
      threadId: "t1",
      seq: 0,
      error: "snapshot unavailable",
    } satisfies PiAnyClientEvent;
    send(streamControllers[0]!, liveEvent);
    send(streamControllers[1]!, snapshotError);
    await vi.waitFor(() =>
      expect(lateEvents).toEqual([snapshotError, liveEvent]),
    );

    const nextLiveEvent = {
      type: "agent_start",
      threadId: "t1",
      seq: 4,
    } satisfies PiAnyClientEvent;
    send(streamControllers[0]!, nextLiveEvent);
    await vi.waitFor(() =>
      expect(lateEvents).toEqual([snapshotError, liveEvent, nextLiveEvent]),
    );

    const timeoutEvents: PiAnyClientEvent[] = [];
    let unsubscribeTimeout = () => {};
    vi.useFakeTimers();
    try {
      unsubscribeTimeout = client.subscribe("t1", (event) => {
        timeoutEvents.push(event);
      });
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(10_000);
    } finally {
      vi.useRealTimers();
    }

    const postTimeoutEvent = {
      type: "agent_end",
      threadId: "t1",
      seq: 5,
    } satisfies PiAnyClientEvent;
    send(streamControllers[0]!, postTimeoutEvent);
    await vi.waitFor(() => expect(timeoutEvents).toEqual([postTimeoutEvent]));

    unsubscribeFirst();
    unsubscribeLate();
    unsubscribeTimeout();
  });

  it("can subscribe to live events without an initial snapshot", async () => {
    const { fn, calls } = fakeFetch(() => new Response(null, { status: 204 }));
    const client = createPiHttpClient({
      fetchImpl: fn,
      streamCloseDelayMs: 0,
    });

    const unsubscribe = client.subscribe("t1", () => {}, {
      includeSnapshot: false,
    });
    unsubscribe();

    expect(calls[0]!.url).toBe("/api/pi/threads/t1/events?snapshot=false");
  });

  it("shares cookie-authenticated streams only within one client", async () => {
    let browserIdentity = "user-a";
    const openedAs: string[] = [];
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        openedAs.push(browserIdentity);
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              init?.signal?.addEventListener(
                "abort",
                () => controller.close(),
                { once: true },
              );
            },
          }),
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        );
      },
    ) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchImpl);

    const unsubscribers: (() => void)[] = [];
    try {
      const clientA = createPiHttpClient({ streamCloseDelayMs: 0 });
      unsubscribers.push(clientA.subscribe("t1", () => {}));
      unsubscribers.push(clientA.subscribe("t1", () => {}));

      await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));

      browserIdentity = "user-b";
      const clientB = createPiHttpClient({ streamCloseDelayMs: 0 });
      unsubscribers.push(clientB.subscribe("t1", () => {}));

      await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
      expect(openedAs).toEqual(["user-a", "user-b"]);
    } finally {
      for (const unsubscribe of unsubscribers) unsubscribe();
      vi.unstubAllGlobals();
    }
  });
});

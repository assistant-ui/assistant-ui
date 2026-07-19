import { describe, expect, it } from "vitest";
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

const snapshot: PiThreadSnapshot = {
  metadata: { id: "t1", status: "idle" },
  messages: [],
};

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
    const frame = (event: PiAnyClientEvent) =>
      `data: ${JSON.stringify(event)}\n\n`;
    const fn = (async (url: string) => {
      expect(url).toBe("/api/pi/threads/t1/events");
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                frame({ type: "agent_start", threadId: "t1", seq: 1 }),
              ),
            );
            controller.close();
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    }) as unknown as typeof fetch;

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

    expect(events).toEqual([{ type: "agent_start", threadId: "t1", seq: 1 }]);
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
});

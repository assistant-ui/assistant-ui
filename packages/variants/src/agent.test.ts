import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_POLL_MS, createAgentLink } from "./agent";
import { NOTES_ENDPOINT } from "./notes";
import { createStore, type Store } from "./store";

let store: Store;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/page");
  store = createStore();
  store.register({
    id: "demo-cta",
    label: "CTA",
    variants: [
      { id: "button", label: "Button" },
      { id: "link", label: "Link" },
    ],
    defaultId: "link",
    persist: false,
    parent: undefined,
  });
});

afterEach(() => {
  store.reset();
  vi.useRealTimers();
});

describe("agent link", () => {
  it("polls while active, resumes after the last event, and maps events to the sent groups", async () => {
    const outbox: unknown[] = [{ id: "o-old", re: "r-old", type: "done" }];
    const urls: string[] = [];
    let connected = true;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        if (init?.method === "POST") return json({ id: "r-1" }, 201);
        const after = new URL(url, "http://x").searchParams.get("after");
        const index = outbox.findIndex(
          (event) => (event as { id: string }).id === after,
        );
        return json({ connected, events: outbox.slice(index + 1) });
      },
    );
    const reload = vi.fn();
    const link = createAgentLink(store, fetcher as typeof fetch, reload);

    link.setActive(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(urls[0]).toBe(`${NOTES_ENDPOINT}/agent`);
    expect(store.getSnapshot().agent).toEqual({ connected: true, status: {} });

    expect(await link.send("choose")).toBeUndefined();
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      kind: "choose",
      pairs: ["demo-cta:link"],
      notes: [],
      page: "http://localhost:3000/page?variant=demo-cta:link",
    });
    expect(store.getSnapshot().agent.status["demo-cta"]).toMatchObject({
      type: "sent",
    });

    outbox.push({ id: "o-1", re: "r-1", type: "ack" });
    await vi.advanceTimersByTimeAsync(AGENT_POLL_MS);
    expect(urls.at(-1)).toBe(`${NOTES_ENDPOINT}/agent?after=o-old`);
    expect(store.getSnapshot().agent.status["demo-cta"]).toEqual({
      type: "ack",
      text: "Working on it",
      ok: undefined,
    });

    outbox.push(
      { id: "o-2", re: "r-1", type: "status", text: "editing Hero.tsx" },
      { id: "o-3", re: "r-1", type: "done", ok: true, reload: true },
    );
    await vi.advanceTimersByTimeAsync(AGENT_POLL_MS);
    expect(urls.at(-1)).toBe(`${NOTES_ENDPOINT}/agent?after=o-1`);
    expect(store.getSnapshot().agent.status["demo-cta"]).toEqual({
      type: "done",
      text: "Done",
      ok: true,
    });
    expect(reload).toHaveBeenCalledTimes(1);

    connected = false;
    await vi.advanceTimersByTimeAsync(AGENT_POLL_MS);
    expect(store.getSnapshot().agent.connected).toBe(false);

    link.setActive(false);
    const count = urls.length;
    await vi.advanceTimersByTimeAsync(AGENT_POLL_MS * 3);
    expect(urls).toHaveLength(count);
  });

  it("reports send failures and ignores failed polls", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST")
          return json({ error: "no agent is connected" }, 409);
        return json({ error: "boom" }, 500);
      },
    );
    const link = createAgentLink(store, fetcher as typeof fetch, vi.fn());
    await link.poll();
    expect(store.getSnapshot().agent.connected).toBe(false);
    expect(await link.send("apply", "demo-cta")).toBe("no agent is connected");
    const offline = createAgentLink(
      store,
      (async () => {
        throw new TypeError("offline");
      }) as typeof fetch,
      vi.fn(),
    );
    await offline.poll();
    expect(await offline.send("choose")).toBe("could not reach the dev server");
  });

  it("uses fetch and reloads the page by default", async () => {
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status });
    let polls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === "POST"
          ? reply({ id: "r-1" }, 201)
          : reply({
              connected: true,
              events:
                polls++ === 0
                  ? []
                  : [{ id: "o-1", re: "r-1", type: "done", reload: true }],
            }),
      ),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const link = createAgentLink(store);
      await link.poll();
      await link.send("choose");
      await link.poll();
      expect(store.getSnapshot().agent.status["demo-cta"]?.type).toBe("done");
    } finally {
      error.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("keeps events that arrive before send learns its request id", async () => {
    let answer!: (response: Response) => void;
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST")
          return new Promise<Response>((resolve) => (answer = resolve));
        return json({
          connected: true,
          events: [
            { id: "o-1", re: "r-1", type: "ack" },
            { id: "o-2", re: "r-1", type: "done", ok: true, reload: true },
          ],
        });
      },
    );
    const reload = vi.fn();
    const link = createAgentLink(store, fetcher as typeof fetch, reload);
    const sending = link.send("choose");
    await link.poll();
    answer(json({ id: "r-1" }, 201));
    expect(await sending).toBeUndefined();
    expect(store.getSnapshot().agent.status["demo-cta"]).toEqual({
      type: "done",
      text: "Done",
      ok: true,
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("buffers only the latest early event per request", async () => {
    let answer!: (response: Response) => void;
    const events = [
      ...Array.from({ length: 500 }, (_, i) => ({
        id: `o-${i}`,
        re: "r-1",
        type: "status",
        text: `step ${i}`,
      })),
      { id: "o-done", re: "r-1", type: "done", ok: true },
      { id: "o-late", re: "r-1", type: "status", text: "late" },
    ];
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST")
          return new Promise<Response>((resolve) => (answer = resolve));
        return json({ connected: true, events });
      },
    );
    const link = createAgentLink(store, fetcher as typeof fetch, vi.fn());
    const sending = link.send("choose");
    await link.poll();
    answer(json({ id: "r-1" }, 201));
    await sending;
    expect(store.getSnapshot().agent.status["demo-cta"]).toMatchObject({
      type: "done",
    });
  });

  it("describes failed and plain status events", async () => {
    const events = [
      { id: "o-1", re: "r-1", type: "status" },
      { id: "o-2", re: "r-1", type: "done", ok: false },
    ];
    let step = 0;
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") return json({ id: "r-1" }, 201);
        return json({ connected: true, events: events.slice(step, ++step) });
      },
    );
    const link = createAgentLink(store, fetcher as typeof fetch, vi.fn());
    await link.send("choose");
    step = 0;
    await link.poll();
    expect(store.getSnapshot().agent.status["demo-cta"]?.text).toBe("Working");
    await link.poll();
    expect(store.getSnapshot().agent.status["demo-cta"]).toEqual({
      type: "done",
      text: "Failed",
      ok: false,
    });
  });
});

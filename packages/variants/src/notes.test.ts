import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNotes,
  describeTarget,
  NOTES_ENDPOINT,
  SESSION_NOTES_KEY,
} from "./notes";
import { createStore, type Store } from "./store";

let store: Store;

const register = () =>
  store.register({
    id: "demo-cta",
    label: "CTA",
    variants: [
      { id: "button", label: "Button" },
      { id: "link", label: "Link" },
    ],
    defaultId: undefined,
    persist: false,
    parent: undefined,
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  store = createStore();
  window.sessionStorage.clear();
});

afterEach(() => {
  store.reset();
  vi.restoreAllMocks();
});

describe("server mode", () => {
  it("probes, lists, adds and deletes through the endpoints", async () => {
    register();
    const calls: [string, RequestInit | undefined][] = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push([url, init]);
        if (url.endsWith("/ping")) return json({ ok: true, version: 1 });
        if (url.includes("/notes?"))
          return json({
            notes: [
              {
                id: "n-00000001",
                group: "demo-cta",
                variant: "link",
                note: "arrow",
                file: "src/page.tsx",
                line: 7,
              },
            ],
          });
        if (init?.method === "POST") return json({ id: "n-00000002" }, 201);
        return json({ ok: true });
      },
    );
    const notes = createNotes(store, fetcher as typeof fetch);
    await notes.probe();
    expect(notes.mode).toBe("server");
    expect(store.getSnapshot().notesMode).toBe("server");
    expect(store.getSnapshot().notes).toEqual([
      expect.objectContaining({ id: "n-00000001", source: "file" }),
    ]);
    expect(calls[0]).toEqual([
      `${NOTES_ENDPOINT}/ping`,
      { headers: { "x-variants": "1" } },
    ]);
    expect(calls[1]![0]).toBe(`${NOTES_ENDPOINT}/notes?groups=demo-cta`);

    expect(
      await notes.add({
        group: "demo-cta",
        variant: "link",
        note: "bigger",
        hint: "a",
      }),
    ).toBeUndefined();
    const post = calls.find(([, init]) => init?.method === "POST")!;
    expect(post[1]).toMatchObject({
      headers: { "x-variants": "1", "content-type": "application/json" },
      body: JSON.stringify({
        group: "demo-cta",
        variant: "link",
        note: "bigger",
        hint: "a",
      }),
    });

    await notes.remove(store.getSnapshot().notes[0]!);
    expect(
      calls.some(
        ([url, init]) =>
          init?.method === "DELETE" &&
          url === `${NOTES_ENDPOINT}/notes/n-00000001?group=demo-cta`,
      ),
    ).toBe(true);
  });

  it("returns the server's error when a note cannot be written", async () => {
    register();
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/ping")) return json({ ok: true });
        if (init?.method === "POST") return json({ error: "not found" }, 404);
        return json({ notes: [] });
      },
    );
    const notes = createNotes(store, fetcher as typeof fetch);
    await notes.probe();
    expect(
      await notes.add({
        group: "demo-cta",
        variant: undefined,
        note: "x",
        hint: undefined,
      }),
    ).toBe("not found");
  });
});

describe("failures", () => {
  const draft = {
    group: "demo-cta",
    variant: undefined,
    note: "x",
    hint: undefined,
  };

  it("waits for a pending probe before choosing where to save", async () => {
    register();
    let answer!: (response: Response) => void;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/ping"))
          return new Promise<Response>((resolve) => (answer = resolve));
        if (init?.method === "POST") return json({ id: "n-00000002" }, 201);
        return json({ notes: [] });
      },
    );
    const notes = createNotes(store, fetcher as typeof fetch);
    void notes.probe();
    const saving = notes.add(draft);
    answer(json({ ok: true }));
    expect(await saving).toBeUndefined();
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    );
    expect(window.sessionStorage.getItem(SESSION_NOTES_KEY)).toBeNull();
  });

  it("reports a network failure and keeps notes on a failed refresh", async () => {
    register();
    let failing = false;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/ping")) return json({ ok: true });
        if (init?.method === "POST") throw new TypeError("offline");
        if (init?.method === "DELETE" && !failing)
          throw new TypeError("offline");
        if (failing) return json({ error: "boom" }, 500);
        return json({
          notes: [{ id: "n-00000001", group: "demo-cta", note: "kept" }],
        });
      },
    );
    const notes = createNotes(store, fetcher as typeof fetch);
    await notes.probe();
    expect(await notes.add(draft)).toBe("could not reach the dev server");
    const kept = store.getSnapshot().notes[0]!;
    expect(await notes.remove(kept)).toBe("could not reach the dev server");
    failing = true;
    await notes.refresh();
    expect(store.getSnapshot().notes).toEqual([
      expect.objectContaining({ id: "n-00000001" }),
    ]);
    expect(await notes.remove(kept)).toBe("could not delete the note (500)");
  });

  it("reports a note that sessionStorage could not keep", async () => {
    register();
    const notes = createNotes(store, (async () =>
      json({}, 404)) as typeof fetch);
    await notes.probe();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(await notes.add(draft)).toBe("could not store the note in this tab");
  });
});

describe("session fallback", () => {
  it("falls back when the probe fails, and keeps notes in sessionStorage", async () => {
    register();
    const notes = createNotes(store, (async () => {
      throw new TypeError("no server");
    }) as typeof fetch);
    await notes.probe();
    expect(notes.mode).toBe("session");
    await notes.add({
      group: "demo-cta",
      variant: "link",
      note: "arrow",
      hint: "a > svg",
    });
    const saved = JSON.parse(window.sessionStorage.getItem(SESSION_NOTES_KEY)!);
    expect(saved).toEqual([
      expect.objectContaining({
        group: "demo-cta",
        variant: "link",
        note: "arrow",
        source: "session",
      }),
    ]);
    expect(store.getSnapshot().notes).toHaveLength(1);
    await notes.remove(store.getSnapshot().notes[0]!);
    expect(store.getSnapshot().notes).toEqual([]);
  });

  it("falls back on a non-ok probe and ignores corrupt storage", async () => {
    window.sessionStorage.setItem(SESSION_NOTES_KEY, "{not json");
    const notes = createNotes(store, (async () =>
      json({}, 404)) as typeof fetch);
    await notes.probe();
    expect(notes.mode).toBe("session");
    expect(store.getSnapshot().notes).toEqual([]);
  });
});

describe("describeTarget", () => {
  it("describes the clicked element by a short path and its text", () => {
    document.body.innerHTML = `<section class="hero main"><div><a class="cta" href="#">Get   started <svg></svg></a></div></section>`;
    const root = document.querySelector("section")!;
    const svg = document.querySelector("svg")!;
    expect(describeTarget(svg, [root])).toBe(
      "section.hero > div > a.cta > svg",
    );
    expect(describeTarget(document.querySelector("a")!, [root])).toBe(
      'section.hero > div > a.cta "Get started"',
    );
  });
});

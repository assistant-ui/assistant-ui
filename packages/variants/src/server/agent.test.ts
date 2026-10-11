import {
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAILBOX, MAX_MAILBOX, PRESENCE_MS } from "./agent";
import { handleNotesRequest, type NotesRequest } from "./handler";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "variants-agent-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const call = (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const all: Record<string, string> = {
    "x-variants": "1",
    host: "localhost:5173",
    origin: "http://localhost:5173",
    ...(method === "POST" ? { "content-type": "application/json" } : {}),
    ...headers,
  };
  const request: NotesRequest = {
    method,
    path,
    header: (name) => all[name.toLowerCase()] ?? null,
    json: async () => body,
  };
  return handleNotesRequest(request, { root, dev: true });
};

const file = (name: string) => join(root, MAILBOX, name);

const connect = async (kind = "claude-code") => {
  await call("GET", "/ping");
  await writeFile(
    file("agent.json"),
    JSON.stringify({ kind, cwd: root, startedAt: new Date().toISOString() }),
  );
};

const choose = {
  kind: "choose",
  pairs: ["demo-cta:link", "demo-hero:split"],
  notes: [{ group: "demo-cta", variant: "link", note: "smaller", hint: "a" }],
  page: "http://localhost:5173/?variant=demo-cta:link",
};

describe("agent mailbox", () => {
  it("creates the mailbox on ping and reports no agent until one touches agent.json", async () => {
    expect((await call("GET", "/ping")).status).toBe(200);
    expect((await stat(join(root, MAILBOX))).isDirectory()).toBe(true);
    expect(await call("GET", "/agent")).toEqual({
      status: 200,
      body: { connected: false, agent: null, events: [] },
    });
    await connect();
    expect((await call("GET", "/agent")).body).toMatchObject({
      connected: true,
      agent: { kind: "claude-code" },
    });
    const stale = (Date.now() - PRESENCE_MS - 1000) / 1000;
    await utimes(file("agent.json"), stale, stale);
    expect((await call("GET", "/agent")).body).toMatchObject({
      connected: false,
    });
  });

  it("appends validated requests to the inbox only while an agent is connected", async () => {
    await call("GET", "/ping");
    expect((await call("POST", "/agent/requests", choose)).status).toBe(409);
    await connect();
    for (const bad of [
      { ...choose, kind: "delete" },
      { ...choose, pairs: [] },
      { ...choose, pairs: ["no-colon"] },
      { ...choose, pairs: ["a:b:c"] },
      { ...choose, pairs: ['a:"b'] },
      { ...choose, notes: [{ group: "g", note: "" }] },
      { ...choose, notes: "x" },
      { ...choose, page: "javascript:alert(1)" },
    ])
      expect((await call("POST", "/agent/requests", bad)).status).toBe(400);
    const sent = await call("POST", "/agent/requests", choose);
    expect(sent.status).toBe(201);
    const { id } = sent.body as { id: string };
    expect(id).toMatch(/^r-[0-9a-z]+-[0-9a-f]{6}$/);
    const apply = await call("POST", "/agent/requests", {
      kind: "apply",
      pairs: [],
      page: choose.page,
    });
    expect(apply.status).toBe(201);
    const lines = (await readFile(file("inbox.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(lines).toEqual([
      { id, ts: expect.any(String), ...choose },
      expect.objectContaining({ kind: "apply", pairs: [], notes: [] }),
    ]);
  });

  it("refuses a request that would push the inbox past the cap", async () => {
    await connect();
    await writeFile(file("inbox.jsonl"), "x".repeat(MAX_MAILBOX - 10));
    expect((await call("POST", "/agent/requests", choose)).status).toBe(507);
    expect((await stat(file("inbox.jsonl"))).size).toBe(MAX_MAILBOX - 10);
  });

  it("serializes concurrent appends into whole lines", async () => {
    await connect();
    const sent = await Promise.all(
      Array.from({ length: 5 }, () => call("POST", "/agent/requests", choose)),
    );
    expect(sent.map((response) => response.status)).toEqual([
      201, 201, 201, 201, 201,
    ]);
    const lines = (await readFile(file("inbox.jsonl"), "utf8"))
      .trim()
      .split("\n");
    expect(lines.map((line) => JSON.parse(line).id).sort()).toEqual(
      sent.map((response) => (response.body as { id: string }).id).sort(),
    );
  });

  it("refuses a symlinked mailbox or inbox", async () => {
    await connect();
    const outside = await mkdtemp(join(tmpdir(), "variants-outside-"));
    try {
      await symlink(join(outside, "stolen.jsonl"), file("inbox.jsonl"));
      const linked = await call("POST", "/agent/requests", choose);
      expect(linked.status).toBe(409);
      await expect(stat(join(outside, "stolen.jsonl"))).rejects.toThrow();

      await rm(join(root, MAILBOX), { recursive: true });
      await symlink(outside, join(root, MAILBOX));
      expect((await call("GET", "/ping")).status).toBe(200);
      expect((await call("GET", "/agent")).body).toMatchObject({
        connected: false,
      });
      expect((await call("POST", "/agent/requests", choose)).status).toBe(409);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("lists outbox events after the last id the page saw, skipping malformed lines", async () => {
    await connect();
    const events = [
      { id: "o-1", ts: "t", re: "r-1", type: "ack" },
      { id: "o-2", ts: "t", re: "r-1", type: "status", text: "editing" },
      { id: "o-3", ts: "t", re: "r-1", type: "done", ok: true, reload: true },
    ];
    await writeFile(
      file("outbox.jsonl"),
      [
        JSON.stringify(events[0]),
        "not json",
        JSON.stringify({ id: "o-x", re: "r-1", type: "explode" }),
        JSON.stringify(events[1]),
        JSON.stringify(events[2]),
        "",
      ].join("\n"),
    );
    expect((await call("GET", "/agent")).body).toMatchObject({ events });
    expect((await call("GET", "/agent?after=o-2")).body).toMatchObject({
      events: [events[2]],
    });
    expect((await call("GET", "/agent?after=o-3")).body).toMatchObject({
      events: [],
    });
    expect((await call("GET", "/agent?after=gone")).body).toMatchObject({
      events,
    });
  });

  it("reads only the tail of an oversized outbox", async () => {
    await connect();
    const last = { id: "o-last", ts: "t", re: "r-1", type: "done" };
    await writeFile(
      file("outbox.jsonl"),
      `${"y".repeat(MAX_MAILBOX)}\n${JSON.stringify(last)}\n`,
    );
    expect((await call("GET", "/agent")).body).toMatchObject({
      events: [last],
    });
    // A window that starts exactly at a line keeps that line.
    const event = (text: string) =>
      `${JSON.stringify({ id: "o-n", ts: "t", re: "r-1", type: "ack", text })}\n`;
    const count = Math.floor(MAX_MAILBOX / event("").length);
    const padding = MAX_MAILBOX - count * event("").length;
    await writeFile(
      file("outbox.jsonl"),
      `junk\n${event("a".repeat(padding))}${event("").repeat(count - 1)}`,
    );
    const { events } = (await call("GET", "/agent")).body as {
      events: { text: string }[];
    };
    expect(events).toHaveLength(count);
    expect(events[0]!.text).toHaveLength(padding);
  });

  it("applies the same guards as the note endpoints", async () => {
    await connect();
    expect(
      (await call("GET", "/agent", undefined, { "x-variants": "" })).status,
    ).toBe(403);
    expect(
      (
        await call("POST", "/agent/requests", choose, {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("POST", "/agent/requests", choose, {
          "content-type": "text/plain",
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await handleNotesRequest(
          {
            method: "GET",
            path: "/agent",
            header: () => "1",
            json: async () => ({}),
          },
          { root, dev: false },
        )
      ).status,
    ).toBe(404);
  });
});

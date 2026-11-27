import type { ThreadMessage } from "@assistant-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as messagesRoute from "./api/threads/[id]/messages/route";
import * as threadRoute from "./api/threads/[id]/route";
import * as threadsRoute from "./api/threads/route";
import { threadListAdapter } from "./thread-list-adapter";

vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
});

// Serves the adapter's fetch calls from the route handlers, the way Next.js would.
async function serve(input: RequestInfo | URL, init?: RequestInit) {
  const req = new Request(new URL(String(input), "http://localhost"), init);
  const method = req.method as "GET" | "POST" | "PATCH" | "DELETE";
  const [, , , id, sub] = new URL(req.url).pathname.split("/");
  if (!id) return (threadsRoute as Record<string, Function>)[method]!(req);
  const params = { params: Promise.resolve({ id }) };
  const route = sub === "messages" ? messagesRoute : threadRoute;
  return (route as Record<string, Function>)[method]!(req, params);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(serve));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const storedMessage = (id: string, parent: string | null, text: string) => ({
  id,
  parent_id: parent,
  format: "ai-sdk/v6",
  content: { id, role: "user", parts: [{ type: "text", text }] },
});

const postMessage = (threadId: string, body: unknown) =>
  fetch(`/api/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("chat history recipe", () => {
  it("creates, lists, renames, archives and deletes threads", async () => {
    const { remoteId } = await threadListAdapter.initialize("local-1");

    await threadListAdapter.rename(remoteId, "Trip ideas");
    expect(await threadListAdapter.fetch(remoteId)).toEqual({
      remoteId,
      status: "regular",
      title: "Trip ideas",
    });

    await threadListAdapter.archive(remoteId);
    const { threads } = await threadListAdapter.list();
    expect(threads.find((t) => t.remoteId === remoteId)?.status).toBe(
      "archived",
    );

    await threadListAdapter.delete(remoteId);
    await expect(threadListAdapter.fetch(remoteId)).rejects.toThrow("404");
  });

  it("stores messages in order and updates a message in place", async () => {
    const { remoteId } = await threadListAdapter.initialize("local-2");

    await postMessage(remoteId, storedMessage("m1", null, "hello"));
    await postMessage(remoteId, storedMessage("m2", "m1", "draft"));
    await postMessage(remoteId, storedMessage("m2", "m1", "final"));

    const rows = await (
      await fetch(`/api/threads/${remoteId}/messages`)
    ).json();
    expect(rows).toEqual([
      storedMessage("m1", null, "hello"),
      storedMessage("m2", "m1", "final"),
    ]);
  });

  it("deletes a thread's messages with the thread", async () => {
    const { remoteId } = await threadListAdapter.initialize("local-3");
    await postMessage(remoteId, storedMessage("m3", null, "bye"));

    await threadListAdapter.delete(remoteId);

    const res = await fetch(`/api/threads/${remoteId}/messages`);
    expect(res.status).toBe(404);
  });

  it("answers a malformed message or patch with 400", async () => {
    const { remoteId } = await threadListAdapter.initialize("local-4");

    expect((await postMessage(remoteId, { id: "m4" })).status).toBe(400);
    const patch = await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "deleted" }),
    });
    expect(patch.status).toBe(400);
  });

  it("answers a patch for a missing thread with 404", async () => {
    await expect(threadListAdapter.rename("missing", "x")).rejects.toThrow(
      "404",
    );
  });

  it("keeps message ids apart per thread", async () => {
    const a = await threadListAdapter.initialize("local-6");
    const b = await threadListAdapter.initialize("local-7");

    await postMessage(a.remoteId, storedMessage("same", null, "in a"));
    await postMessage(b.remoteId, storedMessage("same", null, "in b"));

    const rows = await (
      await fetch(`/api/threads/${a.remoteId}/messages`)
    ).json();
    expect(rows).toEqual([storedMessage("same", null, "in a")]);
  });

  it("titles a thread with the start of its first message", async () => {
    const { remoteId } = await threadListAdapter.initialize("local-5");
    const first = {
      role: "user",
      content: [{ type: "text", text: "Plan a weekend in Lisbon" }],
    } as unknown as ThreadMessage;

    await threadListAdapter.generateTitle(remoteId, [first]);

    expect((await threadListAdapter.fetch(remoteId)).title).toBe(
      "Plan a weekend in Lisbon",
    );
  });
});

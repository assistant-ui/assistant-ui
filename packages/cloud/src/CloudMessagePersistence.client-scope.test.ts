import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantCloud } from "./AssistantCloud";
import { CloudMessagePersistence } from "./CloudMessagePersistence";

const createCloud = (workspaceId: string) =>
  new AssistantCloud({
    apiKey: "test-key",
    userId: "test-user",
    workspaceId,
    telemetry: false,
  });

describe("cloud message deletion client scope", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a pending deletion in the workspace where it started", async () => {
    let resolveCreated!: (response: Response) => void;
    const created = new Promise<Response>((resolve) => {
      resolveCreated = resolve;
    });
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_, init) => {
        if (init?.method === "POST") {
          markStarted();
          return created;
        }
        return new Response(null, { status: 204 });
      });
    vi.stubGlobal("fetch", fetchMock);
    let cloud = createCloud("workspace-a");
    const persistence = new CloudMessagePersistence(() => cloud);
    const append = persistence.append(
      "thread-a",
      "local-message",
      null,
      "aui/v0",
      { text: "saved" },
    );
    await started;
    const deletion = persistence.delete("thread-a", ["local-message"]);
    cloud = createCloud("workspace-b");
    resolveCreated(Response.json({ message_id: "remote-message" }));
    await Promise.all([append, deletion]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "DELETE",
      headers: { "Aui-Workspace-Id": "workspace-a" },
      body: JSON.stringify({ message_ids: ["remote-message"] }),
    });
    expect(persistence.isPersisted("local-message")).toBe(false);
  });

  it("uses the new workspace for a deletion started after switching", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    let cloud = createCloud("workspace-a");
    const persistence = new CloudMessagePersistence(() => cloud);
    cloud = createCloud("workspace-b");
    persistence.record("local-message", "remote-message-b");

    await persistence.delete("thread-b", ["local-message"]);

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "DELETE",
      headers: { "Aui-Workspace-Id": "workspace-b" },
      body: JSON.stringify({ message_ids: ["remote-message-b"] }),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { PiThreadSupervisor } from "./ThreadSupervisor";

const sdk = vi.hoisted(() => ({
  createAgentSession: vi.fn(),
  list: vi.fn(),
  listAll: vi.fn(),
  modelRuntimeCreate: vi.fn(async () => ({
    refresh: vi.fn(async () => ({})),
    getAvailableSnapshot: vi.fn(() => []),
    getModels: vi.fn(() => []),
    getModel: vi.fn(),
  })),
  open: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
  createAgentSession: sdk.createAgentSession,
  ModelRuntime: { create: sdk.modelRuntimeCreate },
  SessionManager: {
    create: sdk.create,
    list: sdk.list,
    listAll: sdk.listAll,
    open: sdk.open,
  },
}));

const SESSION: SessionInfo = {
  path: "/ws/.pi/agent/sessions/t1.jsonl",
  id: "t1",
  cwd: "/ws",
  name: "Catalog title",
  created: new Date("2026-06-01T00:00:00.000Z"),
  modified: new Date("2026-06-02T00:00:00.000Z"),
  messageCount: 2,
  firstMessage: "hello",
  allMessagesText: "hello\nhi",
};

const createReadonlySessionManager = () => {
  const branch = [
    {
      type: "message",
      id: "m1",
      parentId: null,
      timestamp: "2026-06-01T00:00:00.000Z",
      message: { role: "user", content: "hello", timestamp: 1 },
    },
    {
      type: "session_info",
      id: "s1",
      parentId: "m1",
      timestamp: "2026-06-01T00:00:01.000Z",
      name: "Branch title",
    },
  ];
  const messages = [{ role: "user", content: "hello", timestamp: 1 }];
  return {
    appendSessionInfo: vi.fn(),
    buildSessionContext: vi.fn(() => ({
      messages,
      thinkingLevel: "high",
      model: { provider: "anthropic", modelId: "claude-opus-4-5" },
    })),
    getBranch: vi.fn(() => branch),
  };
};

describe("PiThreadSupervisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.list.mockResolvedValue([SESSION]);
    sdk.listAll.mockResolvedValue([]);
    sdk.open.mockReturnValue(createReadonlySessionManager());
  });

  it("loads cold thread snapshots from the session file without creating a live AgentSession", async () => {
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    const snapshot = await supervisor.getThread("t1");

    expect(sdk.list).toHaveBeenCalledWith("/ws");
    expect(sdk.open).toHaveBeenCalledWith(SESSION.path);
    expect(sdk.createAgentSession).not.toHaveBeenCalled();
    expect(snapshot.messages).toEqual([
      { role: "user", content: "hello", timestamp: 1 },
    ]);
    expect(snapshot.metadata).toMatchObject({
      id: "t1",
      title: "Branch title",
      sessionFile: SESSION.path,
      messageCount: 1,
      config: {
        provider: "anthropic",
        modelId: "claude-opus-4-5",
        thinkingLevel: "high",
      },
    });
    expect(snapshot.readiness).toEqual({
      state: "ready",
      selection: {
        provider: "anthropic",
        modelId: "claude-opus-4-5",
      },
      source: "session",
    });
  });

  it("dedupes concurrent cold opens into a single AgentSession", async () => {
    const session = {
      sessionId: "t1",
      sessionFile: SESSION.path,
      state: { pendingToolCalls: new Set<string>() },
      subscribe: vi.fn(() => () => {}),
      bindExtensions: vi.fn(async () => {}),
      setThinkingLevel: vi.fn(),
    };
    sdk.createAgentSession.mockResolvedValue({ session });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    // The typical racing pair: a subscribe and an operation arrive together
    // for a thread with no live record yet.
    await Promise.all([
      supervisor.setThinkingLevel("t1", "high"),
      supervisor.setThinkingLevel("t1", "low"),
    ]);

    expect(sdk.createAgentSession).toHaveBeenCalledTimes(1);
    expect(session.setThinkingLevel).toHaveBeenCalledTimes(2);
  });

  it("deletes a cold thread and forgets its cached catalog info", async () => {
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });
    await supervisor.getThread("t1"); // primes the per-thread catalog cache

    // The session file doesn't exist on disk; delete tolerates the ENOENT.
    await supervisor.deleteThread("t1");

    sdk.list.mockResolvedValue([]);
    await expect(supervisor.getThread("t1")).rejects.toThrow(
      "Unknown Pi thread",
    );
  });

  it("returns an empty cleared queue for cold threads without going live", async () => {
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    await expect(supervisor.clearQueue("t1")).resolves.toEqual({
      steering: [],
      followUp: [],
    });
    expect(sdk.createAgentSession).not.toHaveBeenCalled();
  });

  it("renames cold threads through SessionManager without opening a live AgentSession", async () => {
    const manager = createReadonlySessionManager();
    sdk.open.mockReturnValue(manager);
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    await supervisor.renameThread("t1", "Renamed");

    expect(manager.appendSessionInfo).toHaveBeenCalledWith("Renamed");
    expect(sdk.createAgentSession).not.toHaveBeenCalled();
  });
});

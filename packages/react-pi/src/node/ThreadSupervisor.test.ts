import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type * as PiSdk from "@earendil-works/pi-coding-agent";
import type {
  AgentSession,
  SessionInfo,
} from "@earendil-works/pi-coding-agent";
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
  unlink: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => ({
  ...(await importOriginal()),
  createAgentSession: sdk.createAgentSession,
  ModelRuntime: { create: sdk.modelRuntimeCreate },
  SessionManager: {
    create: sdk.create,
    list: sdk.list,
    listAll: sdk.listAll,
    open: sdk.open,
  },
}));

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal()),
  unlink: sdk.unlink,
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

const createLiveSession = (prompt: AgentSession["prompt"]) =>
  ({
    sessionId: "t1",
    sessionFile: SESSION.path,
    state: { pendingToolCalls: new Set<string>() },
    messages: [],
    sessionName: undefined,
    model: undefined,
    thinkingLevel: "off",
    isStreaming: false,
    isCompacting: false,
    isRetrying: false,
    bindExtensions: vi.fn(async () => {}),
    subscribe: vi.fn(() => () => {}),
    prompt,
    getSteeringMessages: vi.fn(() => []),
    getFollowUpMessages: vi.fn(() => []),
    getContextUsage: vi.fn(() => undefined),
    dispose: vi.fn(),
  }) as unknown as AgentSession;

const subscribeToErrors = async (
  supervisor: PiThreadSupervisor,
): Promise<string[]> => {
  const errors: string[] = [];
  supervisor.subscribe(
    "t1",
    (event) => {
      if (event.type === "error") errors.push(event.error);
    },
    { includeSnapshot: false },
  );
  await Promise.resolve();
  return errors;
};

describe("PiThreadSupervisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.list.mockResolvedValue([SESSION]);
    sdk.listAll.mockResolvedValue([]);
    sdk.open.mockReturnValue(createReadonlySessionManager());
    sdk.unlink.mockRejectedValue(
      Object.assign(new Error("missing session file"), { code: "ENOENT" }),
    );
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

  it.each([
    { supportsThinking: true, levels: ["high"] },
    { supportsThinking: false, levels: [] },
  ])(
    "keeps the effective thinking level when supportsThinking is $supportsThinking",
    async ({ supportsThinking, levels }) => {
      const actual = await vi.importActual<typeof PiSdk>(
        "@earendil-works/pi-coding-agent",
      );
      const cwd = await mkdtemp(join(tmpdir(), "pi-thinking-"));
      const supervisor = new PiThreadSupervisor({ workspacePath: cwd });
      try {
        const modelRuntime = await actual.ModelRuntime.create({
          authPath: join(cwd, "auth.json"),
          modelsPath: null,
          refreshOnCreate: false,
        });
        const model = modelRuntime
          .getModels()
          .find(({ reasoning, thinkingLevelMap }) =>
            supportsThinking
              ? reasoning &&
                thinkingLevelMap?.xhigh === null &&
                thinkingLevelMap.max == null &&
                thinkingLevelMap.high !== null &&
                thinkingLevelMap.off !== null
              : !reasoning,
          );
        if (!model)
          throw new Error("Missing model with matching thinking support");
        const settingsManager = actual.SettingsManager.inMemory();
        sdk.create.mockReturnValue(actual.SessionManager.inMemory(cwd));
        sdk.createAgentSession.mockImplementation(
          (options: PiSdk.CreateAgentSessionOptions) =>
            actual.createAgentSession({
              ...options,
              modelRuntime,
              model,
              thinkingLevel: "off",
              settingsManager,
              tools: [],
              resourceLoader: new actual.DefaultResourceLoader({
                cwd,
                agentDir: cwd,
                settingsManager,
              }),
            }),
        );
        const { metadata } = await supervisor.createThread();
        const received: string[] = [];
        supervisor.subscribe(
          metadata.id,
          (event) => {
            if (event.type === "thinking_level_changed")
              received.push(event.level);
          },
          { includeSnapshot: false },
        );
        await Promise.resolve();

        await supervisor.setThinkingLevel(metadata.id, "xhigh");
        expect(received).toEqual(levels);

        await supervisor.setThinkingLevel(metadata.id, "xhigh");
        expect(received).toEqual(levels);
        const { metadata: after } = await supervisor.getThread(metadata.id);
        expect(after.config?.thinkingLevel).toBe(levels[0] ?? "off");
      } finally {
        await supervisor.dispose();
        await rm(cwd, { recursive: true, force: true });
      }
    },
  );

  it("discards a cold session that opens after its thread is deleted", async () => {
    const session = {
      sessionId: "t1",
      sessionFile: SESSION.path,
      state: { pendingToolCalls: new Set<string>() },
      bindExtensions: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
      setThinkingLevel: vi.fn(),
      dispose: vi.fn(),
    };
    let resolveSession!: (value: { session: typeof session }) => void;
    sdk.createAgentSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    const opening = supervisor.setThinkingLevel("t1", "high");
    const openingResult = expect(opening).rejects.toThrow(
      "Pi session open was cancelled",
    );
    await vi.waitFor(() => expect(sdk.createAgentSession).toHaveBeenCalled());

    let resolveUnlink!: () => void;
    sdk.unlink.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUnlink = resolve;
        }),
    );
    const deleting = supervisor.deleteThread("t1");
    await vi.waitFor(() =>
      expect(sdk.unlink).toHaveBeenCalledWith(SESSION.path),
    );
    resolveSession({ session });

    await openingResult;
    await expect(supervisor.setThinkingLevel("t1", "low")).rejects.toThrow(
      "Pi session open was cancelled",
    );
    expect(sdk.createAgentSession).toHaveBeenCalledOnce();

    resolveUnlink();
    await deleting;
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.subscribe).not.toHaveBeenCalled();
    expect(session.setThinkingLevel).not.toHaveBeenCalled();
  });

  it("discards a cold session that opens after supervisor disposal", async () => {
    const session = {
      sessionId: "t1",
      sessionFile: SESSION.path,
      state: { pendingToolCalls: new Set<string>() },
      bindExtensions: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
      setThinkingLevel: vi.fn(),
      dispose: vi.fn(),
    };
    let resolveSession!: (value: { session: typeof session }) => void;
    sdk.createAgentSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    const opening = supervisor.setThinkingLevel("t1", "high");
    const openingResult = expect(opening).rejects.toThrow(
      "Pi session open was cancelled",
    );
    await vi.waitFor(() => expect(sdk.createAgentSession).toHaveBeenCalled());
    await supervisor.dispose();

    const reopenedSession = {
      ...session,
      bindExtensions: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
      setThinkingLevel: vi.fn(),
      dispose: vi.fn(),
    };
    sdk.createAgentSession.mockResolvedValue({ session: reopenedSession });

    const reopened = supervisor.setThinkingLevel("t1", "low");
    resolveSession({ session });

    await Promise.all([openingResult, reopened]);
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.subscribe).not.toHaveBeenCalled();
    expect(session.setThinkingLevel).not.toHaveBeenCalled();

    expect(reopenedSession.setThinkingLevel).toHaveBeenCalledWith("low");
  });

  it("disposes a cold session when extension binding fails during teardown", async () => {
    const bindingError = new Error("extension binding failed");
    let rejectBinding!: (reason: Error) => void;
    const session = {
      sessionId: "t1",
      sessionFile: SESSION.path,
      state: { pendingToolCalls: new Set<string>() },
      bindExtensions: vi.fn(
        () =>
          new Promise<void>((_, reject) => {
            rejectBinding = reject;
          }),
      ),
      subscribe: vi.fn(() => () => {}),
      setThinkingLevel: vi.fn(),
      dispose: vi.fn(),
    };
    sdk.createAgentSession.mockResolvedValue({ session });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    const opening = supervisor.setThinkingLevel("t1", "high");
    const openingResult = expect(opening).rejects.toBe(bindingError);
    await vi.waitFor(() => expect(session.bindExtensions).toHaveBeenCalled());
    await supervisor.dispose();
    rejectBinding(bindingError);

    await openingResult;
    expect(session.dispose).toHaveBeenCalledOnce();
    expect(session.subscribe).not.toHaveBeenCalled();
    expect(session.setThinkingLevel).not.toHaveBeenCalled();
  });

  it("isolates errors from the initial snapshot listener", async () => {
    const session = {
      sessionId: "t1",
      sessionFile: SESSION.path,
      sessionName: undefined,
      state: { pendingToolCalls: new Set<string>() },
      messages: [],
      model: undefined,
      thinkingLevel: "off",
      isStreaming: false,
      isCompacting: false,
      isRetrying: false,
      subscribe: vi.fn(() => () => {}),
      bindExtensions: vi.fn(async () => {}),
      getContextUsage: vi.fn(),
      getSteeringMessages: vi.fn(() => []),
      getFollowUpMessages: vi.fn(() => []),
    };
    sdk.createAgentSession.mockResolvedValue({ session });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });
    const listener = vi.fn((event) => {
      if (event.type === "snapshot") {
        throw new Error("snapshot listener failed");
      }
    });

    const unsubscribe = supervisor.subscribe("t1", listener);

    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    expect(listener.mock.calls[0]?.[0].type).toBe("snapshot");
    unsubscribe();
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

  it("falls back to the cached catalog when the availability refresh fails", async () => {
    const model = {
      provider: "anthropic",
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
    };
    sdk.modelRuntimeCreate.mockResolvedValueOnce({
      refresh: vi.fn(async () => {
        throw new Error("offline");
      }),
      getAvailableSnapshot: vi.fn(() => []),
      getModels: vi.fn(() => [model]),
      getModel: vi.fn(),
    });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });

    await expect(supervisor.getAvailableModels()).resolves.toEqual([
      {
        provider: "anthropic",
        modelId: "claude-opus-4-5",
        name: "Claude Opus 4.5",
        supportsThinking: false,
      },
    ]);
  });

  it("emits an immediate prompt rejection once", async () => {
    const error = new Error("prompt failed");
    const session = createLiveSession(async (_content, options) => {
      options?.preflightResult?.(false);
      throw error;
    });
    sdk.create.mockReturnValue({});
    sdk.createAgentSession.mockResolvedValue({ session });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });
    await supervisor.createThread();
    const errors = await subscribeToErrors(supervisor);

    await expect(
      supervisor.sendMessage("t1", { content: "hello" }),
    ).rejects.toBe(error);

    expect(errors).toEqual(["prompt failed"]);
  });

  it("still emits a prompt rejection after preflight acceptance", async () => {
    let rejectPrompt!: (error: Error) => void;
    const session = createLiveSession((_content, options) => {
      options?.preflightResult?.(true);
      return new Promise<void>((_resolve, reject) => {
        rejectPrompt = reject;
      });
    });
    sdk.create.mockReturnValue({});
    sdk.createAgentSession.mockResolvedValue({ session });
    const supervisor = new PiThreadSupervisor({ workspacePath: "/ws" });
    await supervisor.createThread();
    const errors = await subscribeToErrors(supervisor);

    await supervisor.sendMessage("t1", { content: "hello" });
    rejectPrompt(new Error("run failed"));
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toEqual(["run failed"]);
  });
});

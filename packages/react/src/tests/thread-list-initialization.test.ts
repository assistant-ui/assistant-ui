import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EMPTY_THREAD_CORE } from "../legacy-runtime/runtime-cores/remote-thread-list/EMPTY_THREAD_CORE";
import type { ThreadRuntimeCore } from "../internal";
import type {
  RemoteThreadListOptions,
  RemoteThreadListAdapter,
} from "../legacy-runtime/runtime-cores/remote-thread-list/types";
import type { ModelContextProvider } from "../model-context";

// Helper to create a controllable deferred promise
const createDeferredPromise = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Track pending tasks for the mock hook manager
type PendingTask = ReturnType<typeof createDeferredPromise<ThreadRuntimeCore>>;

// Use vi.hoisted to define things that need to be available for the hoisted vi.mock
const {
  MockHookInstanceManager,
  getCurrentMockInstance,
  setCurrentMockInstance,
} = vi.hoisted(() => {
  // Store the current mock instance so tests can access it
  let currentMockInstance: any = null;

  // Mock class that implements the interface
  class MockHookInstanceManager {
    pendingTasks = new Map<string, any>();
    runtimes = new Map<string, any>();

    startThreadRuntime = (threadId: string) => {
      const existing = this.pendingTasks.get(threadId);
      if (existing) return existing.promise;

      // Create deferred promise inline
      let resolve: (value: any) => void;
      let reject: (error: Error) => void;
      const promise = new Promise<any>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const deferred = { promise, resolve: resolve!, reject: reject! };

      this.pendingTasks.set(threadId, deferred);
      return deferred.promise;
    };

    getThreadRuntimeCore = (threadId: string) => {
      return this.runtimes.get(threadId);
    };

    stopThreadRuntime = (threadId: string) => {
      this.pendingTasks.delete(threadId);
      this.runtimes.delete(threadId);
    };

    setRuntimeHook = () => {};

    __internal_RenderThreadRuntimes = () => null;

    // Test helpers
    resolveRuntime(threadId: string, runtime: any) {
      this.runtimes.set(threadId, runtime);
      const task = this.pendingTasks.get(threadId);
      if (task) {
        task.resolve(runtime);
      }
    }

    rejectRuntime(threadId: string, error: Error) {
      const task = this.pendingTasks.get(threadId);
      if (task) {
        task.reject(error);
      }
    }

    constructor() {
      currentMockInstance = this;
    }
  }

  return {
    MockHookInstanceManager,
    getCurrentMockInstance: () => currentMockInstance,
    setCurrentMockInstance: (instance: any) => {
      currentMockInstance = instance;
    },
  };
});

// Mock the HookInstanceManager module
vi.mock(
  "../legacy-runtime/runtime-cores/remote-thread-list/RemoteThreadListHookInstanceManager",
  () => ({
    RemoteThreadListHookInstanceManager: MockHookInstanceManager,
  }),
);

// Import after mock is set up
import { RemoteThreadListThreadListRuntimeCore } from "../legacy-runtime/runtime-cores/remote-thread-list/RemoteThreadListThreadListRuntimeCore";

// Create a minimal mock ThreadRuntimeCore
const createMockThreadRuntimeCore = (
  overrides: Partial<ThreadRuntimeCore> = {},
): ThreadRuntimeCore => ({
  getMessageById: vi.fn(() => undefined),
  getBranches: vi.fn(() => []),
  switchToBranch: vi.fn(),
  append: vi.fn(),
  startRun: vi.fn(),
  resumeRun: vi.fn(),
  cancelRun: vi.fn(),
  addToolResult: vi.fn(),
  resumeToolCall: vi.fn(),
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
  submitFeedback: vi.fn(),
  getModelContext: vi.fn(() => ({})),
  unstable_loadExternalState: vi.fn(),
  composer: {
    attachments: [],
    attachmentAccept: "*",
    addAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    isEditing: true,
    canCancel: false,
    isEmpty: true,
    text: "",
    setText: vi.fn(),
    role: "user",
    setRole: vi.fn(),
    runConfig: {},
    setRunConfig: vi.fn(),
    reset: vi.fn(),
    clearAttachments: vi.fn(),
    send: vi.fn(),
    cancel: vi.fn(),
    dictation: undefined,
    startDictation: vi.fn(),
    stopDictation: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    unstable_on: vi.fn(() => () => {}),
  },
  getEditComposer: vi.fn(() => undefined),
  beginEdit: vi.fn(),
  speech: undefined,
  capabilities: {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    dictation: false,
    attachments: false,
    feedback: false,
  },
  isDisabled: false,
  isLoading: false,
  messages: [],
  state: null,
  suggestions: [],
  extras: undefined,
  subscribe: vi.fn(() => () => {}),
  import: vi.fn(),
  export: vi.fn(() => ({ messages: [] })),
  reset: vi.fn(),
  unstable_on: vi.fn(() => () => {}),
  ...overrides,
});

// Create a mock adapter
const createMockAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  initialize: vi.fn(async (threadId) => ({
    remoteId: `remote-${threadId}`,
    externalId: undefined,
  })),
  generateTitle: vi.fn(),
  fetch: vi.fn(async (threadId) => ({
    status: "regular" as const,
    remoteId: threadId,
    externalId: undefined,
    title: undefined,
  })),
});

// Create a mock context provider
const createMockContextProvider = (): ModelContextProvider => ({
  getModelContext: () => ({}),
  subscribe: () => () => {},
});

/**
 * Tests for RemoteThreadListThreadListRuntimeCore initialization behavior.
 *
 * These tests specifically verify the fix for PR #3004, which broke initialization
 * by always awaiting the task before setting mainThreadId. The correct behavior is:
 *
 * - For FIRST thread initialization: Set mainThreadId BEFORE awaiting the task
 * - For SUBSEQUENT thread switches: Await the task BEFORE setting mainThreadId
 *
 * This distinction is critical because during first thread initialization, the UI
 * needs a valid mainThreadId immediately (to render), but can use EMPTY_THREAD_CORE
 * as a placeholder until the actual runtime is ready.
 */
describe("RemoteThreadListThreadListRuntimeCore", () => {
  let runtime: RemoteThreadListThreadListRuntimeCore;
  let options: RemoteThreadListOptions;
  let mockContextProvider: ModelContextProvider;
  let mockHookManager: InstanceType<typeof MockHookInstanceManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentMockInstance(null);

    mockContextProvider = createMockContextProvider();
    options = {
      runtimeHook: vi.fn(),
      adapter: createMockAdapter(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to get the mock hook manager from the runtime
  const getHookManager = () => {
    return getCurrentMockInstance()!;
  };

  describe("First thread initialization (critical - what PR #3004 broke)", () => {
    /**
     * The most important test: mainThreadId must be set IMMEDIATELY during first
     * thread initialization, before the runtime task resolves.
     *
     * This is the exact behavior that PR #3004 broke by always awaiting the task.
     */
    it("should set mainThreadId BEFORE task resolves during first thread init", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // mainThreadId should be set IMMEDIATELY, not after task resolves
      expect(runtime.mainThreadId).toBeDefined();
      expect(runtime.mainThreadId).toMatch(/^__LOCALID_/);

      // Task should still be pending
      expect(mockHookManager.pendingTasks.has(runtime.mainThreadId)).toBe(true);
    });

    /**
     * During first thread initialization, getMainThreadRuntimeCore() should
     * return EMPTY_THREAD_CORE as a placeholder while the actual runtime is loading.
     */
    it("should return EMPTY_THREAD_CORE while first thread runtime is pending", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // Should return EMPTY_THREAD_CORE while runtime is pending
      expect(runtime.getMainThreadRuntimeCore()).toBe(EMPTY_THREAD_CORE);
    });

    /**
     * Once the runtime task resolves, getMainThreadRuntimeCore() should
     * return the actual runtime.
     */
    it("should return actual runtime after task resolves", async () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      const threadId = runtime.mainThreadId;
      const mockRuntime = createMockThreadRuntimeCore();

      // Resolve the runtime
      mockHookManager.resolveRuntime(threadId, mockRuntime);

      // Wait for any async updates
      await vi.waitFor(() => {
        expect(runtime.getMainThreadRuntimeCore()).toBe(mockRuntime);
      });
    });

    /**
     * Subscribers should be notified twice during first thread init:
     * 1. Immediately when mainThreadId is set
     * 2. When the runtime task resolves
     */
    it("should notify subscribers immediately, then again when task completes", async () => {
      const subscriber = vi.fn();

      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // Subscribe after construction (constructor already triggered first notification)
      runtime.subscribe(subscriber);

      const threadId = runtime.mainThreadId;
      const mockRuntime = createMockThreadRuntimeCore();

      // Reset to count notifications from this point
      subscriber.mockClear();

      // Resolve the runtime - this should trigger a notification
      mockHookManager.resolveRuntime(threadId, mockRuntime);

      await vi.waitFor(() => {
        expect(subscriber).toHaveBeenCalled();
      });
    });
  });

  describe("Subsequent thread switching", () => {
    /**
     * When switching to a new thread AFTER initialization, the switch should
     * await the task BEFORE setting mainThreadId. This ensures the runtime
     * is ready before the switch is considered complete.
     */
    it("should await task BEFORE setting mainThreadId on subsequent switches", async () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // Complete first thread initialization
      const firstThreadId = runtime.mainThreadId;
      const firstRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(firstThreadId, firstRuntime);

      await vi.waitFor(() => {
        expect(runtime.getMainThreadRuntimeCore()).toBe(firstRuntime);
      });

      // Switch to a remote thread (this fetches and creates a new thread)
      const remoteThreadId = "remote-thread-123";
      const switchPromise = runtime.switchToThread(remoteThreadId);

      // Create a flag to track if switch completed
      let switchComplete = false;
      switchPromise.then(() => {
        switchComplete = true;
      });

      // Give time for fetch to complete and task to be started
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Switch should NOT be complete yet because runtime task is pending
      expect(switchComplete).toBe(false);
      // mainThreadId should still be the first thread
      expect(runtime.mainThreadId).toBe(firstThreadId);

      // Now resolve the new runtime
      const newRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(remoteThreadId, newRuntime);

      // Wait for switch to complete
      await switchPromise;

      // Now mainThreadId should be updated
      expect(runtime.mainThreadId).toBe(remoteThreadId);
      expect(switchComplete).toBe(true);
    });

    /**
     * The switch promise should not resolve until the runtime is ready.
     */
    it("should not resolve switch promise until runtime is ready", async () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // Complete first thread initialization
      const firstThreadId = runtime.mainThreadId;
      const firstRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(firstThreadId, firstRuntime);

      await vi.waitFor(() => {
        expect(runtime.getMainThreadRuntimeCore()).toBe(firstRuntime);
      });

      // Switch to a remote thread
      const remoteThreadId = "remote-thread-456";
      const switchPromise = runtime.switchToThread(remoteThreadId);

      // Track resolution
      let resolved = false;
      switchPromise.then(() => {
        resolved = true;
      });

      // Wait a bit to ensure it doesn't resolve prematurely (fetch completes but runtime task pending)
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(resolved).toBe(false);

      // Resolve and verify
      const newRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(remoteThreadId, newRuntime);

      await switchPromise;
      expect(resolved).toBe(true);
    });
  });

  describe("EMPTY_THREAD_CORE behavior", () => {
    /**
     * EMPTY_THREAD_CORE should be returned when the runtime is not yet available.
     */
    it("should return EMPTY_THREAD_CORE when runtime not available", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      const core = runtime.getMainThreadRuntimeCore();
      expect(core).toBe(EMPTY_THREAD_CORE);
    });

    /**
     * EMPTY_THREAD_CORE should throw on mutating operations.
     */
    it("should throw on mutating operations", () => {
      expect(() => EMPTY_THREAD_CORE.append({} as never)).toThrow();
      expect(() => EMPTY_THREAD_CORE.startRun({} as never)).toThrow();
      expect(() => EMPTY_THREAD_CORE.cancelRun()).toThrow();
      expect(() => EMPTY_THREAD_CORE.switchToBranch("test")).toThrow();
      expect(() => EMPTY_THREAD_CORE.beginEdit("test")).toThrow();
      expect(() => EMPTY_THREAD_CORE.addToolResult({} as never)).toThrow();
    });

    /**
     * EMPTY_THREAD_CORE should return safe defaults for read operations.
     */
    it("should return safe defaults for read operations", () => {
      expect(EMPTY_THREAD_CORE.messages).toEqual([]);
      expect(EMPTY_THREAD_CORE.getBranches("test")).toEqual([]);
      expect(EMPTY_THREAD_CORE.getMessageById("test")).toBeUndefined();
      expect(EMPTY_THREAD_CORE.getEditComposer("test")).toBeUndefined();
      expect(EMPTY_THREAD_CORE.isLoading).toBe(false);
      expect(EMPTY_THREAD_CORE.isDisabled).toBe(false);
      expect(EMPTY_THREAD_CORE.capabilities.edit).toBe(false);
      expect(EMPTY_THREAD_CORE.capabilities.reload).toBe(false);
    });

    /**
     * EMPTY_THREAD_CORE composer should be in a safe read-only state.
     */
    it("should have composer in safe read-only state", () => {
      expect(EMPTY_THREAD_CORE.composer.text).toBe("");
      expect(EMPTY_THREAD_CORE.composer.isEmpty).toBe(true);
      expect(EMPTY_THREAD_CORE.composer.attachments).toEqual([]);
      expect(() => EMPTY_THREAD_CORE.composer.setText("test")).toThrow();
      expect(() => EMPTY_THREAD_CORE.composer.send()).toThrow();
    });
  });

  /**
   * These tests capture the ORIGINAL BUG that PR #3004 was trying to fix.
   *
   * Bug report: "Custom Thread List - Uncaught Error: This is the empty thread,
   * a placeholder for the main thread."
   *
   * The issue is that during first thread initialization, `getMainThreadRuntimeCore()`
   * returns `EMPTY_THREAD_CORE` while the runtime task is pending. If the user
   * interacts with the UI (types in composer, sends message, etc.) before the
   * runtime resolves, they get an error.
   *
   * These tests DEMONSTRATE THE BUG - they should START FAILING once a proper
   * fix is implemented.
   */
  describe("Original bug: EMPTY_THREAD_CORE exposed during first thread init (BUG)", () => {
    /**
     * BUG: During first thread initialization, there's a window where mainThreadId
     * is set but getMainThreadRuntimeCore() returns EMPTY_THREAD_CORE.
     * Any user interaction during this window throws an error.
     */
    it("BUG: composer.setText throws during first thread init while runtime is pending", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      // mainThreadId is set immediately
      expect(runtime.mainThreadId).toBeDefined();

      // But getMainThreadRuntimeCore returns EMPTY_THREAD_CORE
      const core = runtime.getMainThreadRuntimeCore();
      expect(core).toBe(EMPTY_THREAD_CORE);

      // BUG: User tries to type in the composer - this throws!
      // This is what happens when a user starts typing before runtime is ready
      expect(() => {
        core.composer.setText("Hello");
      }).toThrow("This is the empty thread, a placeholder for the main thread");
    });

    /**
     * BUG: Trying to send a message during first thread init throws
     */
    it("BUG: composer.send throws during first thread init while runtime is pending", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      const core = runtime.getMainThreadRuntimeCore();
      expect(core).toBe(EMPTY_THREAD_CORE);

      // BUG: User tries to send a message - this throws!
      expect(() => {
        core.composer.send();
      }).toThrow("This is the empty thread, a placeholder for the main thread");
    });

    /**
     * BUG: Trying to append a message during first thread init throws
     */
    it("BUG: append throws during first thread init while runtime is pending", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      const core = runtime.getMainThreadRuntimeCore();
      expect(core).toBe(EMPTY_THREAD_CORE);

      // BUG: Programmatic message append also throws
      expect(() => {
        core.append({
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        });
      }).toThrow("This is the empty thread, a placeholder for the main thread");
    });

    /**
     * BUG: The window of vulnerability exists from construction until runtime resolves.
     * This test shows the timeline of the bug.
     */
    it("BUG: demonstrates the vulnerable window during first thread init", async () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      const threadId = runtime.mainThreadId;

      // VULNERABLE WINDOW STARTS HERE
      // mainThreadId is set, but runtime is not ready
      expect(runtime.mainThreadId).toBeDefined();
      expect(runtime.getMainThreadRuntimeCore()).toBe(EMPTY_THREAD_CORE);

      // Any user interaction during this window throws
      expect(() => {
        runtime.getMainThreadRuntimeCore().composer.setText("typing...");
      }).toThrow();

      // VULNERABLE WINDOW ENDS when runtime resolves
      const mockRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(threadId, mockRuntime);

      await vi.waitFor(() => {
        expect(runtime.getMainThreadRuntimeCore()).toBe(mockRuntime);
      });

      // Now it works - but user already saw an error!
      expect(() => {
        runtime.getMainThreadRuntimeCore().composer.setText("typing...");
      }).not.toThrow();
    });

    /**
     * This test shows what SHOULD happen (the fix goal):
     * User interactions during first thread init should NOT throw.
     *
     * Options for fixing:
     * 1. Queue/buffer operations until runtime is ready
     * 2. Block/disable UI until runtime is ready
     * 3. Return a "pending" composer that buffers setText calls
     *
     * This test is marked as .todo - convert to regular it() once the bug is fixed.
     */
    it.todo("FIXED: composer.setText should NOT throw during first thread init", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      // mainThreadId is set immediately
      expect(runtime.mainThreadId).toBeDefined();

      // Get the core (currently EMPTY_THREAD_CORE)
      const core = runtime.getMainThreadRuntimeCore();

      // THIS SHOULD NOT THROW - but currently it does (the bug)
      // Once fixed, this will pass and .todo should be removed
      expect(() => {
        core.composer.setText("Hello");
      }).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    /**
     * Switching to the same thread should be a no-op.
     */
    it("should be a no-op when switching to the same thread", async () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );
      mockHookManager = getHookManager();

      // Complete first thread initialization
      const threadId = runtime.mainThreadId;
      const mockRuntime = createMockThreadRuntimeCore();
      mockHookManager.resolveRuntime(threadId, mockRuntime);

      await vi.waitFor(() => {
        expect(runtime.getMainThreadRuntimeCore()).toBe(mockRuntime);
      });

      // Track number of pending tasks before switching
      const pendingTasksBefore = mockHookManager.pendingTasks.size;

      // Switch to the same thread
      await runtime.switchToThread(threadId);

      // Should not have started a new runtime task (no new pending tasks)
      expect(mockHookManager.pendingTasks.size).toBe(pendingTasksBefore);
      // mainThreadId should still be the same
      expect(runtime.mainThreadId).toBe(threadId);
    });

    /**
     * The constructor should automatically call switchToNewThread.
     */
    it("should automatically create a new thread on construction", () => {
      runtime = new RemoteThreadListThreadListRuntimeCore(
        options,
        mockContextProvider,
      );

      expect(runtime.mainThreadId).toBeDefined();
      expect(runtime.newThreadId).toBeDefined();
      expect(runtime.mainThreadId).toBe(runtime.newThreadId);
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type {
  RuntimeCapabilities,
  ThreadRuntimeCore,
} from "../runtime/interfaces/thread-runtime-core";
import type { ThreadAssistantMessage } from "../types/message";

type ThreadRuntimeStub = Omit<ThreadRuntimeCore, "composer"> & {
  notify: () => void;
};

const DEFAULT_CAPABILITIES: RuntimeCapabilities = {
  switchToBranch: false,
  switchBranchDuringRun: false,
  edit: false,
  reload: false,
  refetchThread: false,
  delete: false,
  cancel: true,
  unstable_copy: false,
  speech: false,
  dictation: false,
  voice: false,
  attachments: false,
  feedback: false,
  queue: false,
};

const makeRuntimeStub = (
  overrides: Partial<ThreadRuntimeCore> = {},
): ThreadRuntimeStub => {
  const subscribers = new Set<() => void>();
  return {
    append: vi.fn(),
    cancelRun: vi.fn(),
    getModelContext: () => ({}),
    subscribe: (cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    capabilities: DEFAULT_CAPABILITIES,
    messages: [],
    isDisabled: false,
    isSendDisabled: false,
    isLoading: false,
    composer: { runConfig: {} },
    notify: () => {
      for (const cb of subscribers) cb();
    },
    ...overrides,
  } as unknown as ThreadRuntimeStub;
};

const runningAssistant: ThreadAssistantMessage = {
  id: "a1",
  role: "assistant",
  status: { type: "running" },
  content: [],
  createdAt: new Date(0),
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

describe("DefaultThreadComposerRuntimeCore.canCancel", () => {
  it("is false when the runtime is idle even if cancel is supported", () => {
    const composer = new DefaultThreadComposerRuntimeCore(makeRuntimeStub());
    expect(composer.canCancel).toBe(false);
  });

  it("is false when cancel is not a capability", () => {
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntimeStub({
        capabilities: { ...DEFAULT_CAPABILITIES, cancel: false },
        isRunning: true,
      }),
    );
    expect(composer.canCancel).toBe(false);
  });

  it("is true while the runtime reports isRunning", () => {
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntimeStub({ isRunning: true }),
    );
    expect(composer.canCancel).toBe(true);
  });

  it("is true while the trailing assistant message is running", () => {
    const composer = new DefaultThreadComposerRuntimeCore(
      makeRuntimeStub({ messages: [runningAssistant] }),
    );
    expect(composer.canCancel).toBe(true);
  });

  it("stays false after a runtime notify while idle", () => {
    const stub = makeRuntimeStub();
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    stub.notify();
    expect(composer.canCancel).toBe(false);
  });

  it("notifies subscribers when a run starts", () => {
    const stub = makeRuntimeStub();
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    const onChange = vi.fn();
    composer.subscribe(onChange);

    (stub as { isRunning?: boolean }).isRunning = true;
    stub.notify();

    expect(onChange).toHaveBeenCalled();
    expect(composer.canCancel).toBe(true);
  });

  it("returns to false when the run ends", () => {
    const stub = makeRuntimeStub({ isRunning: true });
    const composer = new DefaultThreadComposerRuntimeCore(stub);
    expect(composer.canCancel).toBe(true);

    (stub as { isRunning?: boolean }).isRunning = false;
    stub.notify();

    expect(composer.canCancel).toBe(false);
  });
});

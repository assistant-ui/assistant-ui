import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, useResource } from "@assistant-ui/tap";
import type {
  Unstable_InteractablePersistedState,
  Unstable_InteractablePersistenceAdapter,
  Unstable_InteractableRegistration,
} from "../types/scopes/interactables";
import type { ThreadMessage } from "../../types/message";

const clientHolder: { client: unknown } = { client: null };

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAssistantClientRef: () => ({
      get current() {
        return clientHolder.client;
      },
    }),
  };
});

const { unstable_Interactables: Interactables } =
  await import("./Interactables");

const missingScope = (name: string) =>
  Object.assign(
    () => {
      throw new Error(`${name} scope not available`);
    },
    { source: null },
  );

const makeClient = (
  threadMessages?: ThreadMessage[],
  setToolUI?: (...args: unknown[]) => () => void,
  threadId?: string,
) => ({
  modelContext: () => ({ register: () => () => {} }),
  thread: threadMessages
    ? Object.assign(
        () => ({ getState: () => ({ messages: threadMessages }) }),
        {
          source: "root",
        },
      )
    : missingScope("thread"),
  threadListItem: threadId
    ? Object.assign(() => ({ getState: () => ({ id: threadId }) }), {
        source: "root",
      })
    : missingScope("threadListItem"),
  threads: threadId
    ? Object.assign(() => ({ getState: () => ({ mainThreadId: threadId }) }), {
        source: "root",
      })
    : missingScope("threads"),
  ...(setToolUI
    ? { tools: Object.assign(() => ({ setToolUI }), { source: "root" }) }
    : {}),
});

const mount = (config?: {
  persistence?: Unstable_InteractablePersistenceAdapter;
  threadMessages?: ThreadMessage[];
  setToolUI?: (...args: unknown[]) => () => void;
  threadId?: string;
}) => {
  clientHolder.client = makeClient(
    config?.threadMessages,
    config?.setToolUI,
    config?.threadId,
  );
  const root = createTapRoot(function InteractablesRoot() {
    return useResource(
      Interactables(
        config?.persistence ? { persistence: config.persistence } : {},
      ),
    );
  });
  return root;
};

const reg = (
  id: string,
  overrides: Partial<Unstable_InteractableRegistration> = {},
): Unstable_InteractableRegistration => ({
  id,
  name: "note",
  description: "a note",
  stateSchema: { type: "object", properties: {} } as never,
  initialState: { v: 0 },
  ...overrides,
});

const stateOf = (root: ReturnType<typeof mount>, id: string) =>
  root.getValue().getState().definitions[id]?.state;

const createCall = (
  id: string,
  args: Record<string, unknown> = { v: 0 },
  name = "note",
) =>
  ({
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: id,
        toolName: name,
        args,
        result: { success: true },
      },
    ],
  }) as unknown as ThreadMessage;

const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

let root: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Interactables registration", () => {
  it("seeds a new registration with initialState", () => {
    root = mount();
    root.getValue().register(reg("n1", { initialState: { v: 7 } }));
    expect(stateOf(root, "n1")).toEqual({ v: 7 });
  });

  it("restores detached state when an instance re-registers in-session", async () => {
    root = mount();
    const unregister = root.getValue().register(reg("n1"));
    await flushMicrotasks();
    root.getValue().setState("n1", () => ({ v: 5 }));
    unregister();
    await flushMicrotasks();
    expect(stateOf(root, "n1")).toBeUndefined();

    root.getValue().register(reg("n1"));
    expect(stateOf(root, "n1")).toEqual({ v: 5 });
  });

  it("restores a tool-created registration from the model-known thread state", () => {
    const snapshot = {
      role: "user",
      metadata: {
        custom: {
          interactables: [{ id: "n1", name: "note", state: { v: 42 } }],
        },
      },
    } as unknown as ThreadMessage;
    root = mount({ threadMessages: [createCall("n1"), snapshot] });
    root.getValue().register(reg("n1"));
    expect(stateOf(root, "n1")).toEqual({ v: 42 });
  });

  it("does not infer thread ownership from snapshots alone", () => {
    const snapshot = {
      role: "user",
      metadata: {
        custom: {
          interactables: [{ id: "n1", name: "note", state: { v: 42 } }],
        },
      },
    } as unknown as ThreadMessage;
    root = mount({ threadMessages: [snapshot] });
    root.getValue().register(reg("n1"));
    expect(stateOf(root, "n1")).toEqual({ v: 0 });
  });

  it("only restores detached tool-created state in the same thread", async () => {
    root = mount({
      threadId: "thread-a",
      threadMessages: [createCall("shared")],
    });
    const unregister = root.getValue().register(reg("shared"));
    await flushMicrotasks();
    root.getValue().setState("shared", () => ({ v: 5 }));
    unregister();
    await flushMicrotasks();

    clientHolder.client = makeClient(
      [createCall("shared")],
      undefined,
      "thread-b",
    );
    root.getValue().register(reg("shared"));
    expect(stateOf(root, "shared")).toEqual({ v: 0 });
  });

  it("restores a tool-created registration from its creating call's args", () => {
    root = mount({ threadMessages: [createCall("n1", { v: 7 })] });
    root.getValue().register(reg("n1"));
    expect(stateOf(root, "n1")).toEqual({ v: 7 });
  });

  it("keeps the definition alive until the last of several anchors unregisters", async () => {
    root = mount({ threadMessages: [createCall("n1")] });
    const first = root.getValue().register(reg("n1"));
    const second = root.getValue().register(reg("n1"));
    await flushMicrotasks();
    root.getValue().setState("n1", () => ({ v: 5 }));

    first();
    await flushMicrotasks();
    expect(stateOf(root, "n1")).toEqual({ v: 5 });

    second();
    await flushMicrotasks();
    expect(stateOf(root, "n1")).toBeUndefined();
  });

  it("installs the update tool UI once per name and removes it with the last anchor", () => {
    const removeToolUI = vi.fn();
    const setToolUI = vi.fn(() => removeToolUI);
    root = mount({ setToolUI });

    const render = () => null;
    const first = root.getValue().register(reg("n1", { updateRender: render }));
    const second = root
      .getValue()
      .register(reg("n2", { updateRender: render }));

    expect(setToolUI).toHaveBeenCalledTimes(1);
    expect(setToolUI).toHaveBeenCalledWith("update_note", render, {
      standalone: true,
    });

    first();
    expect(removeToolUI).not.toHaveBeenCalled();
    second();
    expect(removeToolUI).toHaveBeenCalledTimes(1);
  });
});

describe("Interactables persistence save", () => {
  it("debounces saves and excludes tool-created items from the payload", async () => {
    const save = vi.fn();
    root = mount({
      persistence: { save },
      threadMessages: [createCall("t1")],
    });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().register(reg("t1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    root.getValue().setState("t1", () => ({ v: 9 }));
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0]).toEqual({
      n1: { name: "note", state: { v: 1 } },
    });
  });

  it("records a per-id error when save rejects, and clears pending on success", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("boom"));
    root = mount({ persistence: { save } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    const failed = root.getValue().getState().persistence["n1"];
    expect(failed?.isPending).toBe(false);
    expect(failed?.error).toBeInstanceOf(Error);

    root.getValue().setState("n1", () => ({ v: 2 }));
    await vi.advanceTimersByTimeAsync(500);
    expect(root.getValue().getState().persistence["n1"]).toBeUndefined();
  });

  it("flush() skips the debounce delay and resolves once the save completed", async () => {
    const save = vi.fn();
    root = mount({ persistence: { save } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    let resolved = false;
    const p = root
      .getValue()
      .flush()
      .then(() => {
        resolved = true;
      });
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(1);
    await p;
    expect(resolved).toBe(true);
  });
});

describe("Interactables persistence load", () => {
  const adapter = (
    saved: Unstable_InteractablePersistedState,
    delayMs = 0,
  ) => ({
    save: vi.fn(),
    load: vi.fn(
      () =>
        new Promise<Unstable_InteractablePersistedState>((resolve) =>
          setTimeout(() => resolve(saved), delayMs),
        ),
    ),
  });

  it("seeds an app-scoped interactable that registers after the load resolved", async () => {
    root = mount({
      persistence: adapter({ n1: { name: "note", state: { v: 3 } } }),
    });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    expect(stateOf(root, "n1")).toEqual({ v: 3 });
  });

  it("applies loaded state to already-registered app items but never to tool-created ones", async () => {
    root = mount({
      persistence: adapter(
        {
          n1: { name: "note", state: { v: 3 } },
          t1: { name: "note", state: { v: 9 } },
        },
        100,
      ),
      threadMessages: [createCall("t1")],
    });
    root.getValue().register(reg("n1"));
    root.getValue().register(reg("t1"));

    await vi.advanceTimersByTimeAsync(100);
    expect(stateOf(root, "n1")).toEqual({ v: 3 });
    expect(stateOf(root, "t1")).toEqual({ v: 0 });
  });

  it("lets a local edit made while the load was in flight win over the loaded state", async () => {
    root = mount({
      persistence: adapter({ n1: { name: "note", state: { v: 3 } } }, 100),
    });
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));

    await vi.advanceTimersByTimeAsync(600);
    expect(stateOf(root, "n1")).toEqual({ v: 99 });
  });
});

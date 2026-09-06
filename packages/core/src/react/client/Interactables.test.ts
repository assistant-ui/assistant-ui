import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import type {
  Unstable_InteractablePersistedState,
  Unstable_InteractablePersistenceAdapter,
  Unstable_InteractableRegistration,
} from "../types/scopes/interactables";
import type { ThreadMessage } from "../../types/message";

const clientHolder: { client: unknown } = { client: null };
const clientListeners = new Set<() => void>();
let registeredModelContextProvider:
  | { subscribe?: (callback: () => void) => () => void }
  | undefined;

const replaceClient = (client: unknown) => {
  clientHolder.client = client;
  for (const listener of clientListeners) listener();
};

vi.mock("@assistant-ui/store/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/store/client")>();
  const { useEffect } = await import("react");
  // Mirrors the real hook's guarantees: the effect only runs while the scope
  // is available, and a client replacement migrates the registration.
  const useScopeEffectShim = (
    scope: string,
    effect: () => (() => void) | void,
    deps: readonly unknown[],
  ) => {
    useEffect(() => {
      let cleanup: (() => void) | undefined;
      const apply = () => {
        cleanup?.();
        cleanup = undefined;
        const accessor = (
          clientHolder.client as Record<string, { source?: unknown }> | null
        )?.[scope];
        if (accessor?.source == null) return;
        const result = effect();
        cleanup = typeof result === "function" ? result : undefined;
      };

      apply();
      clientListeners.add(apply);
      return () => {
        clientListeners.delete(apply);
        cleanup?.();
      };
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- caller-provided deps, mirrors the real hook
    }, deps);
  };
  return {
    ...actual,
    useAssistantClientRef: () => ({
      get current() {
        return clientHolder.client;
      },
    }),
    useAssistantScopeEffect: useScopeEffectShim,
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
  modelContext: Object.assign(
    () => ({
      register: (
        provider: NonNullable<typeof registeredModelContextProvider>,
      ) => {
        registeredModelContextProvider = provider;
        return () => {
          registeredModelContextProvider = undefined;
        };
      },
    }),
    { source: "root" },
  ),
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
  registeredModelContextProvider = undefined;
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Interactables registration", () => {
  it("notifies every model-context subscriber when one throws", async () => {
    root = mount();
    await flushMicrotasks();
    const listenerError = new Error("listener failed");
    const laterListener = vi.fn();

    const provider = registeredModelContextProvider;
    expect(provider).toBeDefined();
    provider?.subscribe?.(() => {
      throw listenerError;
    });
    provider?.subscribe?.(laterListener);

    expect(() =>
      flushTapSync(() => root?.getValue().register(reg("n1"))),
    ).toThrow(listenerError);
    expect(laterListener).toHaveBeenCalledOnce();
  });

  it("seeds a new registration with initialState", () => {
    root = mount();
    root.getValue().register(reg("n1", { initialState: { v: 7 } }));
    expect(stateOf(root, "n1")).toEqual({ v: 7 });
  });

  // `definitions` is read by bare key with ids that reach the runtime from
  // model tool calls, so it must stay prototype-free through every transition.
  it.each(["__proto__", "constructor", "toString"])(
    "registers, updates and unregisters an interactable named %s",
    (id) => {
      root = mount();
      const unregister = root.getValue().register(reg(id));
      expect(stateOf(root, id)).toEqual({ v: 0 });

      root.getValue().setState(id, () => ({ v: 1 }));
      expect(stateOf(root, id)).toEqual({ v: 1 });
      expect(Object.keys(root.getValue().getState().definitions)).toEqual([id]);

      unregister();
      expect(Object.keys(root.getValue().getState().definitions)).toEqual([]);
    },
  );

  it("keeps the state records prototype-free", () => {
    root = mount();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    const state = root.getValue().getState();
    expect(Object.getPrototypeOf(state.definitions)).toBeNull();
    expect(Object.getPrototypeOf(state.persistence)).toBeNull();
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

  it("migrates update tool UIs when the tools scope is replaced", () => {
    const removeFirst = vi.fn();
    const setFirst = vi.fn(() => removeFirst);
    const removeSecond = vi.fn();
    const setSecond = vi.fn(() => removeSecond);
    root = mount({ setToolUI: setFirst });

    const render = () => null;
    const unregister = root
      .getValue()
      .register(reg("n1", { updateRender: render }));

    replaceClient(makeClient(undefined, setSecond));

    expect(removeFirst).toHaveBeenCalledTimes(1);
    expect(setSecond).toHaveBeenCalledWith("update_note", render, {
      standalone: true,
    });

    unregister();
    expect(removeSecond).toHaveBeenCalledTimes(1);
  });

  it("installs a pending update tool UI when the tools scope becomes available", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const removeToolUI = vi.fn();
    const setToolUI = vi.fn(() => removeToolUI);
    root = mount();

    const unregister = root
      .getValue()
      .register(reg("n1", { updateRender: () => null }));
    expect(warn).toHaveBeenCalledWith(
      '[Interactables] "note" supplied an updateRender, but no ' +
        "tools scope is available yet; it will be installed once one appears.",
    );
    warn.mockRestore();

    replaceClient(makeClient(undefined, setToolUI));

    expect(setToolUI).toHaveBeenCalledWith(
      "update_note",
      expect.any(Function),
      {
        standalone: true,
      },
    );
    unregister();
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

  it("saves queued changes with the adapter that observed them", async () => {
    const firstSave = vi.fn();
    const secondSave = vi.fn();
    root = mount({ persistence: { save: firstSave } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    root.getValue().setPersistenceAdapter({ save: secondSave });
    await vi.advanceTimersByTimeAsync(500);

    expect(firstSave).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
    });
    expect(secondSave).not.toHaveBeenCalled();
  });

  it("keeps edits queued during an in-flight flush with the outgoing adapter", async () => {
    const saveResolvers: Array<() => void> = [];
    const firstSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          saveResolvers.push(resolve);
        }),
    );
    const secondSave = vi.fn();
    root = mount({ persistence: { save: firstSave } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n1", () => ({ v: 2 }));

    let flushed = false;
    const flush = root
      .getValue()
      .flush()
      .then(() => {
        flushed = true;
      });
    root.getValue().setPersistenceAdapter({ save: secondSave });

    expect(firstSave).toHaveBeenCalledTimes(1);
    expect(secondSave).not.toHaveBeenCalled();

    saveResolvers[0]!();
    await flushMicrotasks();
    expect(flushed).toBe(false);
    expect(firstSave).toHaveBeenCalledTimes(2);
    expect(firstSave.mock.calls[1]![0]).toEqual({
      n1: { name: "note", state: { v: 2 } },
    });
    expect(secondSave).not.toHaveBeenCalled();

    saveResolvers[1]!();
    await flush;
    expect(flushed).toBe(true);
    expect(firstSave.mock.calls.at(-1)?.[0]).toEqual({
      n1: { name: "note", state: { v: 2 } },
    });
    expect(secondSave).not.toHaveBeenCalled();
  });

  it("cancels an empty retry timer when replacing the adapter", async () => {
    let resolveFirstSave!: () => void;
    const firstSave = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSave = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const secondSave = vi.fn();
    root = mount({ persistence: { save: firstSave } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n1", () => ({ v: 2 }));
    await vi.advanceTimersByTimeAsync(500);

    resolveFirstSave();
    await flushMicrotasks();
    expect(firstSave).toHaveBeenCalledTimes(2);

    root.getValue().setPersistenceAdapter({ save: secondSave });
    await vi.advanceTimersByTimeAsync(500);

    expect(firstSave).toHaveBeenCalledTimes(2);
    expect(secondSave).not.toHaveBeenCalled();
  });

  it("cancels the retry timer after starting the queued batch", async () => {
    let resolveFirstSave!: () => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSave = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    root = mount({ persistence: { save } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n1", () => ({ v: 2 }));
    await vi.advanceTimersByTimeAsync(500);

    resolveFirstSave();
    await flushMicrotasks();
    expect(save).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("settles overlapping persistence batches per interactable", async () => {
    let resolveFirstSave!: () => void;
    const firstSave = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSave = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    root = mount({ persistence: { save: firstSave } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().register(reg("n2"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n2", () => ({ v: 2 }));
    root.getValue().setPersistenceAdapter({ save: vi.fn() });
    await flushMicrotasks();

    expect(root.getValue().getState().persistence["n1"]?.isPending).toBe(true);
    expect(root.getValue().getState().persistence["n2"]).toBeUndefined();

    resolveFirstSave();
    await flushMicrotasks();
    expect(root.getValue().getState().persistence["n1"]).toBeUndefined();
  });

  it("keeps an interactable pending while its newer edit is queued", async () => {
    const saveResolvers: Array<() => void> = [];
    const firstSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          saveResolvers.push(resolve);
        }),
    );
    const secondSave = vi.fn();
    root = mount({ persistence: { save: firstSave } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().register(reg("n2"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n2", () => ({ v: 2 }));
    root.getValue().setPersistenceAdapter({ save: secondSave });
    root.getValue().setState("n1", () => ({ v: 3 }));

    saveResolvers[0]!();
    await flushMicrotasks();
    expect(root.getValue().getState().persistence["n1"]?.isPending).toBe(true);
    expect(secondSave).not.toHaveBeenCalled();

    saveResolvers[1]!();
    await flushMicrotasks();
    expect(secondSave).toHaveBeenCalledTimes(1);
    expect(root.getValue().getState().persistence["n1"]).toBeUndefined();
  });

  it("flushes queued changes through the declarative adapter on unmount", async () => {
    const save = vi.fn();
    root = mount({ persistence: { save } });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    root.unmount();
    root = undefined;
    await flushMicrotasks();

    expect(save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
    });
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

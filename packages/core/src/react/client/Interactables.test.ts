import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
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
  | {
      getModelContext?: () => {
        tools?: Record<string, { parameters?: unknown }>;
      };
      subscribe?: (callback: () => void) => () => void;
    }
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

const mountOnSubscribe = () => {
  clientHolder.client = makeClient();
  return createTapRoot(
    function InteractablesRoot() {
      return useResource(Interactables());
    },
    { mountOnSubscribe: true },
  );
};

const mountWithMutablePersistence = (
  initial: Unstable_InteractablePersistenceAdapter | undefined,
) => {
  clientHolder.client = makeClient();
  let updatePersistence!: (
    next: Unstable_InteractablePersistenceAdapter | undefined,
  ) => void;
  const root = createTapRoot(function InteractablesRoot() {
    const [persistence, setPersistence] = useState(initial);
    updatePersistence = setPersistence;
    return useResource(Interactables(persistence ? { persistence } : {}));
  });
  return {
    root,
    setPersistence(next: Unstable_InteractablePersistenceAdapter | undefined) {
      flushTapSync(() => updatePersistence(next));
    },
  };
};

const reg = (
  id: string,
  overrides: Partial<Unstable_InteractableRegistration> = {},
): Unstable_InteractableRegistration => ({
  id,
  name: "note",
  description: "a note",
  stateSchema: {
    type: "object",
    properties: {},
  } satisfies Unstable_InteractableRegistration["stateSchema"],
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

  it("refreshes cached tool parameters while another anchor remains", async () => {
    const schemaA = {
      type: "object",
      properties: { first: { type: "string" } },
    } satisfies Unstable_InteractableRegistration["stateSchema"];
    const schemaB = {
      type: "object",
      properties: { second: { type: "number" } },
    } satisfies Unstable_InteractableRegistration["stateSchema"];
    root = mount({ threadMessages: [createCall("n1")] });
    const first = root.getValue().register(reg("n1", { stateSchema: schemaA }));
    const second = root
      .getValue()
      .register(reg("n1", { stateSchema: schemaA }));
    await flushMicrotasks();

    first();
    const replacement = root
      .getValue()
      .register(reg("n1", { stateSchema: schemaB }));

    const parameters =
      registeredModelContextProvider?.getModelContext?.().tools?.update_note
        ?.parameters;
    expect(parameters).toMatchObject({
      properties: {
        id: { type: "string" },
        second: { type: "number" },
      },
    });
    expect(parameters).not.toMatchObject({
      properties: { first: expect.anything() },
    });

    second();
    replacement();
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
    const firstSave = vi.fn<
      (state: Unstable_InteractablePersistedState) => Promise<void>
    >(
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
    expect(firstSave.mock.calls[1]?.[0]).toEqual({
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

    expect(root.getValue().getState().persistence["n1"]).toBeUndefined();
    expect(root.getValue().getState().persistence["n2"]).toBeUndefined();

    resolveFirstSave();
    await flushMicrotasks();
    expect(root.getValue().getState().persistence["n1"]).toBeUndefined();
  });

  it("does not publish an outgoing adapter failure into the replacement scope", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let rejectSave!: (error: Error) => void;
    const firstSave = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    const firstAdapter = { save: firstSave };
    root = mount({ persistence: firstAdapter });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    root.getValue().setPersistenceAdapter({ save: vi.fn() });
    root.getValue().setPersistenceAdapter(firstAdapter);
    expect(root.getValue().getState().persistence.n1).toBeUndefined();
    rejectSave(new Error("outgoing adapter failed"));
    await flushMicrotasks();

    expect(root.getValue().getState().persistence.n1).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[Interactables] Persistence save failed after the adapter changed.",
      expect.any(Error),
    );
  });

  it("keeps an in-flight save failure in the same scope while detached", async () => {
    let rejectSave!: (error: Error) => void;
    const saveError = new Error("save failed");
    const adapter = {
      save: vi.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectSave = reject;
          }),
      ),
    };
    root = mount({ persistence: adapter });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    root.getValue().setPersistenceAdapter(undefined);
    rejectSave(saveError);
    await flushMicrotasks();

    expect(root.getValue().getState().persistence.n1).toEqual({
      isPending: false,
      error: saveError,
    });

    root.getValue().setPersistenceAdapter(adapter);
    expect(root.getValue().getState().persistence.n1).toEqual({
      isPending: false,
      error: saveError,
    });
  });

  it("keeps an imperative adapter attached across a soft unmount", async () => {
    const save = vi.fn();
    const softRoot = mountOnSubscribe();
    const release = softRoot.subscribe(() => {});
    softRoot.getValue().setPersistenceAdapter({ save });

    release();
    await flushMicrotasks();

    const releaseAgain = softRoot.subscribe(() => {});
    softRoot.getValue().register(reg("n1"));
    softRoot.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
    });
    releaseAgain();
    await flushMicrotasks();
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

  it("does not save loaded state that later registers as thread-scoped", async () => {
    const attached = adapter({
      t1: { name: "note", state: { v: 9 } },
      n2: { name: "note", state: { v: 2 } },
    });
    root = mount({
      persistence: attached,
      threadMessages: [createCall("t1")],
    });
    await flushMicrotasks();
    root.getValue().register(reg("t1"));
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
      n2: { name: "note", state: { v: 2 } },
    });
  });

  it("does not save loaded thread state before its tool UI registers", async () => {
    const attached = adapter({
      t1: { name: "note", state: { v: 9 } },
      n2: { name: "note", state: { v: 2 } },
    });
    root = mount({
      persistence: attached,
      threadMessages: [createCall("t1")],
    });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
      n2: { name: "note", state: { v: 2 } },
    });
  });

  it("does not save loaded thread state with empty tool identifiers", async () => {
    const attached = adapter({
      "": { name: "note", state: { v: 9 } },
      t2: { name: "", state: { v: 8 } },
      n2: { name: "note", state: { v: 2 } },
    });
    root = mount({
      persistence: attached,
      threadMessages: [createCall(""), createCall("t2", {}, "")],
    });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
      n2: { name: "note", state: { v: 2 } },
    });
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

  it("preserves app state when declarative persistence attaches or detaches", async () => {
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = adapter({});

    dynamic.setPersistence(attached);
    await flushMicrotasks();
    expect(stateOf(root, "n1")).toEqual({ v: 99 });

    dynamic.setPersistence(undefined);
    await flushMicrotasks();
    expect(stateOf(root, "n1")).toEqual({ v: 99 });
  });

  it("saves local edits made before declarative persistence attaches", async () => {
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = adapter({
      n1: { name: "note", state: { v: 1 } },
      n2: { name: "note", state: { v: 2 } },
    });

    dynamic.setPersistence(attached);
    await flushMicrotasks();

    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 99 } },
      n2: { name: "note", state: { v: 2 } },
    });
  });

  it("waits for a slow initial load before saving local edits", async () => {
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = adapter(
      {
        n1: { name: "note", state: { v: 1 } },
        n2: { name: "note", state: { v: 2 } },
      },
      100,
    );

    dynamic.setPersistence(attached);
    await vi.advanceTimersByTimeAsync(99);
    expect(attached.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 99 } },
      n2: { name: "note", state: { v: 2 } },
    });
  });

  it("waits for an in-flight load before flush saves", async () => {
    const attached = adapter(
      {
        n1: { name: "note", state: { v: 1 } },
        n2: { name: "note", state: { v: 2 } },
      },
      100,
    );
    root = mount({ persistence: attached });
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));

    let resolved = false;
    const flushing = root
      .getValue()
      .flush()
      .then(() => {
        resolved = true;
      });

    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);
    expect(attached.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushing;

    expect(resolved).toBe(true);
    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 99 } },
      n2: { name: "note", state: { v: 2 } },
    });
  });

  it("retries a failed initial load before saving queued edits", async () => {
    const loadError = new Error("load failed");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = {
      save: vi.fn(),
      load: vi
        .fn()
        .mockRejectedValueOnce(loadError)
        .mockImplementationOnce(
          () =>
            new Promise<Unstable_InteractablePersistedState>((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    n1: { name: "note", state: { v: 1 } },
                    n2: { name: "note", state: { v: 2 } },
                  }),
                100,
              ),
            ),
        ),
    };

    dynamic.setPersistence(attached);
    await flushMicrotasks();

    expect(attached.save).not.toHaveBeenCalled();
    expect(root.getValue().getState().persistence.n1).toEqual({
      isPending: false,
      error: loadError,
    });

    root.getValue().setState("n1", () => ({ v: 100 }));
    root.getValue().setState("n1", () => ({ v: 101 }));
    root.getValue().setState("n1", () => ({ v: 102 }));
    await vi.advanceTimersByTimeAsync(499);
    expect(attached.load).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(attached.load).toHaveBeenCalledTimes(2);
    expect(attached.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(99);
    expect(attached.save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 102 } },
      n2: { name: "note", state: { v: 2 } },
    });
    expect(warn).toHaveBeenCalledWith(
      "[Interactables] Persistence load failed.",
      loadError,
    );
  });

  it("resolves flush without saving when the load retry fails", async () => {
    const loadError = new Error("load failed");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = {
      save: vi.fn(),
      load: vi.fn().mockRejectedValue(loadError),
    };

    dynamic.setPersistence(attached);
    await flushMicrotasks();

    await expect(root.getValue().flush()).resolves.toBeUndefined();

    expect(attached.load).toHaveBeenCalledTimes(2);
    expect(attached.save).not.toHaveBeenCalled();
    expect(root.getValue().getState().persistence.n1).toEqual({
      isPending: false,
      error: loadError,
    });
  });

  it("clears load-pending status when the persistence scope changes", async () => {
    const first = adapter({}, 100);
    const second = adapter({});
    const dynamic = mountWithMutablePersistence(first);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    expect(root.getValue().getState().persistence.n1).toEqual({
      isPending: true,
      error: undefined,
    });

    dynamic.setPersistence(second);
    expect(root.getValue().getState().persistence.n1).toBeUndefined();

    await vi.advanceTimersByTimeAsync(100);
    expect(root.getValue().getState().persistence.n1).toBeUndefined();
  });

  it("clears load-pending status while the adapter is detached", () => {
    const dynamic = mountWithMutablePersistence(adapter({}, 100));
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    expect(root.getValue().getState().persistence.n1?.isPending).toBe(true);

    dynamic.setPersistence(undefined);

    expect(root.getValue().getState().persistence.n1).toBeUndefined();
  });

  it("does not restore load status after an interactable unregisters", async () => {
    const loadError = new Error("load failed");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const attached = {
      save: vi.fn(),
      load: vi.fn(
        () =>
          new Promise<Unstable_InteractablePersistedState>((_, reject) =>
            setTimeout(() => reject(loadError), 100),
          ),
      ),
    };
    root = mount({ persistence: attached });
    const unregister = root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    unregister();
    expect(root.getValue().getState().persistence.n1).toBeUndefined();

    await vi.advanceTimersByTimeAsync(100);
    expect(root.getValue().getState().persistence.n1).toBeUndefined();
  });

  it("keeps a loaded adapter ready when it is set again", async () => {
    const attached = adapter({});
    root = mount();
    root.getValue().setPersistenceAdapter(attached);
    await flushMicrotasks();
    expect(attached.load).toHaveBeenCalledTimes(1);

    root.getValue().setPersistenceAdapter(attached);
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);

    expect(attached.load).toHaveBeenCalledTimes(1);
    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 1 } },
    });
  });

  it("saves queued edits when an adapter has no load method", async () => {
    const dynamic = mountWithMutablePersistence(undefined);
    root = dynamic.root;
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    const attached = { save: vi.fn() };

    dynamic.setPersistence(attached);
    await flushMicrotasks();

    expect(attached.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 99 } },
    });
  });

  it("does not save detached edits into a replacement persistence scope", async () => {
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter({
      n1: { name: "note", state: { v: 2 } },
    });
    const dynamic = mountWithMutablePersistence(firstAdapter);
    root = dynamic.root;
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    dynamic.setPersistence(undefined);
    root.getValue().setState("n1", () => ({ v: 99 }));
    dynamic.setPersistence(secondAdapter);
    await flushMicrotasks();

    expect(stateOf(root, "n1")).toEqual({ v: 2 });
    expect(secondAdapter.save).not.toHaveBeenCalled();
  });

  it("resets app state when the declarative adapter is replaced", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter(
      { n1: { name: "note", state: { v: 2 } } },
      100,
    );
    const dynamic = mountWithMutablePersistence(firstAdapter);
    root = dynamic.root;
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));

    dynamic.setPersistence(secondAdapter);
    expect(stateOf(root, "n1")).toEqual({ v: 0 });

    await vi.advanceTimersByTimeAsync(100);
    expect(stateOf(root, "n1")).toEqual({ v: 2 });
    expect(warn).toHaveBeenCalledWith(
      "[Interactables] The persistence adapter identity changed, so app-scoped state was reset for the new scope. Memoize the adapter unless this is an account or workspace switch.",
    );
  });

  it("resets app state when a declarative adapter changes across a detach", async () => {
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter({
      n1: { name: "note", state: { v: 2 } },
    });
    const dynamic = mountWithMutablePersistence(firstAdapter);
    root = dynamic.root;
    await flushMicrotasks();
    const unregister = root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    unregister();

    dynamic.setPersistence(undefined);
    dynamic.setPersistence(secondAdapter);
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    expect(stateOf(root, "n1")).toEqual({ v: 2 });
  });

  it("drops app-scoped streaming baselines when adapters are replaced", async () => {
    root = mount({ persistence: adapter({}) });
    const definition = reg("n1", {
      initialState: { items: [] },
      stateSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
            },
          },
        },
      },
    });
    root.getValue().register(definition);
    root.getValue().setState("n1", () => ({
      items: [{ id: "old", text: "old scope" }],
    }));

    let markFirstProcessed!: () => void;
    let releaseSecond!: () => void;
    const firstProcessed = new Promise<void>((resolve) => {
      markFirstProcessed = resolve;
    });
    const secondReleased = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const tool = registeredModelContextProvider?.getModelContext?.().tools
      ?.update_note as
      | {
          streamCall(
            reader: {
              args: {
                streamValues(): AsyncIterable<Record<string, unknown>>;
              };
            },
            context: { toolCallId: string },
          ): Promise<unknown>;
        }
      | undefined;
    expect(tool).toBeDefined();
    const streaming = tool!.streamCall(
      {
        args: {
          async *streamValues() {
            yield { id: "n1", marker: true };
            markFirstProcessed();
            await secondReleased;
            yield { id: "n1", items: { add: [{ text: "new scope" }] } };
          },
        },
      },
      { toolCallId: "call-1" },
    );
    await firstProcessed;

    root.getValue().setPersistenceAdapter(adapter({}));
    expect(stateOf(root, "n1")).toEqual({ items: [] });
    releaseSecond();
    await streaming;

    expect(stateOf(root, "n1")).toMatchObject({
      items: [{ text: "new scope" }],
    });
  });

  it("does not carry a settled save error into a replacement adapter", async () => {
    const firstAdapter = {
      save: vi.fn().mockRejectedValue(new Error("first adapter failed")),
    };
    root = mount({ persistence: firstAdapter });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    expect(root.getValue().getState().persistence.n1?.error).toBeInstanceOf(
      Error,
    );

    root.getValue().setPersistenceAdapter(adapter({}));

    expect(root.getValue().getState().persistence.n1).toBeUndefined();
  });

  it("resets app state before loading from a replacement adapter", async () => {
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter(
      { n1: { name: "note", state: { v: 2 } } },
      100,
    );
    root = mount({ persistence: firstAdapter });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));

    root.getValue().setPersistenceAdapter(secondAdapter);
    expect(stateOf(root, "n1")).toEqual({ v: 0 });

    await vi.advanceTimersByTimeAsync(100);
    expect(stateOf(root, "n1")).toEqual({ v: 2 });

    root.getValue().setState("n1", () => ({ v: 3 }));
    await vi.advanceTimersByTimeAsync(500);
    expect(secondAdapter.save).toHaveBeenCalledWith({
      n1: { name: "note", state: { v: 3 } },
    });
  });

  it("resets app state when an imperative adapter changes across a detach", async () => {
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter({
      n1: { name: "note", state: { v: 2 } },
    });
    root = mount({ persistence: firstAdapter });
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));

    root.getValue().setPersistenceAdapter(undefined);
    root.getValue().setPersistenceAdapter(secondAdapter);
    await flushMicrotasks();

    expect(stateOf(root, "n1")).toEqual({ v: 2 });
  });

  it("does not restore detached app state from the previous adapter", async () => {
    const firstAdapter = adapter({
      n1: { name: "note", state: { v: 1 } },
    });
    const secondAdapter = adapter({
      n1: { name: "note", state: { v: 2 } },
    });
    root = mount({ persistence: firstAdapter });
    await flushMicrotasks();
    const unregister = root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 99 }));
    unregister();

    root.getValue().setPersistenceAdapter(secondAdapter);
    await flushMicrotasks();
    root.getValue().register(reg("n1"));

    expect(stateOf(root, "n1")).toEqual({ v: 2 });
  });
});

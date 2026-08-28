import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import type {
  InteractablePersistenceAdapter,
  InteractableRegistration,
} from "./scopes";

const clientHolder: { client: unknown } = { client: null };
const clientListeners = new Set<() => void>();
let registeredModelContextProvider:
  | { subscribe?: (callback: () => void) => () => void }
  | undefined;

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

vi.mock("@assistant-ui/store/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/store/client")>();
  const { useEffect } = await import("react");
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
    useAssistantScopeEffect: useScopeEffectShim,
  };
});

const { Interactables } = await import("./Interactables");

const makeClient = () => ({
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
});

const mount = () => {
  clientHolder.client = makeClient();
  return createTapRoot(function InteractablesRoot() {
    return useResource(Interactables());
  });
};

const reg = (id: string): InteractableRegistration => ({
  id,
  name: "note",
  description: "a note",
  stateSchema: { type: "object", properties: {} } as never,
  initialState: { v: 0 },
});

const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0);

let root: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  registeredModelContextProvider = undefined;
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  clientListeners.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("legacy Interactables persistence", () => {
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

  it("saves queued changes with the adapter that observed them", async () => {
    const firstSave = vi.fn();
    const secondSave = vi.fn();
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({
      save: firstSave,
    } satisfies InteractablePersistenceAdapter);
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    root.getValue().setPersistenceAdapter({
      save: secondSave,
    } satisfies InteractablePersistenceAdapter);
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
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save: firstSave });
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setState("n1", () => ({ v: 2 }));
    root.getValue().setPersistenceAdapter({ save: secondSave });

    expect(firstSave).toHaveBeenCalledTimes(1);
    expect(secondSave).not.toHaveBeenCalled();

    saveResolvers[0]!();
    await flushMicrotasks();
    expect(firstSave).toHaveBeenCalledTimes(2);
    expect(firstSave.mock.calls[1]![0]).toEqual({
      n1: { name: "note", state: { v: 2 } },
    });
    expect(firstSave.mock.calls.at(-1)?.[0]).toEqual({
      n1: { name: "note", state: { v: 2 } },
    });
    expect(secondSave).not.toHaveBeenCalled();

    saveResolvers[1]!();
    await flushMicrotasks();
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
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save: firstSave });
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
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save });
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
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save: firstSave });
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
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save: firstSave });
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
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { parsePartialJsonObject } from "assistant-stream/utils";
import { z } from "zod";
import type {
  InteractablePersistedState,
  InteractablePersistenceAdapter,
  InteractableRegistration,
} from "./scopes";

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
  stateSchema: {
    type: "object",
    properties: {},
  } satisfies InteractableRegistration["stateSchema"],
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

describe("legacy Interactables update tool", () => {
  it("relaxes only the root requirement of the update tool", async () => {
    const stateSchema = z.object({
      title: z.string(),
      settings: z.object({ name: z.string(), size: z.number() }),
    });
    root = mount();
    await flushMicrotasks();
    root.getValue().register({
      ...reg("n1"),
      stateSchema,
      initialState: { title: "old", settings: { name: "n", size: 1 } },
    });

    const tool = registeredModelContextProvider?.getModelContext?.().tools
      ?.update_note as
      | {
          parameters: {
            required?: string[];
            properties: { settings: { required?: string[] } };
          };
          execute(
            args: Record<string, unknown>,
            context: { toolCallId: string },
          ): Promise<unknown>;
        }
      | undefined;
    expect(tool).toBeDefined();
    const { parameters } = tool!;
    expect("~standard" in parameters).toBe(false);
    expect(parameters.required).toBeUndefined();
    expect(parameters.properties.settings.required).toEqual(["name", "size"]);

    await tool!.execute({ title: "new" }, { toolCallId: "call-1" });
    await tool!.execute(
      { settings: { name: "new", size: 2 } },
      { toolCallId: "call-2" },
    );
    await flushMicrotasks();
    expect(
      stateSchema.parse(root.getValue().getState().definitions["n1"]?.state),
    ).toEqual({ title: "new", settings: { name: "new", size: 2 } });
  });

  it("keeps a streaming nested object parseable at every token", async () => {
    const stateSchema = z.object({
      title: z.string(),
      settings: z.object({ name: z.string(), size: z.number() }),
    });
    root = mount();
    await flushMicrotasks();
    root.getValue().register({
      ...reg("n1"),
      stateSchema,
      initialState: { title: "old", settings: { name: "n", size: 1 } },
    });

    const tool = registeredModelContextProvider?.getModelContext?.().tools
      ?.update_note as
      | {
          streamCall(reader: {
            args: { streamValues(): AsyncIterable<unknown> };
          }): Promise<unknown>;
          execute(
            args: Record<string, unknown>,
            context: { toolCallId: string },
          ): Promise<unknown>;
        }
      | undefined;
    expect(tool).toBeDefined();

    const text = '{"settings":{"name":"medium","size":2}}';
    const ticks: { prefix: string; state: unknown }[] = [];
    await tool!.streamCall({
      args: {
        async *streamValues() {
          for (let end = 1; end <= text.length; end++) {
            const parsed = parsePartialJsonObject(text.slice(0, end));
            if (!parsed) continue;
            yield parsed;
            await flushMicrotasks();
            ticks.push({
              prefix: text.slice(0, end),
              state: root!.getValue().getState().definitions["n1"]?.state,
            });
          }
        },
      },
    });
    for (const { prefix, state } of ticks) {
      expect(stateSchema.safeParse(state).success, prefix).toBe(true);
    }
    const distinct = ticks
      .map(({ state }) => JSON.stringify(state))
      .filter((state, index, all) => state !== all[index - 1])
      .map((state) => JSON.parse(state));
    expect(distinct).toEqual(
      ["n", "", "m", "me", "med", "medi", "mediu", "medium"]
        .map((name) => ({ title: "old", settings: { name, size: 1 } }))
        .concat({ title: "old", settings: { name: "medium", size: 2 } }),
    );

    await tool!.execute(JSON.parse(text), { toolCallId: "call-1" });
    await flushMicrotasks();
    expect(
      stateSchema.parse(root.getValue().getState().definitions["n1"]?.state),
    ).toEqual({ title: "old", settings: { name: "medium", size: 2 } });
  });

  it("falls back to the raw schema when a re-registration cannot convert", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unconvertible = {
      "~standard": {
        version: 1 as const,
        vendor: "zod",
        validate: () => ({ value: {} }),
      },
    };
    root = mount();
    await flushMicrotasks();
    root
      .getValue()
      .register({ ...reg("n1"), stateSchema: z.object({ v: z.number() }) });
    root.getValue().register({ ...reg("n1"), stateSchema: unconvertible });

    expect(
      registeredModelContextProvider?.getModelContext?.().tools?.update_note
        ?.parameters,
    ).toBe(unconvertible);
    expect(warn).toHaveBeenCalledOnce();
  });
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

  it("does not retain edits made before an adapter attaches", async () => {
    const save = vi.fn();
    root = mount();
    await flushMicrotasks();
    root.getValue().register(reg("n1"));
    root.getValue().setState("n1", () => ({ v: 1 }));

    root.getValue().setPersistenceAdapter({ save });
    await root.getValue().flush();

    expect(save).not.toHaveBeenCalled();
  });

  it("keeps edits queued during an in-flight flush with the outgoing adapter", async () => {
    const saveResolvers: Array<() => void> = [];
    const firstSave = vi.fn<
      (state: InteractablePersistedState) => Promise<void>
    >(
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
    expect(firstSave.mock.calls[1]?.[0]).toEqual({
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

  it("does not publish a previous adapter's failure into the new adapter's scope", async () => {
    let rejectFirstSave!: (reason: unknown) => void;
    const firstSave = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirstSave = reject;
        }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter({ save: firstSave });
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setPersistenceAdapter({ save: vi.fn() });
    await flushMicrotasks();

    rejectFirstSave(new Error("stale adapter save failed"));
    await flushMicrotasks();

    expect(root.getValue().getState().persistence["n1"]?.error).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[Interactables] Persistence save failed after the adapter changed.",
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("keeps an in-flight save failure in the same scope across a detach and reattach", async () => {
    let rejectSave!: (reason: unknown) => void;
    const save = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    const adapter: InteractablePersistenceAdapter = { save };
    root = mount();
    await flushMicrotasks();
    root.getValue().setPersistenceAdapter(adapter);
    root.getValue().register(reg("n1"));

    root.getValue().setState("n1", () => ({ v: 1 }));
    await vi.advanceTimersByTimeAsync(500);
    root.getValue().setPersistenceAdapter(undefined);
    root.getValue().setPersistenceAdapter(adapter);
    await flushMicrotasks();

    rejectSave(new Error("same scope save failed"));
    await flushMicrotasks();

    expect(root.getValue().getState().persistence["n1"]?.error).toBeInstanceOf(
      Error,
    );
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTapRoot, useResource } from "@assistant-ui/tap";
import type {
  InteractablePersistenceAdapter,
  InteractableRegistration,
} from "./scopes";

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

const { Interactables } = await import("./Interactables");

const makeClient = () => ({
  modelContext: () => ({ register: () => () => {} }),
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
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("legacy Interactables persistence", () => {
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
});

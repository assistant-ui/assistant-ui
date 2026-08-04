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
});

// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const unregister = vi.fn();
  const register = vi.fn(() => unregister);
  return {
    register,
    unregister,
    aui: { unstable_interactables: { register } },
    state: { optional: { part: undefined }, thread: { messages: [] } },
    methods: {
      setState: vi.fn(),
      isPending: false,
      error: undefined,
      flush: vi.fn(async () => undefined),
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

vi.mock("./useInteractableState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useInteractableState")>()),
  unstable_useInteractableState: () => [undefined, mocks.methods],
}));

import { unstable_useInteractable } from "./useInteractable";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("unstable_useInteractable", () => {
  it("refreshes the registration when its JSON schema changes", async () => {
    const schemaA = {
      type: "object" as const,
      properties: { first: { type: "string" } },
    };
    const schemaB = {
      type: "object" as const,
      properties: { second: { type: "number" } },
    };
    const initialA = { first: "one" };
    const initialB = { second: 2 };

    const hook = renderHook(
      ({ stateSchema, initialState }) =>
        unstable_useInteractable("panel", {
          id: "panel-1",
          description: "A panel",
          stateSchema,
          initialState,
        }),
      { initialProps: { stateSchema: schemaA, initialState: initialA } },
    );
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));

    hook.rerender({ stateSchema: schemaB, initialState: initialB });

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(2));
    expect(mocks.unregister).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenLastCalledWith(
      expect.objectContaining({ stateSchema: schemaB, initialState: initialB }),
    );

    hook.rerender({
      stateSchema: {
        type: "object",
        properties: { second: { type: "number" } },
      },
      initialState: { second: 3 },
    });
    expect(mocks.register).toHaveBeenCalledTimes(2);
  });

  it("stabilizes equivalent rebuilt standard schemas", async () => {
    const createSchema = (property: string) => ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (value: unknown) => ({ value }),
        toJSONSchema: () => ({
          type: "object" as const,
          properties: { [property]: { type: "string" as const } },
        }),
      },
    });
    const firstSchema = createSchema("value");

    const hook = renderHook(
      ({ stateSchema }) =>
        unstable_useInteractable("panel", {
          id: "panel-1",
          description: "A panel",
          stateSchema,
          initialState: {},
        }),
      { initialProps: { stateSchema: firstSchema } },
    );
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));

    hook.rerender({ stateSchema: createSchema("value") });
    expect(mocks.register).toHaveBeenCalledTimes(1);

    const changedSchema = createSchema("other");
    hook.rerender({ stateSchema: changedSchema });
    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(2));
    expect(mocks.register).toHaveBeenLastCalledWith(
      expect.objectContaining({ stateSchema: changedSchema }),
    );
  });
});

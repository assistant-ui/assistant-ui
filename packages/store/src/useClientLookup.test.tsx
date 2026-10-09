// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { useClientLookup } from "./useClientLookup";

const Item = resource(({ id }: { id: string }) => ({
  getState: () => ({ id }),
}));

afterEach(() => {
  cleanup();
});

describe("useClientLookup", () => {
  it("falls back to a numeric key for a string lookup", () => {
    const { result } = renderHook(() =>
      useClientLookup([withKey(1, Item({ id: "numeric" }))]),
    );

    expect(result.current.get({ key: "1" }).getState()).toEqual({
      id: "numeric",
    });
  });

  it("prefers exact matches for numeric and string keys", () => {
    const { result } = renderHook(() =>
      useClientLookup([
        withKey(1, Item({ id: "numeric" })),
        withKey("1", Item({ id: "string" })),
      ]),
    );

    expect(result.current.get({ key: 1 }).getState()).toEqual({
      id: "numeric",
    });
    expect(result.current.get({ key: "1" }).getState()).toEqual({
      id: "string",
    });
  });

  it("does not fall back from a numeric lookup to a string key", () => {
    const { result } = renderHook(() =>
      useClientLookup([withKey("1", Item({ id: "string" }))]),
    );

    expect(() => result.current.get({ key: 1 })).toThrow(
      'useClientLookup: key "1" not found',
    );
  });

  it("does not fall back from an empty string to a zero key", () => {
    const { result } = renderHook(() =>
      useClientLookup([withKey(0, Item({ id: "zero" }))]),
    );

    expect(() => result.current.get({ key: "" })).toThrow(
      'useClientLookup: key "" not found',
    );
  });
});

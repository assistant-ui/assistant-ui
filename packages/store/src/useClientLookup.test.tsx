// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { useClientLookup } from "./useClientLookup";

const Item = resource(({ id }: { id: string }) => ({
  getState: () => ({ id }),
}));

describe("useClientLookup", () => {
  it("keeps numeric and string keys distinct", () => {
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
});

import { describe, expect, it } from "vitest";
import {
  createClientAccessor,
  unwrapClientAccessor,
} from "../utils/client-accessor";
import type { ClientMethods, ClientNames } from "../types/client";

const meta = {
  name: "thread" as ClientNames,
  source: "root" as const,
  query: {},
};

describe("unwrapClientAccessor", () => {
  it("resolves accessors of the same client to the same instance", () => {
    const methods: ClientMethods = { getState: () => ({}) };
    const first = createClientAccessor(meta, () => methods);
    const second = createClientAccessor(meta, () => methods);

    expect(Object.is(first, second)).toBe(false);
    expect(unwrapClientAccessor(first)).toBe(methods);
    expect(unwrapClientAccessor(second)).toBe(methods);
  });

  it("returns non-accessor values as-is", () => {
    const plain = { getState: () => ({}) };
    expect(unwrapClientAccessor(plain)).toBe(plain);
  });
});

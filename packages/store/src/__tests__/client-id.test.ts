import { describe, expect, it } from "vitest";
import {
  createClientAccessor,
  createErrorClientAccessor,
  getClientId,
} from "../utils/client-accessor";
import type { ClientMethods, ClientNames } from "../types/client";

const meta = {
  name: "thread" as ClientNames,
  source: "root" as const,
  query: {},
};

describe("getClientId", () => {
  it("resolves accessors over the same client to the same identity", () => {
    const methods: ClientMethods = { getState: () => ({}) };
    const first = createClientAccessor(meta, () => methods);
    const second = createClientAccessor(meta, () => methods);

    expect(Object.is(first, second)).toBe(false);
    expect(getClientId(first)).toBe(getClientId(second));
    expect(getClientId(first)).toBe(getClientId(methods));
  });

  it("is stable across nested accessor layers", () => {
    const methods: ClientMethods = { getState: () => ({}) };
    const inner = createClientAccessor(meta, () => methods);
    const outer = createClientAccessor(
      meta,
      () => inner as unknown as ClientMethods,
    );

    expect(getClientId(outer)).toBe(getClientId(methods));
    expect(getClientId(outer)).toBe(getClientId(inner));
  });

  it("is distinct per bound instance", () => {
    const a: ClientMethods = { getState: () => ({}) };
    const b: ClientMethods = { getState: () => ({}) };

    expect(getClientId(createClientAccessor(meta, () => a))).not.toBe(
      getClientId(createClientAccessor(meta, () => b)),
    );
  });

  it("works as a WeakMap key shared between accessors of the same client", () => {
    const methods: ClientMethods = { getState: () => ({}) };
    const cache = new WeakMap<getClientId.ClientId, string>();

    cache.set(getClientId(createClientAccessor(meta, () => methods)), "value");

    expect(
      cache.get(getClientId(createClientAccessor(meta, () => methods))),
    ).toBe("value");
  });

  it("throws for an unavailable scope's accessor", () => {
    const accessor = createErrorClientAccessor(
      "Scope lookup failed: no AuiProvider",
      "thread",
    );

    expect(() => getClientId(accessor)).toThrow(/AuiProvider/);
  });
});

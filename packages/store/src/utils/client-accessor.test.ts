import { describe, expect, it } from "vitest";
import type { ClientMethods, ClientNames } from "../types/client";
import {
  createClientAccessor,
  createErrorClientAccessor,
} from "./client-accessor";

const meta = {
  name: "threads" as ClientNames,
  source: "root" as const,
  query: {},
};

describe("client accessors called the way transpiled optional calls do", () => {
  it("resolves `accessor.call(thisArg)` like `accessor()`", () => {
    const methods: ClientMethods = {
      getState: () => ({ mainThreadId: "main" }),
    };
    const owner = { threads: createClientAccessor(meta, () => methods) };

    // What esbuild emits for `owner?.threads?.()` below chrome91.
    const threads = owner.threads;
    const resolved = threads == null ? undefined : threads.call(owner);

    expect(resolved).toBe(owner.threads);
    expect(resolved?.getState()).toEqual({ mainThreadId: "main" });
    expect(threads.apply(owner, [])).toBe(owner.threads);
    expect(threads.bind(owner)()).toBe(owner.threads);
  });

  it("still forwards other members to the client", () => {
    const methods: ClientMethods = { getState: () => ({}), reload: () => 1 };
    const accessor = createClientAccessor(meta, () => methods);

    expect((accessor as unknown as { reload: () => number }).reload()).toBe(1);
  });

  it("throws the scope's error from `call` on an unavailable scope", () => {
    const accessor = createErrorClientAccessor(
      "threads unavailable",
      "threads",
    );

    expect(() => accessor.call(undefined)).toThrow("threads unavailable");
  });
});

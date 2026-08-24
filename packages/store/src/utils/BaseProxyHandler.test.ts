import { describe, expect, it } from "vitest";
import { handleIntrospectionProp } from "./BaseProxyHandler";
import { createErrorClientAccessor } from "./client-accessor";
import { DefaultAssistantClient } from "./react-assistant-context";

const VUE_REACTIVITY_FLAGS = [
  "__v_raw",
  "__v_isRef",
  "__v_isReactive",
  "__v_isReadonly",
  "__v_isShallow",
  "__v_skip",
] as const;

describe("handleIntrospectionProp", () => {
  it.each(VUE_REACTIVITY_FLAGS)("returns undefined for %s", (prop) => {
    expect(handleIntrospectionProp(prop, "Test")).toBe(undefined);
  });

  it("leaves other string props to the caller", () => {
    expect(handleIntrospectionProp("thread", "Test")).toBe(false);
  });
});

describe("client proxies under Vue-style introspection", () => {
  it.each(VUE_REACTIVITY_FLAGS)(
    "DefaultAssistantClient answers %s with undefined",
    (prop) => {
      expect(
        (DefaultAssistantClient as unknown as Record<string, unknown>)[prop],
      ).toBe(undefined);
    },
  );

  it.each(VUE_REACTIVITY_FLAGS)(
    "error client accessors answer %s with undefined instead of throwing",
    (prop) => {
      const accessor = createErrorClientAccessor(
        "missing scope",
        "thread",
      ) as unknown as Record<string, unknown>;
      expect(accessor[prop]).toBe(undefined);
    },
  );
});

import { describe, expect, it } from "vitest";
import { hasFieldReference, resolveFieldReferences } from "./fieldReferences";

describe("field references", () => {
  it("resolve from own fields only and drop what does not resolve", () => {
    const fields = Object.assign(Object.create({ inherited: "no" }), {
      note: "hi",
      empty: undefined,
    }) as Record<string, unknown>;

    expect(
      resolveFieldReferences(
        {
          note: { $field: "note" },
          list: [
            { $field: "note" },
            { $field: "empty" },
            { $field: "inherited" },
          ],
          literal: { $field: "note", other: 1 },
        },
        fields,
      ),
    ).toEqual({
      note: "hi",
      list: ["hi"],
      literal: { $field: "note", other: 1 },
    });
  });

  it("fall back to the reference's own fallback, and read only $field and fallback as a reference", () => {
    expect(
      resolveFieldReferences(
        {
          filled: { $field: "note", fallback: "old" },
          missing: { $field: "gone", fallback: "kept" },
          empty: { $field: "gone" },
          list: [{ $field: "gone", fallback: 0 }],
          data: { $field: "note", fallback: "old", extra: true },
        },
        { note: "new" },
      ),
    ).toEqual({
      filled: "new",
      missing: "kept",
      list: [0],
      data: { $field: "note", fallback: "old", extra: true },
    });
  });

  it("terminate on a cyclic value and keep the cycle", () => {
    const cyclic: Record<string, unknown> = { note: { $field: "note" } };
    cyclic["self"] = cyclic;
    const acyclic: Record<string, unknown> = { a: 1 };
    acyclic["self"] = { back: [acyclic] };

    expect(hasFieldReference(cyclic)).toBe(true);
    expect(hasFieldReference(acyclic)).toBe(false);
    const resolved = resolveFieldReferences(cyclic, { note: "hi" }) as Record<
      string,
      unknown
    >;
    expect(resolved["note"]).toBe("hi");
    expect(resolved["self"]).toBe(cyclic);
  });
});

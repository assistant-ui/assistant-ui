import { describe, expect, it } from "vitest";
import { resolveFieldReferences } from "./fieldReferences";

describe("resolveFieldReferences", () => {
  it("resolves nested references and drops missing values", () => {
    expect(
      resolveFieldReferences(
        {
          note: { $field: "note" },
          nested: [{ $field: "empty" }, { $field: "missing" }],
          inherited: { $field: "inherited" },
        },
        Object.assign(Object.create({ inherited: "hidden" }), {
          note: "edited",
          empty: "",
        }),
      ),
    ).toEqual({ note: "edited", nested: [""] });
  });

  it("keeps a cyclic input without recursing forever", () => {
    const cyclic: Record<string, unknown> = { note: { $field: "note" } };
    cyclic["self"] = cyclic;
    const resolved = resolveFieldReferences(cyclic, { note: "edited" }) as {
      note: string;
      self: unknown;
    };
    expect(resolved.note).toBe("edited");
    expect(resolved.self).toBe(cyclic);
  });
});

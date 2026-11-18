import { describe, expect, it } from "vitest";

import { formTools } from "./formTools";

describe("set_form_field parameters", () => {
  const { parameters } = formTools.set_form_field;

  it.each([42, true, "Ada"])("accepts %s", (value) => {
    expect(parameters.safeParse({ name: "field", value }).success).toBe(true);
  });

  it("rejects a value a form field cannot hold", () => {
    expect(parameters.safeParse({ name: "field", value: null }).success).toBe(
      false,
    );
    expect(
      parameters.safeParse({ name: "field", value: { nested: 1 } }).success,
    ).toBe(false);
  });
});

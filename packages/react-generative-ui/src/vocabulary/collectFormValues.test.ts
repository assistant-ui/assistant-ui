import { describe, it, expect } from "vitest";
import {
  collectFormValues,
  type FormControlElementLike,
} from "./collectFormValues";

const el = (
  partial: Partial<FormControlElementLike>,
): FormControlElementLike => ({
  name: "",
  type: "text",
  value: "",
  disabled: false,
  ...partial,
});

describe("collectFormValues", () => {
  it("resolves a checkbox to its checked boolean", () => {
    expect(
      collectFormValues([
        el({ name: "agree", type: "checkbox", checked: true }),
      ]),
    ).toEqual({ agree: true });
    expect(
      collectFormValues([
        el({ name: "agree", type: "checkbox", checked: false }),
      ]),
    ).toEqual({ agree: false });
  });

  it("resolves a radio set to the checked option's value", () => {
    expect(
      collectFormValues([
        el({ name: "size", type: "radio", value: "sm", checked: false }),
        el({ name: "size", type: "radio", value: "md", checked: true }),
        el({ name: "size", type: "radio", value: "lg", checked: false }),
      ]),
    ).toEqual({ size: "md" });
  });

  it("resolves a radio set with no checked option to undefined", () => {
    const values = collectFormValues([
      el({ name: "size", type: "radio", value: "sm", checked: false }),
      el({ name: "size", type: "radio", value: "md", checked: false }),
    ]);
    expect("size" in values).toBe(true);
    expect(values.size).toBeUndefined();
  });

  it("resolves select/input/textarea/date controls to their string value", () => {
    expect(
      collectFormValues([
        el({ name: "role", type: "select-one", value: "admin" }),
        el({ name: "email", type: "email", value: "a@example.com" }),
        el({ name: "bio", type: "textarea", value: "hi" }),
        el({ name: "dob", type: "date", value: "2026-01-01" }),
      ]),
    ).toEqual({
      role: "admin",
      email: "a@example.com",
      bio: "hi",
      dob: "2026-01-01",
    });
  });

  it("collects repeated non-radio names into an array in document order", () => {
    expect(
      collectFormValues([
        el({ name: "tag", type: "text", value: "a" }),
        el({ name: "tag", type: "text", value: "b" }),
        el({ name: "tag", type: "text", value: "c" }),
      ]),
    ).toEqual({ tag: ["a", "b", "c"] });
  });

  it("skips controls without a name", () => {
    expect(
      collectFormValues([
        el({ name: "", type: "text", value: "unnamed" }),
        el({ name: "kept", type: "text", value: "yes" }),
      ]),
    ).toEqual({ kept: "yes" });
  });

  it("skips disabled controls", () => {
    expect(
      collectFormValues([
        el({ name: "off", type: "text", value: "nope", disabled: true }),
        el({ name: "on", type: "text", value: "yep" }),
      ]),
    ).toEqual({ on: "yep" });
  });

  it("skips a disabled control inside an otherwise-checked radio set", () => {
    expect(
      collectFormValues([
        el({
          name: "size",
          type: "radio",
          value: "sm",
          checked: true,
          disabled: true,
        }),
        el({ name: "size", type: "radio", value: "md", checked: false }),
      ]),
    ).toEqual({ size: undefined });
  });

  it("returns an empty object for no elements", () => {
    expect(collectFormValues([])).toEqual({});
  });

  it("a field named __proto__ round-trips as an own data key", () => {
    const values = collectFormValues([
      el({ name: "__proto__", type: "text", value: "x" }),
    ]);
    expect(Object.hasOwn(values, "__proto__")).toBe(true);
    expect(values["__proto__"]).toBe("x");
  });

  it("a field named constructor collects as its submitted string, not an array seeded with the inherited function", () => {
    const values = collectFormValues([
      el({ name: "constructor", type: "text", value: "hi" }),
    ]);
    expect(values["constructor"]).toBe("hi");
  });
});

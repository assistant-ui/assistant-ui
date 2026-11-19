// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rejectedPropType } from "./resolved";

describe("rejectedPropType", () => {
  it("rejects an object for a string prop", () => {
    const schema = {
      type: "object" as const,
      properties: { src: { type: "string" as const } },
    };
    expect(rejectedPropType(schema, { src: "photo.jpg" })).toBeUndefined();
    expect(rejectedPropType(schema, { src: {} })).toBe(
      "src expected string, got object",
    );
  });

  it("reports an array separately", () => {
    expect(
      rejectedPropType(
        { properties: { src: { type: "string" } } },
        { src: ["photo.jpg"] },
      ),
    ).toBe("src expected string, got array");
  });

  it("describes primitive unions from type arrays and anyOf", () => {
    expect(
      rejectedPropType(
        { properties: { value: { type: ["number", "string"] } } },
        { value: {} },
      ),
    ).toBe("value expected number or string, got object");
    expect(
      rejectedPropType(
        {
          properties: {
            value: { anyOf: [{ type: "number" }, { type: "string" }] },
          },
        },
        { value: [] },
      ),
    ).toBe("value expected number or string, got array");
  });

  it("handles enum-only and oneOf primitive schemas", () => {
    expect(
      rejectedPropType(
        { properties: { value: { enum: ["a", 1, false] } } },
        { value: {} },
      ),
    ).toBe("value expected one of the listed values, got object");
    expect(
      rejectedPropType(
        {
          properties: {
            value: { oneOf: [{ type: "boolean" }, { type: "null" }] },
          },
        },
        { value: {} },
      ),
    ).toBe("value expected boolean or null, got object");
  });

  it("leaves non-primitive schemas and missing schemas alone", () => {
    expect(
      rejectedPropType(
        { properties: { value: { type: "array" } } },
        { value: [] },
      ),
    ).toBeUndefined();
    expect(
      rejectedPropType(
        {
          properties: {
            value: { anyOf: [{ type: "string" }, { type: "object" }] },
          },
        },
        { value: {} },
      ),
    ).toBeUndefined();
    expect(
      rejectedPropType(
        { properties: { value: { enum: ["a", []] } } },
        { value: [] },
      ),
    ).toBeUndefined();
    expect(rejectedPropType(undefined, { value: {} })).toBeUndefined();
  });
});

describe("rejectedPropType after resolution", () => {
  const schema = {
    type: "object" as const,
    properties: {
      href: { type: "string" as const, enum: ["/home", "/docs"] },
      label: { type: "string" as const },
    },
    required: ["label"],
  };

  it("checks values resolved from expressions against the full schema", () => {
    expect(
      rejectedPropType(
        schema,
        { href: "javascript:bad()", label: "Home" },
        { href: { $state: "/href" }, label: "Home" },
      ),
    ).toBe('href must be one of "/home", "/docs"');
    expect(
      rejectedPropType(
        schema,
        { href: "/docs", label: "Docs" },
        { href: { $state: "/href" }, label: "Docs" },
      ),
    ).toBeUndefined();
  });

  it("accepts an expression that resolves to nothing", () => {
    expect(
      rejectedPropType(
        schema,
        { label: undefined },
        { label: { $state: "/label" } },
      ),
    ).toBeUndefined();
  });

  it("checks every prop of a Standard Schema once one is an expression", () => {
    const standard = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (value: unknown) =>
          (value as { href?: unknown }).href === "/home"
            ? { value }
            : { issues: [{ message: "is not allowed", path: ["href"] }] },
      },
    };
    expect(
      rejectedPropType(
        standard,
        { href: "javascript:bad()", label: "Home" },
        { href: "javascript:bad()", label: { $state: "/label" } },
      ),
    ).toBe("href is not allowed");
  });
});

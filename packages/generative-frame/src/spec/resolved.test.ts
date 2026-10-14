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

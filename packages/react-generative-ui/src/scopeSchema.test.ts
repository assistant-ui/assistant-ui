import type { JSONSchema7 } from "json-schema";
import { describe, expect, it } from "vitest";
import { scopeSchema } from "./scopeSchema";

const ref = { $ref: "#/definitions/a~1b~0c" };
const scopedRef = { $ref: "#/$defs/component0/definitions/a~1b~0c" };
const scope = (schema: JSONSchema7) =>
  scopeSchema(schema, "#/$defs/component0");

describe("scopeSchema", () => {
  it.each(["properties", "patternProperties", "definitions", "$defs"])(
    "rebases schemas inside %s without changing the input",
    (keyword) => {
      const original = {
        [keyword]: { value: ref, allowed: true, forbidden: false },
      };
      const result = scope(original);
      expect(result.schema).toEqual({
        [keyword]: { value: scopedRef, allowed: true, forbidden: false },
      });
      expect(result.referenced).toBe(true);
      expect(original).toEqual({
        [keyword]: { value: ref, allowed: true, forbidden: false },
      });
    },
  );
  it.each(["allOf", "anyOf", "oneOf", "items"])(
    "rebases schemas in %s arrays",
    (keyword) => {
      expect(scope({ [keyword]: [ref, true, false] }).schema).toEqual({
        [keyword]: [scopedRef, true, false],
      });
    },
  );
  it.each([
    "items",
    "additionalProperties",
    "additionalItems",
    "contains",
    "propertyNames",
    "not",
    "if",
    "then",
    "else",
  ])("rebases the %s subschema", (keyword) => {
    expect(scope({ [keyword]: ref }).schema).toEqual({ [keyword]: scopedRef });
  });
  it("preserves property dependencies while rebasing schema dependencies", () => {
    expect(
      scope({ dependencies: { first: ["second"], other: ref } }).schema,
    ).toEqual({ dependencies: { first: ["second"], other: scopedRef } });
  });
  it("leaves literal data, external references, and named anchors unchanged", () => {
    const schema: JSONSchema7 = {
      default: ref,
      examples: [ref],
      enum: [ref],
      const: ref,
      properties: {
        remote: { $ref: "https://example.com/schema.json#/definitions/value" },
        anchor: { $ref: "#value" },
      },
    };
    expect(scope(schema)).toEqual({ schema, referenced: false });
  });
});

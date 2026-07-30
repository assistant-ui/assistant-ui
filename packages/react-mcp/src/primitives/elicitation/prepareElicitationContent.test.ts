// @vitest-environment node

import { describe, expect, it } from "vitest";
import { prepareElicitationContent } from "./prepareElicitationContent";

describe("prepareElicitationContent", () => {
  it("accepts parseable number and integer draft values", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            count: { type: "integer" },
            ratio: { type: "number" },
            enabled: { type: "boolean" },
          },
        },
        { count: "42", ratio: "1.5", enabled: false },
      ).content,
    ).toEqual({ count: 42, ratio: 1.5, enabled: false });
  });

  it("flags and excludes an unparseable number value", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "number" } },
        },
        { count: "not a number" },
      ).content,
    ).toEqual({});
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "number" } },
        },
        { count: "not a number" },
      ).invalid,
    ).toEqual(["count"]);
  });

  it("flags and excludes a fractional integer value", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "integer" } },
        },
        { count: "1.5" },
      ).content,
    ).toEqual({});
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "integer" } },
        },
        { count: "1.5" },
      ).invalid,
    ).toEqual(["count"]);
  });

  it("flags enum values outside the allowed values for the Accept gate", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { color: { enum: ["red", "blue"] } },
        },
        { color: "green" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: ["color"] });
  });

  it("does not read inherited draft values", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["toString"],
          properties: { toString: { type: "string" } },
        },
        {},
      ),
    ).toEqual({
      content: {},
      missingRequired: ["toString"],
      invalid: [],
    });
  });

  it("seeds required booleans with a true schema default", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled"],
          properties: {
            enabled: { type: "boolean", default: true },
          },
        },
        {},
      ),
    ).toEqual({
      content: { enabled: true },
      missingRequired: [],
      invalid: [],
    });
  });

  it("seeds required booleans with a false schema default", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled"],
          properties: {
            enabled: { type: "boolean", default: false },
          },
        },
        {},
      ),
    ).toEqual({
      content: { enabled: false },
      missingRequired: [],
      invalid: [],
    });
  });

  it("seeds required booleans without a schema default as false", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled"],
          properties: { enabled: { type: "boolean" } },
        },
        {},
      ),
    ).toEqual({
      content: { enabled: false },
      missingRequired: [],
      invalid: [],
    });
  });

  it("omits absent optional booleans, including schema defaults", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            sendEmail: { type: "boolean", default: true },
          },
        },
        {},
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("seeds required booleans with an empty draft value as false", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled"],
          properties: { enabled: { type: "boolean" } },
        },
        { enabled: "" },
      ),
    ).toEqual({
      content: { enabled: false },
      missingRequired: [],
      invalid: [],
    });
  });

  it("omits an empty optional string draft", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { query: { type: "string" } },
        },
        { query: "" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("treats an empty required string draft as absent", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["query"],
          properties: { query: { type: "string" } },
        },
        { query: "" },
      ),
    ).toEqual({
      content: {},
      missingRequired: ["query"],
      invalid: [],
    });
  });

  it("treats a cleared enum draft as absent instead of invalid", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            color: { type: "string", enum: ["red", "blue"] },
            shade: { enum: ["light", "dark"] },
          },
        },
        { color: "", shade: "" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("ignores empty-string defaults and enums on non-string schemas", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            limit: { type: "number", default: "" },
            count: { type: "integer", enum: [1, 2, ""] },
          },
        },
        { limit: "", count: "" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("seeds a required boolean whose schema declares an empty-string default", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled"],
          properties: { enabled: { type: "boolean", default: "" } },
        },
        { enabled: "" },
      ),
    ).toEqual({
      content: { enabled: false },
      missingRequired: [],
      invalid: [],
    });
  });

  it("reports a cleared required enum draft as missing instead of invalid", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["color"],
          properties: { color: { type: "string", enum: ["red", "blue"] } },
        },
        { color: "" },
      ),
    ).toEqual({ content: {}, missingRequired: ["color"], invalid: [] });
  });

  it("keeps an empty string the enum admits", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["note"],
          properties: { note: { type: "string", enum: ["", "none"] } },
        },
        { note: "" },
      ),
    ).toEqual({ content: { note: "" }, missingRequired: [], invalid: [] });
  });

  it("ignores an empty-string default the enum does not admit", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["color"],
          properties: {
            color: { type: "string", enum: ["red", "blue"], default: "" },
          },
        },
        { color: "" },
      ),
    ).toEqual({ content: {}, missingRequired: ["color"], invalid: [] });
  });

  it("keeps an empty string the schema defaults to", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["prefix"],
          properties: { prefix: { type: "string", default: "" } },
        },
        { prefix: "" },
      ),
    ).toEqual({ content: { prefix: "" }, missingRequired: [], invalid: [] });
  });

  it("treats an empty optional boolean draft as absent", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { enabled: { type: "boolean" } },
        },
        { enabled: "" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("treats undefined and empty optional boolean drafts as absent", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            sendEmail: { type: "boolean" },
          },
        },
        { enabled: undefined, sendEmail: "" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: [] });
  });

  it("flags and excludes mistyped boolean draft values", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { enabled: { type: "boolean" } },
        },
        { enabled: "true" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: ["enabled"] });
  });

  it("flags a mistyped required boolean instead of seeding false", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { enabled: { type: "boolean" } },
          required: ["enabled"],
        },
        { enabled: "true" },
      ),
    ).toEqual({ content: {}, missingRequired: [], invalid: ["enabled"] });
  });

  it("treats null drafts as absent for booleans and required fields", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            query: { type: "string" },
          },
          required: ["enabled", "query"],
        },
        { enabled: null, query: null },
      ),
    ).toEqual({
      content: { enabled: false },
      missingRequired: ["query"],
      invalid: [],
    });
  });

  it("treats a cleared numeric draft as absent instead of invalid", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: {
            limit: { type: "number" },
            count: { type: "integer" },
          },
          required: ["limit"],
        },
        { limit: "", count: "" },
      ),
    ).toEqual({
      content: {},
      missingRequired: ["limit"],
      invalid: [],
    });
  });

  it("reports required draft values that resolve to absent", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["name", "email", "ignored"],
          properties: {},
        },
        { name: "", email: "ada@example.com" },
      ).missingRequired,
    ).toEqual(["name", "ignored"]);
  });
});

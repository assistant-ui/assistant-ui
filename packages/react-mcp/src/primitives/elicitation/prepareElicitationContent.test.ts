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

  it("accepts missing required booleans as false", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          required: ["enabled", "name"],
          properties: {
            enabled: { type: "boolean" },
            name: { type: "string" },
          },
        },
        { name: "Ada" },
      ),
    ).toEqual({
      content: { name: "Ada", enabled: false },
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

  it("reports required draft values that are absent or empty", () => {
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

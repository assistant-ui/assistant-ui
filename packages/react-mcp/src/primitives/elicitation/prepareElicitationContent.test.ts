// @vitest-environment node

import { describe, expect, it } from "vitest";
import { prepareElicitationContent } from "./prepareElicitationContent";

describe("prepareElicitationContent", () => {
  it("coerces parseable number and integer draft values", () => {
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

  it("leaves an unparseable number value as a string", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "number" } },
        },
        { count: "not a number" },
      ).content,
    ).toEqual({ count: "not a number" });
  });

  it("leaves a fractional integer value as a string", () => {
    expect(
      prepareElicitationContent(
        {
          type: "object",
          properties: { count: { type: "integer" } },
        },
        { count: "1.5" },
      ).content,
    ).toEqual({ count: "1.5" });
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
    ).toEqual({ content: {}, missingRequired: ["toString"] });
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

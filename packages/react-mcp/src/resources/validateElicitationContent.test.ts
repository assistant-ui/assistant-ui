// @vitest-environment node

import { describe, expect, it } from "vitest";
import { validateElicitationContent } from "./validateElicitationContent";

describe("validateElicitationContent", () => {
  it.each([
    ["string", 1, "Expected a string."],
    ["number", "1", "Expected a number."],
    ["integer", "1", "Expected an integer."],
    ["boolean", "true", "Expected a boolean."],
  ])("rejects a %s type mismatch", (type, value, message) => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: { value: { type } },
        },
        { value },
      ),
    ).toEqual([{ property: "value", message }]);
  });

  it("rejects a fractional integer", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: { count: { type: "integer" } },
        },
        { count: 1.5 },
      ),
    ).toEqual([{ property: "count", message: "Expected an integer." }]);
  });

  it.each([
    ["number", NaN, "Expected a number."],
    ["number", Infinity, "Expected a number."],
    ["number", -Infinity, "Expected a number."],
    ["integer", NaN, "Expected an integer."],
    ["integer", Infinity, "Expected an integer."],
    ["integer", -Infinity, "Expected an integer."],
  ])("rejects a non-finite %s", (type, value, message) => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: { value: { type } },
        },
        { value },
      ),
    ).toEqual([{ property: "value", message }]);
  });

  it("rejects a value outside an enum", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: { color: { enum: ["red", "blue"] } },
        },
        { color: "green" },
      ),
    ).toEqual([
      {
        property: "color",
        message: "Must be one of the allowed values.",
      },
    ]);
  });

  it("rejects an absent required property", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
        },
        {},
      ),
    ).toEqual([{ property: "answer", message: "This property is required." }]);
  });

  it("accepts an empty string as a present required property", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
        },
        { answer: "" },
      ),
    ).toEqual([]);
  });

  it("allows unknown content properties", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: { answer: { type: "string" } },
        },
        { extra: true },
      ),
    ).toEqual([]);
  });

  it("leaves constraints beyond the flat validation subset for the server", () => {
    expect(
      validateElicitationContent(
        {
          type: "object",
          properties: {
            answer: { type: "string", minLength: 5, format: "email" },
          },
        },
        { answer: "x" },
      ),
    ).toEqual([]);
  });
});

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

import { describe, expect, it } from "vitest";
import { findAnsweredValues } from "./answeredValues";

describe("findAnsweredValues", () => {
  it("returns the latest action's object input", () => {
    expect(
      findAnsweredValues({
        entries: [
          {
            type: "action",
            payload: { $input: { choice: "first" } },
          },
          { type: "human-response", payload: { choice: "ignored" } },
          {
            type: "action",
            payload: { $input: { choice: "last" } },
          },
        ],
      }),
    ).toEqual({ choice: "last" });
  });

  it("ignores actions whose input is not a plain object", () => {
    expect(
      findAnsweredValues({
        entries: [
          { type: "action", payload: { $input: { choice: "kept" } } },
          { type: "action", payload: { $input: ["not", "an", "object"] } },
        ],
      }),
    ).toEqual({ choice: "kept" });
  });
});

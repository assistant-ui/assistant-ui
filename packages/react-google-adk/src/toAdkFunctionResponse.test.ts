import { describe, expect, it } from "vitest";
import {
  isAdkFunctionError,
  toAdkFunctionResponse,
} from "./toAdkFunctionResponse";

describe("ADK function response errors", () => {
  it("retains an existing error envelope without mutating or nesting it", () => {
    const response = Object.freeze({ error: "denied", output: "partial" });
    expect(toAdkFunctionResponse(response, true)).toBe(response);
  });

  it("preserves a failure with no details through JSON serialization", () => {
    const response = JSON.parse(
      JSON.stringify(toAdkFunctionResponse(undefined, true)),
    );
    expect(response).toEqual({ error: null });
    expect(isAdkFunctionError(response)).toBe(true);
  });

  it("does not classify an undefined error field as an on-wire error", () => {
    expect(isAdkFunctionError({ error: undefined })).toBe(false);
    expect(
      isAdkFunctionError(JSON.parse(JSON.stringify({ error: undefined }))),
    ).toBe(false);
  });

  it("does not classify inherited error fields as an on-wire error", () => {
    const response = Object.create({ error: "inherited" });
    response.output = "done";
    expect(isAdkFunctionError(response)).toBe(false);
  });

  it.each([
    ["done", { result: "done" }],
    [[1, 2], { results: [1, 2] }],
    [
      { output: { error: "application data" } },
      { output: { error: "application data" } },
    ],
    [null, { result: null }],
  ])("leaves successful result %j unchanged", (result, expected) => {
    expect(toAdkFunctionResponse(result)).toEqual(expected);
    expect(isAdkFunctionError(toAdkFunctionResponse(result))).toBe(false);
  });
});

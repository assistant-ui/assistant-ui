import { describe, expect, it } from "vitest";
import { isCompositionKey } from "./isCompositionKey";

describe("isCompositionKey", () => {
  it("recognizes active composition and Safari's post-composition keydown", () => {
    expect(isCompositionKey({ isComposing: true, keyCode: 13 })).toBe(true);
    expect(isCompositionKey({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isCompositionKey({ isComposing: false, keyCode: 13 })).toBe(false);
  });
});

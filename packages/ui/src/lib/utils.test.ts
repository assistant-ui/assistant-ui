import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins strings, arrays and truthy object keys", () => {
    expect(cn("a", ["b", "c"], { d: true, e: false })).toBe("a b c d");
  });

  it("drops falsy arguments", () => {
    expect(cn("a", undefined, null, false, 0, "", "b")).toBe("a b");
  });

  it("keeps the last of two conflicting utilities", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("treats a modifier as its own conflict scope", () => {
    expect(cn("p-2", "hover:p-4")).toBe("p-2 hover:p-4");
    expect(cn("hover:p-2", "hover:p-4")).toBe("hover:p-4");
  });

  it("resolves an arbitrary value against a named utility", () => {
    expect(cn("w-4", "w-[13px]")).toBe("w-[13px]");
  });

  it("lets a later conditional override an earlier base", () => {
    expect(cn("bg-white", { "bg-black": true })).toBe("bg-black");
  });
});

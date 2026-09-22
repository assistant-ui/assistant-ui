import { describe, expect, it } from "vitest";
import { dynamic } from "./page";

describe("PackagesPage", () => {
  it("renders at request time so npm is never read from a build", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});

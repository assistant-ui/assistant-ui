import { describe, it, expect } from "vitest";
import { getAvailableDocFiles } from "../../utils/paths.js";
import { listCodeExamples } from "../examples.js";

describe("listing caches", () => {
  it("caches the doc file listing (same instance on repeat calls)", async () => {
    const first = await getAvailableDocFiles();
    const second = await getAvailableDocFiles();
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });

  it("caches the example listing (same instance on repeat calls)", async () => {
    const first = await listCodeExamples();
    const second = await listCodeExamples();
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
  });
});

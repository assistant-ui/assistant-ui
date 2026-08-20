import { describe, expect, it, vi } from "vitest";

const sampleSource = vi.hoisted(
  () => `import type { Used } from "package";
import type { Unused } from "package";

export function Sample({ value }: Used) {
  return <div>{value}</div>;
}`,
);

vi.mock("node:fs", () => ({
  default: {
    existsSync: () => false,
    readFileSync: () => sampleSource,
  },
}));

import { PreviewCode } from "./preview-code.server";

vi.mock("./preview-code", () => ({ PreviewCodeClient: () => null }));

describe("PreviewCode", () => {
  it("keeps only the type import used by the preview function", async () => {
    const preview = await PreviewCode({
      file: "fixture",
      name: "Sample",
      children: null,
    });
    const { code } = preview.props as { code: string };

    expect(code).toContain('import type { Used } from "package";');
    expect(code).not.toContain("Unused");
  });
});

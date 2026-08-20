import { describe, expect, it, vi } from "vitest";

import { PreviewCode } from "./preview-code.server";

vi.mock("./preview-code", () => ({ PreviewCodeClient: () => null }));

describe("PreviewCode", () => {
  it("keeps only the type import used by the preview function", async () => {
    const preview = await PreviewCode({
      file: "components/docs/samples/tool-fallback/custom-renderer",
      name: "WeatherToolUI",
      children: null,
    });
    const { code } = preview.props as { code: string };

    expect(code).toContain(
      'import type { ToolCallMessagePartProps } from "@assistant-ui/react";',
    );
    expect(code).not.toContain("AssistantRuntime");
  });
});

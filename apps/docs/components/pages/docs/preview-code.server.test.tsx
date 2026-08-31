import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PreviewCode } from "./preview-code.server";

const PreviewCodeClient = vi.hoisted(() => () => null);

vi.mock("./preview-code", () => ({
  PreviewCodeClient,
}));

type PreviewCodeElement = ReactElement<{
  code: string;
  baseCode?: string;
}>;

async function getPreviewCode(
  file: string,
  name: string,
): Promise<PreviewCodeElement["props"]> {
  const element = (await PreviewCode({
    file,
    name,
    children: null,
    base: null,
  })) as PreviewCodeElement;
  return element.props;
}

describe("PreviewCode", () => {
  it("keeps a leading client directive in the extracted snippet", async () => {
    const { code, baseCode } = await getPreviewCode(
      "components/pages/docs/samples/badge",
      "BadgeAnimatedSample",
    );

    expect(code.startsWith('"use client";\n\n')).toBe(true);
    expect(baseCode?.startsWith('"use client";\n\n')).toBe(true);
    expect(code).toContain('import { useEffect, useState } from "react";');
    expect(code).toContain("function BadgeAnimatedSample()");
  });

  it("does not add a client directive to directive-free samples", async () => {
    const { code } = await getPreviewCode(
      "components/pages/docs/samples/mermaid",
      "MermaidSample",
    );

    expect(code).not.toMatch(/^["']use client["'];?/);
    expect(code).toContain(
      'import { renderMermaidSVG } from "beautiful-mermaid";',
    );
    expect(code).toContain("function MermaidSample()");
  });

  it("keeps an import the sample binds under an inline type specifier", async () => {
    const { code } = await getPreviewCode(
      "components/pages/design/specimens",
      "TooltipSpecimen",
    );

    expect(code).toContain('import { useState, type ReactNode } from "react";');
    expect(code).toContain("): ReactNode {");
  });

  it("keeps only the type import used by the preview function", async () => {
    const { code } = await getPreviewCode(
      "components/pages/docs/samples/tool-ui/custom-renderer",
      "WeatherToolUI",
    );

    expect(code).toContain(
      'import type { ToolCallMessagePartProps } from "@assistant-ui/react";',
    );
    expect(code).not.toContain("AssistantRuntime");
  });
});

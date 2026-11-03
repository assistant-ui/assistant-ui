import { describe, expect, it, vi } from "vitest";
import { evaluate } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";

const imports = vi.hoisted(() => ({ flow: vi.fn() }));

vi.mock("@/components/assistant-ui/elements/flow", async (importOriginal) => {
  imports.flow();
  return { ...(await importOriginal()) };
});

describe("compiler MDX provider", () => {
  it("keeps explicitly supplied components without loading the site's renderers", async () => {
    const { useMDXComponents } = await import("./mdx-components");
    const components = { h2: "h3" as const };

    expect(imports.flow).not.toHaveBeenCalled();
    expect(useMDXComponents(components)).toEqual(components);
    expect(useMDXComponents()).toEqual({});
  });

  it("renders compiled headings and named components with the page's explicit map", async () => {
    const { useMDXComponents } = await import("./mdx-components");
    const { default: Body } = await evaluate(
      "# Documentation\n\n<Callout>Preserved content</Callout>",
      { ...runtime, useMDXComponents },
    );

    expect(
      renderToStaticMarkup(
        <Body components={{ h1: "h2", Callout: "aside" }} />,
      ),
    ).toBe("<h2>Documentation</h2>\n<aside>Preserved content</aside>");
  });
});

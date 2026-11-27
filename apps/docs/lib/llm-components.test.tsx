import type { ComponentProps, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LLM_COMPONENTS } from "./llm-components";

const Pre = LLM_COMPONENTS.pre as (
  props: ComponentProps<"pre">,
) => ReactElement;

describe("LLM code blocks", () => {
  it("keep the fence title, usually a file path, as the line before the block", () => {
    const html = renderToStaticMarkup(
      <Pre title="app/api/chat/route.ts">
        <code>export {"{}"};</code>
      </Pre>,
    );

    expect(html).toBe(
      "<p><code>app/api/chat/route.ts</code></p><pre><code>export {};</code></pre>",
    );
  });

  it("add nothing for a block without a title", () => {
    const html = renderToStaticMarkup(
      <Pre>
        <code>pnpm install</code>
      </Pre>,
    );

    expect(html).toBe("<pre><code>pnpm install</code></pre>");
  });
});

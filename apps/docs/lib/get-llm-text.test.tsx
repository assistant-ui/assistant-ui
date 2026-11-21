import { Link } from "@farm.js/core/client";
import type { MDXComponents } from "mdx/types";
import { describe, expect, it } from "vitest";
import "@/test/mock-content";

import { getLLMText } from "./get-llm-text";

const page = (Body: (props: { components: MDXComponents }) => unknown) =>
  ({
    url: "/docs/page",
    data: { title: "Page", load: async () => ({ body: Body }) },
  }) as unknown as Parameters<typeof getLLMText>[0];

describe("getLLMText", () => {
  it("keeps Farm links as markdown links", async () => {
    const markdown = await getLLMText(
      page(({ components: { a: A = "a" } }) => (
        <>
          <p>
            Start with <A href="/docs/installation">Installation</A>.
          </p>
          <p>
            Then read <Link href="/docs/runtimes">Runtimes</Link>.
          </p>
        </>
      )),
    );

    expect(markdown).toContain(
      "Start with [Installation](/docs/installation).",
    );
    expect(markdown).toContain("Then read [Runtimes](/docs/runtimes).");
    expect(markdown).not.toMatch(/^- href/m);
  });
});

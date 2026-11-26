import type { ComponentType, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { getLLMText } from "./get-llm-text";
import { findAgentMarkdownProblems } from "./agent-markdown-check";

type MDXBody = ComponentType<{
  components?: Record<string, ComponentType<Record<string, unknown>>>;
}>;

function pageOf(Body: MDXBody) {
  return {
    url: "/docs/test",
    data: {
      title: "Test",
      description: undefined,
      load: async () => ({ body: Body }),
    },
  } as unknown as Parameters<typeof getLLMText>[0];
}

// What Next hands the server for a `"use client"` export.
function clientReference(id: string) {
  const reference = (() => null) as unknown as ComponentType<
    Record<string, unknown>
  > & { $$typeof: symbol; $$id: string };
  Object.defineProperty(reference, "name", { value: "" });
  reference.$$typeof = Symbol.for("react.client.reference");
  reference.$$id = id;
  return reference;
}

async function render(
  children: (
    c: Record<string, ComponentType<Record<string, unknown>>>,
  ) => ReactNode,
) {
  const markdown = await getLLMText(
    pageOf(({ components = {} }) => <>{children(components)}</>),
  );
  return markdown.slice(markdown.indexOf("\n\n", markdown.indexOf("URL:")));
}

describe("agent markdown keeps what the page shows", () => {
  it("emits a mermaid diagram as a fenced mermaid block", async () => {
    const markdown = await render((components) => {
      const MermaidDiagram = components.MermaidDiagram!;
      return <MermaidDiagram>{"flowchart LR\n  a --> b\n"}</MermaidDiagram>;
    });

    expect(markdown).toContain("```mermaid\nflowchart LR\n  a --> b\n```");
  });

  it("describes a live demo with its description prop", async () => {
    const Demo = clientReference(
      "samples/turn-anchor.lazy.tsx#TurnAnchorSample",
    );
    const markdown = await render(() => (
      <Demo description="The user's question stays pinned to the top while the reply streams in below it" />
    ));

    expect(markdown).toContain(
      "Live demo: The user's question stays pinned to the top while the reply streams in below it.",
    );
    expect(markdown).not.toContain("interactive preview");
  });

  it("names a demo without a description after its export", async () => {
    const Demo = clientReference(
      "samples/turn-anchor.lazy.tsx#TurnAnchorSample",
    );
    const markdown = await render(() => <Demo />);

    expect(markdown).toContain(
      "Live demo: Turn anchor sample (interactive on the web page).",
    );
  });

  it("keeps a client highlighter's source as a fenced block", async () => {
    const Highlight = clientReference(
      "components/shared/highlight.tsx#Highlight",
    );
    const markdown = await render(() => (
      <Highlight
        language="tsx"
        code={"export function A() {\n  return <MenuPrimitive.Root />;\n}"}
      />
    ));

    expect(markdown).toContain(
      "```tsx\nexport function A() {\n  return <MenuPrimitive.Root />;\n}\n```",
    );
    expect(findAgentMarkdownProblems({ url: "/docs/test", markdown })).toEqual(
      [],
    );
  });

  it("turns package manager tabs into one install command", async () => {
    const Tabs = clientReference(
      "install/package-manager-tabs.tsx#PackageManagerTabs",
    );
    const markdown = await render(() => (
      <Tabs packages={["@assistant-ui/react-streamdown", "streamdown"]} />
    ));

    expect(markdown).toContain(
      "```bash\nnpm install @assistant-ui/react-streamdown streamdown\n```",
    );
  });

  it("turns the API overview's context tree into a nested list", async () => {
    const Component = clientReference("api-reference/context.tsx#Component");
    const markdown = await render(() => (
      <Component
        name="AssistantRuntimeProvider"
        props="runtime={runtime}"
        docsLink="/docs/api-reference/context-providers/assistant-runtime-provider"
        tooltip="Provides the highest level context"
        providedContexts={[{ name: "Thread Context", color: "#45a049" }]}
      >
        <Component
          name="ThreadPrimitive"
          docsLink="/docs/api-reference/primitives/thread"
        />
      </Component>
    ));

    expect(markdown).toContain(
      "- [`<AssistantRuntimeProvider runtime={runtime}>`](/docs/api-reference/context-providers/assistant-runtime-provider) — Provides the highest level context. Provides: Thread Context\n  - [`ThreadPrimitive`](/docs/api-reference/primitives/thread)",
    );
    expect(markdown).not.toContain("#45a049");
  });
});

describe("findAgentMarkdownProblems", () => {
  it("flags placeholders, raw component tags and emptied sections, not code", () => {
    const markdown = [
      "# Page",
      "URL: /docs/page",
      "",
      "[interactive preview omitted]",
      "",
      "Use \\<Thread /> here, but `<Thread />` in code is fine.",
      "",
      "```tsx",
      "<Composer />",
      "```",
      "",
      "## Props",
      "",
      "## Next",
      "",
      "Text.",
    ].join("\n");

    expect(
      findAgentMarkdownProblems({ url: "/docs/page", markdown }).map(
        ({ kind, detail }) => `${kind} ${detail}`,
      ),
    ).toEqual([
      "placeholder [interactive preview omitted]",
      "raw-jsx <Thread>",
      "empty-section Props",
    ]);
  });
});

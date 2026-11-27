import type { ComponentType, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { getLLMText } from "./get-llm-text";
import {
  checkLLMsFull,
  findAgentMarkdownProblems,
  isLLMsFullBody,
} from "./agent-markdown-check";

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

  it("keeps a highlighted fence's title, lines and selected platform package", async () => {
    const page = pageOf(({ components = {} }) => {
      const DocsCodeBlock = components.DocsCodeBlock!;
      return (
        <DocsCodeBlock
          lang="tsx"
          meta='title="app.tsx"'
          code={
            'import { Thread } from "@assistant-ui/react";\n\n<Thread />;\n'
          }
        />
      );
    });

    const markdown = await getLLMText(page, { platform: "rn" });
    expect(markdown).toContain(
      '`app.tsx`\n\n```\nimport { Thread } from "@assistant-ui/react-native";\n\n<Thread />;\n```',
    );
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
        providedContexts={[
          { name: "Thread Context", color: "#45a049" },
          {
            name: "Composer Context",
            color: "#ff9933",
            link: "#composer-context",
          },
        ]}
      >
        <Component
          name="ThreadPrimitive"
          docsLink="/docs/api-reference/primitives/thread"
        />
      </Component>
    ));

    expect(markdown).toContain(
      "- [`<AssistantRuntimeProvider runtime={runtime}>`](/docs/api-reference/context-providers/assistant-runtime-provider) — Provides the highest level context. Provides: Thread Context, [Composer Context](#composer-context)\n  - [`ThreadPrimitive`](/docs/api-reference/primitives/thread)",
    );
    expect(markdown).not.toContain("#45a049");
    expect(markdown).not.toContain("#ff9933");
  });

  it("keeps a file tree as a nested list", async () => {
    const Files = clientReference("fumadocs/files.tsx#Files");
    const Folder = clientReference("fumadocs/files.tsx#Folder");
    const File = clientReference("fumadocs/files.tsx#File");
    const markdown = await render(() => (
      <Files>
        <Folder name="app" defaultOpen>
          <File name="page.tsx" />
        </Folder>
        <File name="package.json" />
      </Files>
    ));

    expect(markdown).toContain("- `app/`\n  - `page.tsx`\n- `package.json`");
  });
});

describe("checkLLMsFull", () => {
  it("fails a body with no pages, so a format change can't pass silently", () => {
    expect(checkLLMsFull("")).toMatchObject({ ok: false, pageCount: 0 });
    expect(checkLLMsFull("<html>not markdown</html>")).toMatchObject({
      ok: false,
      pageCount: 0,
    });
  });

  it("passes clean pages and only reports an empty section", () => {
    const text = [
      "# A",
      "URL: /docs/a",
      "",
      "Text.",
      "",
      "## Empty",
      "",
      "# B",
      "URL: /docs/b",
      "",
      "Live demo: A thread.",
    ].join("\n");

    const verdict = checkLLMsFull(text);
    expect(verdict).toMatchObject({ ok: true, pageCount: 2, blocking: [] });
    expect(verdict.problems.map((problem) => problem.kind)).toEqual([
      "empty-section",
    ]);
  });

  it("fails on a placeholder", () => {
    const verdict = checkLLMsFull(
      "# A\nURL: /docs/a\n\n[interactive preview omitted]\n",
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.blocking).toHaveLength(1);
  });
});

describe("isLLMsFullBody", () => {
  it("finds the prerendered body in the default and the adapter layout", () => {
    expect(isLLMsFullBody("app/llms-full.txt.body")).toBe(true);
    expect(
      isLLMsFullBody("route-cache/APP_ROUTE/3f2a9c/$/llms-full.txt.body"),
    ).toBe(true);
    expect(isLLMsFullBody("app/llms.txt.body")).toBe(false);
    expect(
      isLLMsFullBody("route-cache/APP_PAGE/3f2a9c/$/llms-full.txt.body"),
    ).toBe(false);
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
      "```md",
      "[interactive preview omitted]",
      "```",
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

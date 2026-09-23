import { describe, expect, it } from "vitest";
import { parsePlan } from "./plan-sections";

const PLAN = `## What I found

- **App framework:** Next.js 15 (App Router, TypeScript)
- **Package manager:** pnpm
- **Agent framework**: Vercel AI SDK
- **Model provider:** OpenAI
- **Model:** gpt-4o
- **Components:** src/components

## What I will install

- **The chat:** @assistant-ui/react and @assistant-ui/react-markdown
- \`app/api/chat/route.ts\` streaming through the AI SDK
- \`app/assistant.tsx\` mounting the thread

## Steps

1. Install the packages.
   Peer packages come along.
2. Add the chat route.

3. Mount the thread on the home page.

Nothing changes until you approve.

## Open questions

- Should the thread list stay?`;

describe("parsePlan", () => {
  it("splits the four sections into facts, items and prose", () => {
    const plan = parsePlan(PLAN);
    expect(plan.found?.facts).toEqual([
      { label: "App framework", value: "Next.js 15 (App Router, TypeScript)" },
      { label: "Package manager", value: "pnpm" },
      { label: "Agent framework", value: "Vercel AI SDK" },
      { label: "Model provider", value: "OpenAI" },
      { label: "Model", value: "gpt-4o" },
      { label: "Components", value: "src/components" },
    ]);
    expect(plan.install?.facts).toEqual([
      {
        label: "The chat",
        value: "@assistant-ui/react and @assistant-ui/react-markdown",
      },
    ]);
    expect(plan.install?.items.map((item) => item.text)).toEqual([
      "`app/api/chat/route.ts` streaming through the AI SDK",
      "`app/assistant.tsx` mounting the thread",
    ]);
    expect(plan.steps?.items).toEqual([
      {
        text: "Install the packages.",
        markdown: "1. Install the packages.\n   Peer packages come along.",
      },
      { text: "Add the chat route.", markdown: "2. Add the chat route." },
      {
        text: "Mount the thread on the home page.",
        markdown: "3. Mount the thread on the home page.",
      },
    ]);
    expect(plan.steps?.rest).toBe("Nothing changes until you approve.");
    expect(plan.steps?.markdown).toContain("Peer packages come along.");
    expect(plan.questions?.items.map((item) => item.text)).toEqual([
      "Should the thread list stay?",
    ]);
    expect(plan.other).toBe("");
  });

  it("keeps a plan without the expected headings whole", () => {
    const markdown = "## Plan\n\n1. Install.\n2. Mount.\n\nSee the guide.";
    expect(parsePlan(markdown)).toEqual({ other: markdown });
    expect(parsePlan("Install the packages")).toEqual({
      other: "Install the packages",
    });
    expect(parsePlan("")).toEqual({ other: "" });
  });

  it("keeps the preamble, a repeated heading and headings inside code fences in the leftover", () => {
    const plan = parsePlan(
      "Hello.\n\n## Steps\n\n1. One\n\n```sh\n# not a heading\n```\n\n## Steps\n\n1. Again",
    );
    expect(plan.steps?.items.map((item) => item.text)).toEqual(["One"]);
    expect(plan.steps?.markdown).toContain("# not a heading");
    expect(plan.other).toBe("Hello.\n\n## Steps\n\n1. Again");
  });
});

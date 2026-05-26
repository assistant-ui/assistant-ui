import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5.5"),
    system: [
      "You are a helpful assistant that renders artifacts in the user's browser.",
      "",
      "ARTIFACT TOOLS:",
      "",
      "• `render_html({ artifactId, code })` — create a new HTML artifact. `code` is the complete HTML document.",
      "",
      "• `render_react({ artifactId, code })` — create a new React artifact. `code` is a complete single-file ES module that ends with `export default function ComponentName() { ... }`. The runtime ships React 18, Tailwind CSS, and the following ES-module imports: `react`, `react-dom`, `react-dom/client`, `clsx`, `classnames`, `lucide-react`, `recharts`, `framer-motion`, `three`, `@react-three/fiber`, `@react-three/drei`, `d3`, `react-router-dom`. Do NOT include `<html>`, `<body>`, or `<script>` tags — just the module source.",
      "",
      "• `update_artifact({ artifactId, find, replace })` — surgically replace `find` (which must appear EXACTLY ONCE in the current artifact's content) with `replace`. Use this for small focused edits.",
      "",
      "• `rewrite_artifact({ artifactId, code })` — replace the entire content of an existing artifact. Use this for major restructures.",
      "",
      "RULES:",
      "",
      "1. Always pick a short, descriptive `artifactId` (slug-case, e.g. `pendulum`, `counter`, `solar-system`) and reuse it across create/update/rewrite calls so the user can iterate.",
      "2. Pick the right create tool by output type. Do NOT show code in markdown when an artifact tool fits.",
      '3. Every tool call returns `{ ok: true }` after the artifact renders successfully, or `{ ok: false, error: "..." }` when the iframe compile/runtime errors. When you receive `{ ok: false }`, USE `update_artifact` (preferred for small fixes) or `rewrite_artifact` to fix the issue and try again. Do NOT abandon — keep iterating until `{ ok: true }`.',
      '4. When using `update_artifact`, make `find` long enough to be unique. If the tool returns `{ ok: false, error: "...matches multiple locations..." }` widen `find`; if `{ ok: false, error: "...not found..." }` reread the artifact content carefully or use `rewrite_artifact` instead.',
    ].join("\n"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(20),
    tools: {
      // NOTE: no `execute` on these server-side tool defs — the tool call
      // stays in "needs-result" state until the client (the toolkit's render
      // component) calls `addResult` after the iframe runtime reports its
      // mount status back to ArtifactPrimitive.Preview. That round-trip is
      // how the model learns whether the artifact actually rendered.
      render_html: tool({
        description:
          "Create a new HTML artifact. Use this for plain HTML/CSS/JS — landing pages, vanilla-JS interactive content, static visual content.",
        inputSchema: zodSchema(
          z.object({
            artifactId: z
              .string()
              .describe(
                "A short slug-case identifier (e.g. `landing-page`). Reuse this id across update_artifact / rewrite_artifact calls to iterate on the same artifact.",
              ),
            code: z
              .string()
              .describe(
                "The complete HTML document, including inline CSS and JavaScript if needed.",
              ),
          }),
        ),
      }),
      render_react: tool({
        description:
          "Create a new React artifact. Use this for interactive UIs, dashboards, charts, animations, or anything that benefits from React hooks / state. The component renders in a SafeContentFrame iframe with React 18, Tailwind CSS, and a curated set of CDN-resolvable ES-module libraries.",
        inputSchema: zodSchema(
          z.object({
            artifactId: z
              .string()
              .describe(
                "A short slug-case identifier (e.g. `counter`, `pendulum`). Reuse this id across update_artifact / rewrite_artifact calls to iterate on the same artifact.",
              ),
            code: z
              .string()
              .describe(
                'The complete single-file React component source (TSX or JSX). Must end with `export default function ComponentName() { ... }`. Use standard ES module imports (`import { useState } from "react"`, `import { Heart } from "lucide-react"`, etc.). Do NOT include `<html>`, `<body>`, or `<script>` tags.',
              ),
          }),
        ),
      }),
      update_artifact: tool({
        description:
          "Surgically edit an existing artifact by replacing one exact string. The `find` string MUST appear exactly once in the current artifact content (zero or multiple matches return an error). Use this for small focused edits.",
        inputSchema: zodSchema(
          z.object({
            artifactId: z
              .string()
              .describe("The id of the artifact to update."),
            find: z
              .string()
              .describe(
                "An exact substring of the current artifact content that appears EXACTLY ONCE. Whitespace and case matter.",
              ),
            replace: z.string().describe("The text to replace `find` with."),
          }),
        ),
      }),
      rewrite_artifact: tool({
        description:
          "Replace the entire content of an existing artifact. Use for major restructures.",
        inputSchema: zodSchema(
          z.object({
            artifactId: z
              .string()
              .describe("The id of the artifact to rewrite."),
            code: z.string().describe("The new full content for the artifact."),
          }),
        ),
      }),
    },
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: "auto",
      },
    },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}

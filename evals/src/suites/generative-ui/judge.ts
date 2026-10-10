import { generateText, jsonSchema, Output, type LanguageModel } from "ai";
import type { Answer, Format, Scores, Task } from "./types.ts";

const RENDERED_AS: Record<Format, string> = {
  text: "Markdown, rendered as rich text",
  present:
    "a tree of native components that the host app renders (`present` tool)",
  spec: "a flat spec of native components with state, bindings, and conditions that the host app renders (`render_spec` tool)",
  frame:
    "an HTML or SVG widget with optional JavaScript, rendered in a sandboxed frame (`show_widget` tool)",
};

const JUDGE_SYSTEM =
  "You grade answers an assistant gave in a chat app. Score what the user experiences once the answer renders, not how its source is written.";

const verdictSchema = jsonSchema<Scores & { reason: string }>({
  type: "object",
  properties: {
    clarity: { type: "integer", minimum: 1, maximum: 5 },
    usefulness: { type: "integer", minimum: 1, maximum: 5 },
    completeness: { type: "integer", minimum: 1, maximum: 5 },
    reason: { type: "string" },
  },
  required: ["clarity", "usefulness", "completeness", "reason"],
  additionalProperties: false,
});

/** Score one answer with a fresh judge that sees the request and the answer's source. */
export async function judgeAnswer(
  model: LanguageModel,
  task: Task,
  format: Format,
  answer: Answer,
): Promise<{ scores: Scores; reason: string }> {
  const failures = answer.errors.length
    ? [
        "These parts failed validation and do not render:",
        ...answer.errors.map((error) => `- ${error}`),
        "",
      ]
    : [];
  const { output } = await generateText({
    model,
    system: JUDGE_SYSTEM,
    output: Output.object({ schema: verdictSchema }),
    prompt: [
      "The user asked:",
      "<request>",
      task.prompt,
      "</request>",
      "",
      `The assistant answered with ${RENDERED_AS[format]}. You are reading the source of that answer.`,
      "",
      ...failures,
      "<answer>",
      answer.artifact,
      "</answer>",
      "",
      "Score each from 1 (poor) to 5 (excellent):",
      "- clarity: the user can scan and understand it, and its structure suits the content.",
      "- usefulness: it helps the user do what they asked, including any interaction the request calls for, such as changing an input and seeing the results update.",
      "- completeness: it covers everything the request asks for, and its content is correct.",
      "Explain the scores in one sentence as `reason`.",
    ].join("\n"),
  });
  const { reason, ...scores } = output;
  return { scores, reason };
}

import {
  defaultGenerativeUILibrary,
  JSONGenerativeUI,
  normalizeUINode,
  renderGenerativeUI,
  type GenerativeUILibrary,
  type NormalizedUINode,
} from "@assistant-ui/generative-ui/react";
import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import { jsonSchema, tool, type JSONSchema7, type ToolSet } from "ai";
import type { Spec } from "generative-frame/spec";
import { createSpecTools } from "generative-frame/spec/tools";
import {
  buildWidgetInstructions,
  createWidgetRegistry,
  createWidgetTools,
  toAISDKTools,
  type ToolDefinition,
} from "generative-frame/tools";
import { renderToStaticMarkup } from "react-dom/server";
import type { CandidateFormat, Format } from "./types.ts";

/** One call of an answer tool, the format it answers in, and the validation errors it returned. */
export interface Attempt {
  format: Format;
  artifact: string;
  errors: string[];
}

export interface FormatRun {
  system: string;
  tools: ToolSet | undefined;
  /** The tools that start an answer; every answer tool's `execute` validates the call and records an attempt. */
  answerTools: string[];
  /** An answer in prose that calls no answer tool is a text answer rather than an error. */
  prose: boolean;
  /** The format each tool that records an attempt answers in, to catch one step that answers in two and to name the format of a call that failed before it ran. */
  toolFormats: Readonly<Record<string, Format>>;
  attempts: Attempt[];
}

const INTRO = "You are the assistant in a chat app.";

/**
 * The vocabulary as the kit's generative UI element ships it
 * (`styledGenerativeUILibrary`), whose `Markdown` renders GitHub-flavored
 * markdown. Node cannot load that TSX file, so only the description the model
 * reads is carried over; the harness renders with the element itself.
 */
export const kitLibrary: GenerativeUILibrary = {
  ...defaultGenerativeUILibrary,
  Markdown: {
    ...defaultGenerativeUILibrary.Markdown!,
    description: "A markdown string, rendered with GitHub-flavored markdown.",
  },
};
const library = kitLibrary;
const present = new JSONGenerativeUI({ library }).present();

/** The components `present` offers, as the catalog a spec mode host builds with `toSpecCatalog`, so spec mode differs only in format. */
const { catalog } = toSpecCatalog(library);

const sdk = {
  jsonSchema: (schema: object) => jsonSchema(schema as JSONSchema7),
};

function recorded<Input, Output>(
  definition: ToolDefinition<Input, Output>,
  attempts: Attempt[],
  toAttempt: (input: Input, output: Output) => Attempt,
): ToolDefinition<Input, Output> {
  return {
    ...definition,
    async execute(input) {
      const output = await definition.execute(input);
      attempts.push(toAttempt(input, output));
      return output;
    },
  };
}

/** Why a `present` tree would not render as written, checked the way the renderer reads it. */
export function checkTree(input: unknown): string[] {
  const root = normalizeUINode(input);
  if (root === null) return ["The tree is malformed or nests too deeply."];
  const errors: string[] = [];
  let dropped = 0;
  const isList = (
    node: NormalizedUINode,
  ): node is readonly NormalizedUINode[] => Array.isArray(node);
  const visit = (node: NormalizedUINode): void => {
    if (isList(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node === null) {
      dropped++;
      return;
    }
    if (typeof node !== "object") return;
    const component = Object.hasOwn(library, node.type)
      ? library[node.type]
      : undefined;
    if (!component) {
      errors.push(`Unknown component "${node.type}".`);
    } else {
      const result = component.properties.safeParse(node.props);
      if (!result.success) {
        const issues = result.error.issues.map(
          (issue) =>
            `${issue.path.map(String).join(".") || "props"}: ${issue.message}`,
        );
        errors.push(`${node.type} has invalid props (${issues.join("; ")}).`);
      }
    }
    if (node.children !== undefined) visit(node.children);
  };
  visit(root);
  if (dropped > 0) {
    errors.push(
      `${dropped} node(s) are malformed or nest too deeply and render nothing.`,
    );
  }
  if (errors.length > 0) return errors;
  try {
    renderToStaticMarkup(renderGenerativeUI(input, library));
  } catch (error) {
    errors.push(
      `Rendering threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return errors;
}

function startPresent(): FormatRun {
  const attempts: Attempt[] = [];
  return {
    system: `${INTRO} Answer by calling \`present\` with a component tree; the user sees the rendered components.`,
    answerTools: ["present"],
    prose: false,
    toolFormats: { present: "present" },
    attempts,
    tools: {
      present: tool({
        description: present.description ?? "",
        inputSchema: jsonSchema(present.parameters as JSONSchema7),
        async execute(input) {
          const errors = checkTree(input);
          attempts.push({
            format: "present",
            artifact: JSON.stringify(input, null, 2),
            errors,
          });
          return errors.length ? { ok: false, errors } : { ok: true };
        },
      }),
    },
  };
}

function specTools(attempts: Attempt[]): ToolSet {
  const specs = new Map<string, { spec: Spec; version: number }>();
  const { render_spec } = createSpecTools(catalog, { specs });
  return toAISDKTools(
    {
      render_spec: recorded(render_spec, attempts, (input, output) => ({
        format: "spec",
        artifact: JSON.stringify(specs.get(input.title)?.spec ?? null, null, 2),
        errors: output.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => `${issue.path || "spec"}: ${issue.message}`),
      })),
    },
    sdk,
  );
}

function frameTools(attempts: Attempt[]) {
  const registry = createWidgetRegistry();
  const widgetTools = createWidgetTools({ registry });
  const toAttempt = (
    input: { title: string },
    output: { ok: true } | { ok: false; error: string },
  ): Attempt => ({
    format: "frame",
    artifact: registry.get(input.title)?.code ?? "",
    errors: output.ok ? [] : [output.error],
  });
  return {
    widgetTools,
    tools: toAISDKTools(
      {
        read_me: widgetTools.read_me,
        show_widget: recorded(widgetTools.show_widget, attempts, toAttempt),
        edit_widget: recorded(widgetTools.edit_widget, attempts, toAttempt),
      },
      sdk,
    ),
  };
}

/**
 * A draft of one instruction for choosing between text, a spec, and a widget,
 * which the `auto` candidate tests before anything ships it. `present` is left
 * out, since spec mode replaces it as the declarative format.
 */
const CHOOSING = `## Choosing how to answer

Use the lightest format that fully answers the request:

- Markdown, with no tool call, for explanations, advice, short answers, and anything read once. Most answers are text.
- \`render_spec\` for structured content the user scans or acts on, built from the app's components: comparisons, step-by-step guides, plans and itineraries, summaries of facts, and forms or choices. A spec can show values its \`$calc\` formulas compute from state, such as totals or quantities that follow a guest count; a tool whose point is the calculation, such as a calculator, is a widget.
- \`show_widget\` for interactive tools that calculate as the user changes inputs, such as calculators, simulations, and games, and for visuals the components cannot draw.

Do not render a paragraph or a short list. Around a rendered answer, keep prose to a sentence or two and do not repeat what it shows.

## Widgets

- Call \`read_me\` once, silently, before your first widget, with the modules you need.
- Change an existing widget with \`edit_widget\` (exact string replacements) instead of re-sending it.`;

/** The system prompt and tools for one answer in `format`, with a fresh attempt log. */
export async function startFormat(format: CandidateFormat): Promise<FormatRun> {
  const attempts: Attempt[] = [];
  switch (format) {
    case "text":
      return {
        system: `${INTRO} Answer in Markdown.`,
        tools: undefined,
        answerTools: [],
        prose: true,
        toolFormats: {},
        attempts,
      };
    case "present":
      return startPresent();
    case "spec":
      return {
        system: `${INTRO} Answer by calling \`render_spec\`; the user sees the rendered spec.\n\n${catalog.prompt()}`,
        tools: specTools(attempts),
        answerTools: ["render_spec"],
        prose: false,
        toolFormats: { render_spec: "spec" },
        attempts,
      };
    case "frame": {
      const { widgetTools, tools } = frameTools(attempts);
      return {
        system: `${INTRO} Answer with a widget; the user sees it rendered.\n\n${await buildWidgetInstructions(widgetTools)}`,
        tools,
        answerTools: ["show_widget"],
        prose: false,
        toolFormats: { show_widget: "frame", edit_widget: "frame" },
        attempts,
      };
    }
    case "auto":
      return {
        system: `${INTRO} Answer in Markdown, or with interface the app renders when that serves the user better.\n\n${CHOOSING}\n\nThe declarative UI section below describes what goes inside a \`render_spec\` call; its output rules apply to those patches, not to your answer.\n\n${catalog.prompt()}`,
        tools: { ...specTools(attempts), ...frameTools(attempts).tools },
        answerTools: ["render_spec", "show_widget"],
        prose: true,
        toolFormats: {
          render_spec: "spec",
          show_widget: "frame",
          edit_widget: "frame",
        },
        attempts,
      };
  }
}

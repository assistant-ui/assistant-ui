import {
  defaultGenerativeUILibrary,
  hasFieldReference,
  JSONGenerativeUI,
  normalizeUINode,
  renderGenerativeUI,
  type NormalizedUINode,
} from "@assistant-ui/generative-ui/react";
import { jsonSchema, tool, type JSONSchema7, type ToolSet } from "ai";
import {
  defineCatalog,
  type JsonSchema,
  type Spec,
} from "generative-frame/spec";
import { createSpecTools } from "generative-frame/spec/tools";
import {
  buildWidgetInstructions,
  createWidgetRegistry,
  createWidgetTools,
  toAISDKTools,
  type ToolDefinition,
} from "generative-frame/tools";
import { renderToStaticMarkup } from "react-dom/server";
import type { Format } from "./types.ts";

/** One call of a format's answer tool and the validation errors it returned. */
export interface Attempt {
  artifact: string;
  errors: string[];
}

export interface FormatRun {
  system: string;
  /** Answer tools; their `execute` validates the call and records an attempt. */
  tools: ToolSet | undefined;
  toolName: string | undefined;
  attempts: Attempt[];
}

const INTRO = "You are the assistant in a chat app.";

const library = defaultGenerativeUILibrary;
const present = new JSONGenerativeUI({ library }).present();

/**
 * The components `present` offers, so spec mode differs only in format. Every
 * component takes children and fires `press` and `change`, matching `present`,
 * where any node may carry children and an `$action`. Props are the JSON Schema
 * `present` builds from the same zod schemas: generative-frame skips a whole
 * Standard Schema when any prop holds an expression, but skips only the
 * expression in a JSON Schema.
 */
const catalog = defineCatalog({
  components: Object.fromEntries(
    Object.entries(library).map(([name, component]) => [
      name,
      {
        description: component.description,
        props: component.properties["~standard"].jsonSchema.input({
          target: "draft-07",
        }) as JsonSchema,
        slots: ["default"],
        events: ["press", "change"],
      },
    ]),
  ),
});

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
  const isList = (
    node: NormalizedUINode,
  ): node is readonly NormalizedUINode[] => Array.isArray(node);
  const visit = (node: NormalizedUINode): void => {
    if (isList(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const component = Object.hasOwn(library, node.type)
      ? library[node.type]
      : undefined;
    if (!component) {
      errors.push(`Unknown component "${node.type}".`);
    } else if (!hasFieldReference(node.props)) {
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
    toolName: "present",
    attempts,
    tools: {
      present: tool({
        description: present.description ?? "",
        inputSchema: jsonSchema(present.parameters as JSONSchema7),
        async execute(input) {
          const errors = checkTree(input);
          attempts.push({ artifact: JSON.stringify(input, null, 2), errors });
          return errors.length ? { ok: false, errors } : { ok: true };
        },
      }),
    },
  };
}

function startSpec(): FormatRun {
  const specs = new Map<string, { spec: Spec; version: number }>();
  const attempts: Attempt[] = [];
  const { render_spec } = createSpecTools(catalog, { specs });
  return {
    system: `${INTRO} Answer by calling \`render_spec\`; the user sees the rendered spec.\n\n${catalog.prompt()}`,
    toolName: "render_spec",
    attempts,
    tools: toAISDKTools(
      {
        render_spec: recorded(render_spec, attempts, (input, output) => ({
          artifact: JSON.stringify(
            specs.get(input.title)?.spec ?? null,
            null,
            2,
          ),
          errors: output.issues
            .filter((issue) => issue.severity === "error")
            .map((issue) => `${issue.path || "spec"}: ${issue.message}`),
        })),
      },
      sdk,
    ),
  };
}

async function startFrame(): Promise<FormatRun> {
  const registry = createWidgetRegistry();
  const attempts: Attempt[] = [];
  const widgetTools = createWidgetTools({ registry });
  const toAttempt = (
    input: { title: string },
    output: { ok: true } | { ok: false; error: string },
  ): Attempt => ({
    artifact: registry.get(input.title)?.code ?? "",
    errors: output.ok ? [] : [output.error],
  });
  return {
    system: `${INTRO} Answer with a widget; the user sees it rendered.\n\n${await buildWidgetInstructions(widgetTools)}`,
    toolName: "show_widget",
    attempts,
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

/** The system prompt and tools for one answer in `format`, with a fresh attempt log. */
export async function startFormat(format: Format): Promise<FormatRun> {
  switch (format) {
    case "text":
      return {
        system: `${INTRO} Answer in Markdown.`,
        tools: undefined,
        toolName: undefined,
        attempts: [],
      };
    case "present":
      return startPresent();
    case "spec":
      return startSpec();
    case "frame":
      return startFrame();
  }
}

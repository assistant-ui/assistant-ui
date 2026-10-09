import type { JsonSchema } from "../json-schema";
import type { PreviewResult } from "../preview";
import {
  buildWidgetGuidance,
  MODULE_SUMMARIES,
  normalizeModules,
  WIDGET_MODULES,
  type GuidanceOptions,
  type Platform,
  type WidgetModule,
} from "../prompts/guidance";
import {
  detectWidgetKind,
  type ColorScheme,
  type WidgetKind,
} from "../protocol";
import type { Catalog } from "../spec/catalog";
import type { SpecPromptOptions } from "../spec/prompt";
import { parseSpecStream } from "../spec/stream";
import { emptySpec, type Spec } from "../spec/types";
import {
  formatSpecIssues,
  validateSpec,
  type SpecIssue,
} from "../spec/validate";
import { applyWidgetEdits, type WidgetEdit } from "./edits";
import { createWidgetRegistry, type WidgetRegistry } from "./registry";

export type { JsonSchema };

export type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Promise<Output>;
};

/** `spec` is available when the tools were created with a catalog. */
export type ReadMeModule = WidgetModule | "spec";

export type ReadMeInput = { modules?: ReadMeModule[]; platform?: Platform };

export type ShowWidgetInput = {
  title: string;
  loading_messages?: string[];
  widget_code: string;
};

export type ShowWidgetResult =
  | { ok: true; title: string; kind: WidgetKind; version: number }
  | { ok: false; title: string; error: string };

export type EditWidgetInput = { title: string; edits: WidgetEdit[] };

export type EditWidgetResult =
  | { ok: true; title: string; version: number; applied: number }
  | { ok: false; title: string; error: string };

export type PreviewWidgetInput = {
  widget_code: string;
  width?: number;
  appearance?: ColorScheme;
};

export type WidgetTools = {
  read_me: ToolDefinition<ReadMeInput, string>;
  show_widget: ToolDefinition<ShowWidgetInput, ShowWidgetResult>;
  edit_widget: ToolDefinition<EditWidgetInput, EditWidgetResult>;
  preview_widget: ToolDefinition<PreviewWidgetInput, PreviewResult>;
};

export type RenderSpecInput = {
  title: string;
  /** JSONL patch operations, one per line. Applied onto the title's previous spec if there is one. */
  patches?: string;
  /** A complete spec, replacing the title's previous one. */
  spec?: Spec;
};

export type RenderSpecResult = {
  ok: boolean;
  title: string;
  version: number;
  elementCount: number;
  issues: SpecIssue[];
  /** The issues as model-readable text for a repair round. */
  feedback: string;
};

export type SpecTools = {
  render_spec: ToolDefinition<RenderSpecInput, RenderSpecResult>;
};

export type CreateWidgetToolsOptions = {
  registry?: WidgetRegistry;
  /** Guidance options other than modules and platform, which the model picks. */
  guidance?: Omit<GuidanceOptions, "modules" | "platform">;
  /** Renders code offscreen for `preview_widget`, typically `previewWidget` from the core entry. */
  preview?: (
    code: string,
    options: { width?: number; appearance?: ColorScheme },
  ) => Promise<PreviewResult>;
  /** Enables `render_spec` and the `spec` module of `read_me`. */
  catalog?: Catalog;
  /** Options for the catalog guidance `read_me` returns for the `spec` module. */
  specPrompt?: Omit<SpecPromptOptions, "mode">;
  /** Latest spec per title, shared with the host so it can render them. */
  specs?: Map<string, { spec: Spec; version: number }>;
};

const TITLE_SCHEMA: JsonSchema = {
  type: "string",
  description:
    "Short snake_case identifier for the widget, unique in this conversation (e.g. `q3_revenue_by_region`). Reuse it to replace or edit the widget.",
};

const SPEC_MODULE_SUMMARY =
  "declarative UI built from the host's own components, rendered with render_spec";

/**
 * Model-facing tools for widgets, independent of any provider SDK: each has
 * a name, a description, a JSON Schema for its input, and `execute`. With a
 * `catalog`, `render_spec` is added and `read_me` offers the `spec` module.
 */
export function createWidgetTools(
  options: CreateWidgetToolsOptions & { catalog: Catalog },
): WidgetTools & SpecTools;
export function createWidgetTools(
  options?: CreateWidgetToolsOptions,
): WidgetTools;
export function createWidgetTools(
  options: CreateWidgetToolsOptions = {},
): WidgetTools & Partial<SpecTools> {
  const registry = options.registry ?? createWidgetRegistry();
  const catalog = options.catalog;
  const specs =
    options.specs ?? new Map<string, { spec: Spec; version: number }>();
  const moduleNames: readonly string[] = catalog
    ? [...WIDGET_MODULES, "spec"]
    : WIDGET_MODULES;
  const moduleDocs = [
    ...WIDGET_MODULES.map((m) => `${m} (${MODULE_SUMMARIES[m]})`),
    ...(catalog ? [`spec (${SPEC_MODULE_SUMMARY})`] : []),
  ];

  const tools: WidgetTools & Partial<SpecTools> = {
    read_me: {
      name: "read_me",
      description:
        "Returns the rules for writing widgets plus guidance for the requested modules. Call it silently before your first widget, and again when you need a module you have not loaded. Do not mention this call to the user.",
      inputSchema: {
        type: "object",
        properties: {
          modules: {
            type: "array",
            description: `Modules to load: ${moduleDocs.join("; ")}.`,
            items: { type: "string", enum: moduleNames },
          },
          platform: {
            type: "string",
            enum: ["desktop", "mobile"],
            description: "The user's client. Defaults to desktop.",
          },
        },
        additionalProperties: false,
      },
      async execute(input) {
        const requested: readonly string[] = input.modules ?? [];
        const spec =
          catalog && requested.includes("spec")
            ? catalog.prompt({ ...options.specPrompt, mode: "jsonl" })
            : undefined;
        const modules = normalizeModules(requested);
        if (spec && modules.length === 0) return spec;
        const guidance = buildWidgetGuidance({
          ...options.guidance,
          modules,
          platform: input.platform === "mobile" ? "mobile" : "desktop",
        });
        return spec ? `${guidance}\n\n${spec}` : guidance;
      },
    },

    show_widget: {
      name: "show_widget",
      description:
        "Shows a visual widget (HTML fragment or SVG) inline in the conversation, streaming it as you write. Write a short <style> first, then markup, then scripts. Call read_me first. Showing a title that already exists replaces that widget.",
      inputSchema: {
        type: "object",
        properties: {
          title: TITLE_SCHEMA,
          loading_messages: {
            type: "array",
            description:
              "One to four short status lines shown while the widget streams.",
            items: { type: "string" },
            maxItems: 4,
          },
          widget_code: {
            type: "string",
            description:
              "The widget: an HTML fragment (no doctype, html, head, or body), or code starting with <svg for a standalone SVG.",
          },
        },
        required: ["title", "widget_code"],
        additionalProperties: false,
      },
      async execute(input) {
        if (!input.widget_code?.trim()) {
          return {
            ok: false,
            title: input.title,
            error: "widget_code is empty",
          };
        }
        const record = registry.set(input.title, input.widget_code);
        return {
          ok: true,
          title: input.title,
          kind: detectWidgetKind(input.widget_code),
          version: record.version,
        };
      },
    },

    edit_widget: {
      name: "edit_widget",
      description:
        "Changes a widget you already showed with exact string replacements, applied in order to its latest code. Each old_string must match exactly one place; include surrounding text to make it unique. No edit is applied if any one fails.",
      inputSchema: {
        type: "object",
        properties: {
          title: TITLE_SCHEMA,
          edits: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                old_string: {
                  type: "string",
                  description:
                    "Exact text to find, copied from the widget's latest code.",
                },
                new_string: {
                  type: "string",
                  description: "Replacement text.",
                },
              },
              required: ["old_string", "new_string"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "edits"],
        additionalProperties: false,
      },
      async execute(input) {
        const record = registry.get(input.title);
        if (!record) {
          const known = registry.list().map((r) => r.title);
          return {
            ok: false,
            title: input.title,
            error: `No widget titled "${input.title}".${
              known.length > 0 ? ` Known widgets: ${known.join(", ")}.` : ""
            } Use show_widget to create it.`,
          };
        }
        const result = applyWidgetEdits(record.code, input.edits ?? []);
        if (!result.ok)
          return { ok: false, title: input.title, error: result.error };
        const updated = registry.set(input.title, result.code);
        return {
          ok: true,
          title: input.title,
          version: updated.version,
          applied: input.edits.length,
        };
      },
    },

    preview_widget: {
      name: "preview_widget",
      description:
        "Renders widget code offscreen without showing it and reports errors, console output, the rendered height, whether it came out blank, and a screenshot. Use it to check complex widgets before showing them.",
      inputSchema: {
        type: "object",
        properties: {
          widget_code: { type: "string", description: "Complete widget code." },
          width: {
            type: "number",
            description: "Layout width in CSS pixels. Defaults to 680.",
            minimum: 240,
            maximum: 1600,
          },
          appearance: {
            type: "string",
            enum: ["light", "dark"],
            description: "Color scheme to render in. Defaults to light.",
          },
        },
        required: ["widget_code"],
        additionalProperties: false,
      },
      async execute(input) {
        if (!options.preview) {
          return {
            ok: false,
            kind: detectWidgetKind(input.widget_code),
            width: 0,
            height: 0,
            blank: true,
            errors: [
              {
                kind: "error",
                message: "Previews are not available in this environment.",
              },
            ],
            console: [],
          };
        }
        return options.preview(input.widget_code, {
          ...(input.width !== undefined ? { width: input.width } : {}),
          ...(input.appearance !== undefined
            ? { appearance: input.appearance }
            : {}),
        });
      },
    },
  };

  if (catalog) {
    tools.render_spec = {
      name: "render_spec",
      description:
        "Shows declarative UI built from the host's components, streaming it as you write. Call read_me with the spec module first. Pass `patches` (JSONL patch operations, one per line) or a complete `spec`. Patches on a title you already rendered apply to that spec, so fix or update it with small patches. The result lists validation issues to fix.",
      inputSchema: {
        type: "object",
        properties: {
          title: TITLE_SCHEMA,
          patches: {
            type: "string",
            description:
              "RFC 6902 JSON Patch operations as JSONL: one operation object per line, root first, then elements parent before child.",
          },
          spec: {
            type: "object",
            description:
              "A complete spec { root, elements, state }. Prefer patches, which stream.",
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
      async execute(input) {
        const previous = specs.get(input.title);
        const issues: SpecIssue[] = [];
        let spec: Spec;
        if (input.spec && typeof input.spec === "object") {
          spec = { state: {}, ...input.spec };
        } else if (typeof input.patches === "string" && input.patches.trim()) {
          const parsed = parseSpecStream(input.patches, {
            initial: previous?.spec ?? emptySpec(),
          });
          spec = parsed.spec;
          for (const error of parsed.errors) {
            issues.push({
              code: "invalid-patch",
              severity: "error",
              path: "",
              message: `Patch line ${error.line} was skipped: ${error.message}. Line: ${error.text}`,
            });
          }
        } else {
          spec = previous?.spec ?? emptySpec();
          issues.push({
            code: "invalid-patch",
            severity: "error",
            path: "",
            message: "Pass `patches` or `spec`.",
          });
        }
        issues.push(...validateSpec(spec, catalog).issues);
        const version = (previous?.version ?? 0) + 1;
        specs.set(input.title, { spec, version });
        return {
          ok: !issues.some((issue) => issue.severity === "error"),
          title: input.title,
          version,
          elementCount: Object.keys(spec.elements ?? {}).length,
          issues,
          feedback: formatSpecIssues(issues),
        };
      },
    };
  }
  return tools;
}

type AnyTool = ToolDefinition<never, unknown>;

/**
 * Converts tools to the Vercel AI SDK shape without depending on it: pass
 * the SDK's own `jsonSchema` helper, e.g.
 * `toAISDKTools(tools, { jsonSchema })` with `import { jsonSchema } from "ai"`.
 */
export function toAISDKTools<T extends Record<string, AnyTool>, Schema>(
  tools: T,
  sdk: { jsonSchema: (schema: JsonSchema) => Schema },
): {
  [K in keyof T]: {
    description: string;
    inputSchema: Schema;
    execute: T[K]["execute"];
  };
} {
  const result: Record<string, unknown> = {};
  for (const [key, tool] of Object.entries(tools)) {
    result[key] = {
      description: tool.description,
      inputSchema: sdk.jsonSchema(tool.inputSchema),
      execute: (input: never) => tool.execute(input),
    };
  }
  return result as never;
}

/**
 * Each tool's name, description, and input schema without `execute`, for
 * declaring tools to a model where they do not run, e.g. on a server that
 * forwards calls to tools executing in the browser.
 */
export function getToolDeclarations<T extends Record<string, AnyTool>>(
  tools: T,
): { [K in keyof T]: { description: string; inputSchema: JsonSchema } } {
  const result: Record<string, unknown> = {};
  for (const [key, tool] of Object.entries(tools)) {
    result[key] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }
  return result as never;
}

export type WidgetInstructionsOptions = {
  /**
   * Inline `read_me` output for these modules into the instructions, which
   * saves the model a round trip at the cost of a larger system prompt.
   */
  preload?: ReadMeInput;
};

/**
 * A short system prompt section telling the model when and how to use the
 * widget tools, optionally with `read_me` guidance preloaded.
 */
export async function buildWidgetInstructions(
  tools: WidgetTools & Partial<SpecTools>,
  options: WidgetInstructionsOptions = {},
): Promise<string> {
  const lines = [
    "## Visual widgets",
    "",
    "When a visual would explain better than text (charts, diagrams, comparisons, small interactive tools, forms), show it with `show_widget` instead of describing it. Keep surrounding prose short and do not repeat what the widget shows.",
    "- Call `read_me` once, silently, before your first widget, with the modules you need.",
    "- Change an existing widget with `edit_widget` (exact string replacements) instead of re-sending it.",
    ...(tools.render_spec
      ? [
          "- For UI that should use the app's own components (cards, tables, forms bound to actions), use `render_spec` after loading the `spec` module.",
        ]
      : []),
  ];
  if (options.preload) {
    lines.push("", await tools.read_me.execute(options.preload));
  }
  return lines.join("\n");
}

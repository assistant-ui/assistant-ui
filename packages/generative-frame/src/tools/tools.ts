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
import type {
  AnyTool,
  GuidanceModule,
  JsonSchema,
  ToolDefinition,
} from "./define";
import { applyWidgetEdits, type WidgetEdit } from "./edits";
import { createWidgetRegistry, type WidgetRegistry } from "./registry";

/** A built-in module, or the name of a module passed in `modules`. */
export type ReadMeModule = WidgetModule | (string & {});

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

export type CreateWidgetToolsOptions = {
  registry?: WidgetRegistry;
  /** Guidance options other than modules and platform, which the model picks. */
  guidance?: Omit<GuidanceOptions, "modules" | "platform">;
  /** Renders code offscreen for `preview_widget`, typically `previewWidget` from the core entry. */
  preview?: (
    code: string,
    options: { width?: number; appearance?: ColorScheme },
  ) => Promise<PreviewResult>;
  /** Extra `read_me` modules, such as `specGuidanceModule(catalog)` from `generative-frame/spec/tools`. */
  modules?: readonly GuidanceModule[];
};

const TITLE_SCHEMA: JsonSchema = {
  type: "string",
  description:
    "Short snake_case identifier for the widget, unique in this conversation (e.g. `q3_revenue_by_region`). Reuse it to replace or edit the widget.",
};

/**
 * Model-facing tools for widgets, independent of any provider SDK: each has
 * a name, a description, a JSON Schema for its input, and `execute`.
 * `extraTools` are added as they are (for example `createSpecTools(catalog)`
 * from `generative-frame/spec/tools`), and `modules` extend `read_me`.
 */
export function createWidgetTools<
  Extra extends Record<string, AnyTool> = Record<never, never>,
>(
  options: CreateWidgetToolsOptions & { extraTools?: Extra } = {},
): WidgetTools & Extra {
  const registry = options.registry ?? createWidgetRegistry();
  const extraModules = options.modules ?? [];
  const moduleNames: readonly string[] = [
    ...WIDGET_MODULES,
    ...extraModules.map((m) => m.name),
  ];
  const moduleDocs = [
    ...WIDGET_MODULES.map((m) => `${m} (${MODULE_SUMMARIES[m]})`),
    ...extraModules.map((m) => `${m.name} (${m.summary})`),
  ];

  const tools: WidgetTools = {
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
        const extra = extraModules
          .filter((m) => requested.includes(m.name))
          .map((m) => m.guidance())
          .join("\n\n");
        const modules = normalizeModules(requested);
        if (extra && modules.length === 0) return extra;
        const guidance = buildWidgetGuidance({
          ...options.guidance,
          modules,
          platform: input.platform === "mobile" ? "mobile" : "desktop",
        });
        return extra ? `${guidance}\n\n${extra}` : guidance;
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

  return { ...tools, ...options.extraTools } as WidgetTools & Extra;
}

export type WidgetInstructionsOptions = {
  /**
   * Inline `read_me` output for these modules into the instructions, which
   * saves the model a round trip at the cost of a larger system prompt.
   */
  preload?: ReadMeInput;
};

/** Whether `read_me` lists a module, which is how composed modules become visible. */
const readMeOffers = (tools: WidgetTools, module: string) =>
  (
    tools.read_me.inputSchema.properties?.["modules"]?.items?.enum ?? []
  ).includes(module);

const WIDGET_TOOL_RULES = [
  "- Call `read_me` once, silently, before your first widget, with the modules you need.",
  "- Change an existing widget with `edit_widget` (exact string replacements) instead of re-sending it.",
];

/**
 * A short system prompt section telling the model when and how to use the
 * widget tools, optionally with `read_me` guidance preloaded. With
 * `render_spec` among the tools, it also tells the model when to answer in
 * Markdown, with a spec, or with a widget.
 */
export async function buildWidgetInstructions(
  tools: WidgetTools & Record<string, AnyTool>,
  options: WidgetInstructionsOptions = {},
): Promise<string> {
  const lines =
    "render_spec" in tools
      ? [
          "## Choosing how to answer",
          "",
          "Use the lightest format that fully answers the request:",
          "",
          "- Markdown, with no tool call, for explanations, advice, short answers, and anything read once. Most answers are text.",
          "- `render_spec` for structured content the user scans or acts on, built from the app's components: comparisons, step-by-step guides, plans and itineraries, summaries of facts, and forms or choices. A spec can show values its `$calc` formulas compute from state, such as totals or quantities that follow a guest count; a tool whose point is the calculation, such as a calculator, is a widget.",
          "- `show_widget` for interactive tools that calculate as the user changes inputs, such as calculators, simulations, and games, and for visuals the components cannot draw.",
          "",
          "Do not render a paragraph or a short list. Around a rendered answer, keep prose to a sentence or two and do not repeat what it shows.",
          "",
          "The Declarative UI guidance describes what goes inside a `render_spec` call; its output rules apply to those patches, not to your answer.",
          "",
          "## Widgets",
          "",
          ...WIDGET_TOOL_RULES,
          ...(readMeOffers(tools, "spec") &&
          !options.preload?.modules?.includes("spec")
            ? [
                "- Load the `spec` module with `read_me` before your first `render_spec` call.",
              ]
            : []),
        ]
      : [
          "## Visual widgets",
          "",
          "When a visual would explain better than text (charts, diagrams, comparisons, small interactive tools, forms), show it with `show_widget` instead of describing it. Keep surrounding prose short and do not repeat what the widget shows.",
          ...WIDGET_TOOL_RULES,
        ];
  if (options.preload) {
    lines.push("", await tools.read_me.execute(options.preload));
  }
  return lines.join("\n");
}

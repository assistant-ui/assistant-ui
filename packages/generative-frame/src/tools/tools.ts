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
import { applyWidgetEdits, type WidgetEdit } from "./edits";
import { createWidgetRegistry, type WidgetRegistry } from "./registry";

export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: readonly string[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean;
};

export type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Promise<Output>;
};

export type ReadMeInput = { modules?: WidgetModule[]; platform?: Platform };

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
};

const TITLE_SCHEMA: JsonSchema = {
  type: "string",
  description:
    "Short snake_case identifier for the widget, unique in this conversation (e.g. `q3_revenue_by_region`). Reuse it to replace or edit the widget.",
};

/**
 * Model-facing tools for widgets, independent of any provider SDK: each has
 * a name, a description, a JSON Schema for its input, and `execute`.
 */
export function createWidgetTools(
  options: CreateWidgetToolsOptions = {},
): WidgetTools {
  const registry = options.registry ?? createWidgetRegistry();

  return {
    read_me: {
      name: "read_me",
      description:
        "Returns the rules for writing widgets plus guidance for the requested modules. Call it silently before your first widget, and again when you need a module you have not loaded. Do not mention this call to the user.",
      inputSchema: {
        type: "object",
        properties: {
          modules: {
            type: "array",
            description: `Modules to load: ${WIDGET_MODULES.map((m) => `${m} (${MODULE_SUMMARIES[m]})`).join("; ")}.`,
            items: { type: "string", enum: WIDGET_MODULES },
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
        return buildWidgetGuidance({
          ...options.guidance,
          modules: normalizeModules(input.modules ?? []),
          platform: input.platform === "mobile" ? "mobile" : "desktop",
        });
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

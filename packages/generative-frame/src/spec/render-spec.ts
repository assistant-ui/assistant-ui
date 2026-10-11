import type { GuidanceModule, ToolDefinition } from "../tools/define";
import type { Catalog } from "./catalog";
import type { SpecPromptOptions } from "./prompt";
import { parseSpecStream } from "./stream";
import { emptySpec, type Spec } from "./types";
import { formatSpecIssues, validateSpec, type SpecIssue } from "./validate";

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

export type RenderSpecTool = ToolDefinition<RenderSpecInput, RenderSpecResult>;

export type SpecTools = { render_spec: RenderSpecTool };

export type CreateSpecToolsOptions = {
  /** Latest spec per title, shared with the host so it can render them. */
  specs?: Map<string, { spec: Spec; version: number }>;
};

const TITLE_SCHEMA = {
  type: "string",
  description:
    "Short snake_case identifier for the UI, unique in this conversation (e.g. `q3_revenue_by_region`). Reuse it to replace or patch the UI.",
} as const;

/**
 * The `render_spec` tool for a catalog: validates the spec the model streams
 * as JSONL patches (or a complete spec) and returns the issues to fix.
 * Combine it with the widget tools through `createWidgetTools({ extraTools })`.
 */
export function createSpecTools(
  catalog: Catalog,
  options: CreateSpecToolsOptions = {},
): SpecTools {
  const specs =
    options.specs ?? new Map<string, { spec: Spec; version: number }>();
  const render_spec: RenderSpecTool = {
    name: "render_spec",
    description:
      "Shows declarative UI built from the host's components, streaming it as you write. Follow the spec guidance you were given (the `spec` module of read_me, or the system prompt). Pass `patches` (JSONL patch operations, one per line) or a complete `spec`. Patches on a title you already rendered apply to that spec, so fix or update it with small patches. The result lists validation issues to fix.",
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
  return { render_spec };
}

/** The `spec` module for `read_me` (`createWidgetTools({ modules })`), documenting a catalog. */
export function specGuidanceModule(
  catalog: Catalog,
  options: Omit<SpecPromptOptions, "mode"> = {},
): GuidanceModule {
  return {
    name: "spec",
    summary:
      "declarative UI built from the host's own components, rendered with render_spec",
    guidance: () => catalog.prompt({ ...options, mode: "jsonl" }),
  };
}

import type { GuidanceModule, ToolDefinition } from "../tools/define";
import type { Catalog } from "./catalog";
import { specRules, type SpecPromptOptions } from "./prompt";
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
  /** The app's rules for a spec, added to the tool's description after the built-in ones so they hold even when the model never loads the spec guidance. */
  customRules?: readonly string[];
};

/**
 * The rule that tells a model where the assistant-ui spec toolkit mounts the
 * results of earlier tool calls. In backend execution, add it to the server's
 * `customRules` for both `createSpecTools` and `specGuidanceModule`, and pass
 * `toolResults: true` to `createSpecToolkit`.
 */
export const SPEC_TOOL_RESULTS_RULE =
  'Results of earlier tool calls are in state under `/tools/<toolName>/<n>`, newest first: `0` is the latest call to that tool before this `render_spec` call, `1` the one before it, and so on. Show their values with `{ "$state": "/tools/<toolName>/<n>/..." }` rather than copying them, and never write `tools` in `state`. Indexes count back from each `render_spec` call, so when a patch follows another call to the same tool, update any binding that should keep showing the older result.';

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
    description: [
      "Shows declarative UI built from the host's components, streaming it as you write. Follow the spec guidance in the system prompt; only when it has none, load the `spec` module with read_me, if read_me offers one. Pass `patches` (JSONL patch operations, one per line) or a complete `spec`. Patches on a title you already rendered apply to that spec, so fix or update it with small patches. The result lists validation issues to fix.",
      "",
      "Every spec follows these rules:",
      ...specRules(catalog, options.customRules).map((rule) => `- ${rule}`),
    ].join("\n"),
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

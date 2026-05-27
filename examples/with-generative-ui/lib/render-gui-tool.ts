import { z } from "zod";
import { stripMarkdownJsonFence } from "./strip-markdown-fence";

export const RENDER_GUI_TOOL_NAME = "render_gui" as const;

/** Legacy JSON spec shape — bridge only until Phase 3b. */
export type GenerativeUINode =
  | string
  | {
      readonly component: string;
      readonly props?: Record<string, unknown>;
      readonly children?: readonly GenerativeUINode[];
      readonly key?: string;
    };

export type GenerativeUISpec = {
  readonly root: GenerativeUINode | readonly GenerativeUINode[];
};

const generativeUINodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.object({
      component: z.string().min(1),
      props: z.record(z.string(), z.unknown()).optional(),
      children: z.array(generativeUINodeSchema).optional(),
      key: z.string().optional(),
    }),
  ]),
);

export const generativeUISpecSchema = z.object({
  root: z.union([
    generativeUINodeSchema,
    z.array(generativeUINodeSchema).min(1),
  ]),
});

export const renderGuiToolInputSchema = z.object({
  spec: generativeUISpecSchema,
});

export const renderGuiToolResultSchema = renderGuiToolInputSchema;

export const parseRenderGuiResult = (
  result: unknown,
): GenerativeUISpec | undefined => {
  const parsed = renderGuiToolResultSchema.safeParse(result);
  return parsed.success ? (parsed.data.spec as GenerativeUISpec) : undefined;
};

export const renderGuiToolDescription =
  "Compose inline UI from the allowlisted component library (Card, Text, Button, Stack, Stat, Heading). " +
  "Pass a JSON spec with a root node tree. Use for dashboards, status panels, and structured layouts — not for user input forms (use interactive tool UI instead).";

/** Text echo of a render_gui tool result/spec — hide when the bridge already rendered it. */
export const isLeakedRenderGuiText = (text: string): boolean => {
  const candidate = stripMarkdownJsonFence(text);
  if (!candidate.startsWith("{")) return false;

  try {
    const parsed = JSON.parse(candidate);
    if (renderGuiToolResultSchema.safeParse(parsed).success) return true;
    if (generativeUISpecSchema.safeParse(parsed).success) return true;
  } catch {
    return false;
  }

  return false;
};

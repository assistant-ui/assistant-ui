import { z } from "zod";
import { ToolUIIdSchema } from "./shared";

const alignEnum = z.enum(["left", "right", "center"]);
const priorityEnum = z.enum(["primary", "secondary", "tertiary"]);
const layoutEnum = z.enum(["auto", "table", "cards"]);

const formatSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text") }),
  z.object({
    kind: z.literal("number"),
    decimals: z.number().optional(),
    unit: z.string().optional(),
    compact: z.boolean().optional(),
    showSign: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("currency"),
    currency: z.string(),
    decimals: z.number().optional(),
  }),
  z.object({
    kind: z.literal("percent"),
    decimals: z.number().optional(),
    showSign: z.boolean().optional(),
    basis: z.enum(["fraction", "unit"]).optional(),
  }),
  z.object({
    kind: z.literal("date"),
    dateFormat: z.enum(["short", "long", "relative"]).optional(),
  }),
  z.object({
    kind: z.literal("delta"),
    decimals: z.number().optional(),
    upIsPositive: z.boolean().optional(),
    showSign: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("status"),
    statusMap: z.record(
      z.string(),
      z.object({
        tone: z.enum(["success", "warning", "danger", "info", "neutral"]),
        label: z.string().optional(),
      }),
    ),
  }),
  z.object({
    kind: z.literal("boolean"),
    labels: z
      .object({
        true: z.string(),
        false: z.string(),
      })
      .optional(),
  }),
  z.object({
    kind: z.literal("link"),
    hrefKey: z.string().optional(),
    external: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("badge"),
    colorMap: z
      .record(
        z.string(),
        z.enum(["success", "warning", "danger", "info", "neutral"]),
      )
      .optional(),
  }),
  z.object({
    kind: z.literal("array"),
    maxVisible: z.number().optional(),
  }),
]);

export const serializableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  abbr: z.string().optional(),
  sortable: z.boolean().optional(),
  align: alignEnum.optional(),
  width: z.string().optional(),
  truncate: z.boolean().optional(),
  priority: priorityEnum.optional(),
  hideOnMobile: z.boolean().optional(),
  format: formatSchema.optional(),
});

const jsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Schema for serializable row data.
 *
 * Supports:
 * - Primitives: string, number, boolean, null
 * - Arrays of primitives: string[], number[], boolean[], or mixed primitive arrays
 *
 * Does NOT support:
 * - Functions
 * - Class instances (Date, Map, Set, etc.)
 * - Plain objects (use format configs instead)
 */
export const serializableDataSchema = z.record(
  z.string(),
  z.union([jsonPrimitive, z.array(jsonPrimitive)]),
);

/**
 * Zod schema for validating DataTable payloads from LLM tool calls.
 */
export const serializableDataTableSchema = z.object({
  id: ToolUIIdSchema,
  columns: z.array(serializableColumnSchema),
  data: z.array(serializableDataSchema),
  layout: layoutEnum.optional(),
});

/**
 * Type representing the serializable parts of a DataTable payload.
 */
export type SerializableDataTable = z.infer<typeof serializableDataTableSchema>;

/**
 * Validates and parses a DataTable payload from unknown data.
 */
export function parseSerializableDataTable(input: unknown): SerializableDataTable {
  const res = serializableDataTableSchema.safeParse(input);
  if (!res.success) {
    throw new Error(`Invalid DataTable payload: ${res.error.message}`);
  }
  return res.data;
}

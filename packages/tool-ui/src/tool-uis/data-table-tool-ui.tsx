"use client";

import { makeToolUI } from "../factories/make-tool-ui";
import { DataTable } from "../components/data-table";
import { serializableDataTableSchema } from "../schemas/data-table";

/**
 * Pre-built tool UI for tabular data display tools.
 *
 * Expected tool args shape:
 * - columns: Array<{ key: string; label: string; ... }>
 * - data: Array<Record<string, unknown>>
 *
 * @example
 * ```tsx
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <DataTableToolUI />
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export const DataTableToolUI = makeToolUI({
  toolName: "show_table",
  schema: serializableDataTableSchema,
  render: ({ data, status }) => (
    <DataTable {...data} isLoading={status.type === "running"} />
  ),
  transform: (args: unknown) => {
    const a = args as Record<string, unknown>;
    return {
      id: `table-${Date.now()}`,
      columns: a["columns"] as unknown[],
      data: a["data"] as unknown[],
      footerActions: a["footerActions"] as unknown,
    };
  },
});

"use client";

import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "@/components/assistant-ui/elements/data-table";

const COLUMNS = [
  { key: "name", label: "Model", priority: "primary", width: "34%" },
  {
    key: "context",
    label: "Context",
    format: { kind: "number", compact: true },
    width: "18%",
  },
  {
    key: "input",
    label: "Input",
    format: { kind: "currency", currency: "USD", decimals: 2 },
    width: "18%",
  },
  {
    key: "latency",
    label: "Latency",
    format: { kind: "number", unit: "ms" },
    width: "15%",
  },
  {
    key: "weekly",
    label: "Weekly",
    format: { kind: "delta", decimals: 1, unit: "%" },
    width: "15%",
  },
] as const satisfies readonly DataTableColumn[];

const MODELS = [
  {
    name: "Sonnet 4.5",
    context: 200_000,
    input: 3,
    latency: 820,
    weekly: 2.4,
  },
  { name: "GPT-5", context: 400_000, input: 5, latency: 690, weekly: -1.2 },
  {
    name: "Haiku 4.5",
    context: 200_000,
    input: 0.8,
    latency: 420,
    weekly: 4.8,
  },
] as const satisfies readonly DataTableRow[];

export function DataTableDemo() {
  return (
    <DataTable
      columns={COLUMNS}
      rows={MODELS}
      rowKey="name"
      defaultSort={{ key: "context", direction: "desc" }}
      caption="Model comparison"
    />
  );
}

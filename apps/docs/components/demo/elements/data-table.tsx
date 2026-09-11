"use client";

import {
  DataTable,
  type ModelUsage,
} from "@/components/assistant-ui/elements/data-table";

const MODEL_USAGE = [
  { name: "Sonnet 4.5", context: "200k", cost: "$3.00" },
  { name: "GPT-5", context: "400k", cost: "$5.00" },
  { name: "Haiku 4.5", context: "200k", cost: "$0.80" },
] as const satisfies readonly ModelUsage[];

export function DataTableDemo() {
  return <DataTable rows={MODEL_USAGE} cycle={0} />;
}

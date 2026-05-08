import { summarizeToolResult } from "@/components/agent-playground/runtime/toolMapping";

export function ToolSummary({
  result,
  emptyLabel = "Running...",
}: {
  result: unknown;
  emptyLabel?: string;
}) {
  const summary = summarizeToolResult(result);
  if (!summary)
    return <div className="text-muted-foreground text-sm">{emptyLabel}</div>;
  return (
    <pre className="scrollbar-thin max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-foreground/90 text-xs">
      {summary}
    </pre>
  );
}

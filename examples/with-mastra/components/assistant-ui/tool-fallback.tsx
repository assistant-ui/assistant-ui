import { MessagePrimitive } from "@assistant-ui/react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FC } from "react";

export const ToolFallback: FC<any> = (props) => {
  const toolName = props.toolName || "Unknown Tool";
  const argsText = props.argsText || "";
  const status = props.status || { type: "running" };
  const result = props.result;

  const isRunning = status.type === "running";
  const isComplete = status.type === "complete";
  // Tool calls use string status, not object
  const isError =
    status === "output-error" ||
    (typeof status === "object" && status.type === "output-error");

  return (
    <MessagePrimitive.Root className="my-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-3",
          isRunning &&
            "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
          isComplete &&
            "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
          isError &&
            "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
        )}
      >
        {isRunning && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        )}
        {isComplete && (
          <div className="h-4 w-4 rounded-full bg-green-600 dark:bg-green-400" />
        )}
        {isError && (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}

        <div className="flex-1">
          <div className="text-sm font-medium">Using tool: {toolName}</div>
          {argsText && (
            <div className="text-muted-foreground mt-1 font-mono text-xs">
              {argsText}
            </div>
          )}
          {isError && result && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              Error: {String(result)}
            </div>
          )}
          {isComplete && result && (
            <div className="text-muted-foreground mt-1 text-xs">
              Result: {String(result)}
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

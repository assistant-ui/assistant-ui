import { MessagePrimitive } from "@assistant-ui/react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToolFallback = ({ tool }: { tool: any }) => {
  return (
    <MessagePrimitive.Root className="my-2">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border p-3",
        tool.state === "running" && "border-blue-200 bg-blue-50",
        tool.state === "success" && "border-green-200 bg-green-50",
        tool.state === "error" && "border-red-200 bg-red-50"
      )}>
        {tool.state === "running" && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
        {tool.state === "success" && (
          <div className="h-4 w-4 rounded-full bg-green-600" />
        )}
        {tool.state === "error" && (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}

        <div className="flex-1">
          <div className="font-medium text-sm">
            Using tool: {tool.name}
          </div>
          {tool.args && (
            <div className="text-xs text-muted-foreground mt-1">
              {JSON.stringify(tool.args, null, 2)}
            </div>
          )}
          {tool.state === "error" && tool.error && (
            <div className="text-xs text-red-600 mt-1">
              Error: {tool.error}
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
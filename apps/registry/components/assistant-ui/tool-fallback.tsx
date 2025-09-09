import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="aui-tool-fallback-header flex items-center gap-2 px-4">
        <CheckIcon className="aui-tool-fallback-icon size-4" />
        <p className="aui-tool-fallback-title flex-grow">
          Used tool: <b>{toolName}</b>
        </p>
        <Button onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="aui-tool-fallback-content flex flex-col gap-2 border-t pt-2">
          <div className="aui-tool-fallback-args-root px-4">
            <pre className="aui-tool-fallback-args-value whitespace-pre-wrap">
              {argsText}
            </pre>
          </div>
          {result !== undefined && (
            <div className="aui-tool-fallback-result-root border-t border-dashed px-4 pt-2">
              <p className="aui-tool-fallback-result-header font-semibold">
                Result:
              </p>
              <pre className="aui-tool-fallback-result-content whitespace-pre-wrap">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

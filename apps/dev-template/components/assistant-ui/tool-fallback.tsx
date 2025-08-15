import { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="aui-tool-fallback-root">
      <div className="aui-tool-fallback-header">
        <CheckIcon className="aui-tool-fallback-icon" />
        <p className="aui-tool-fallback-title">
          Used tool: <b>{toolName}</b>
        </p>
        <Button onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="aui-tool-fallback-content">
          <div className="aui-tool-fallback-args-root">
            <pre className="aui-tool-fallback-args-value">{argsText}</pre>
          </div>
          {result !== undefined && (
            <div className="aui-tool-fallback-result-root">
              <p className="aui-tool-fallback-result-header">Result:</p>
              <pre className="aui-tool-fallback-result-content">
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

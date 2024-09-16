import { ToolCallContentPartComponent } from "@assistant-ui/react";
import { INTERNAL } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

const { TooltipIconButton } = INTERNAL;

export const ToolFallback: ToolCallContentPartComponent = ({ part }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="flex items-center gap-2 px-4">
        <CheckIcon className="size-4" />
        <p className="">
          Used tool: <b>{part.toolName}</b>
        </p>
        <div className="flex-grow" />
        <TooltipIconButton
          tooltip={isCollapsed ? "Expand" : "Collapse"}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </TooltipIconButton>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col gap-2 border-t pt-2">
          <div className="px-4">
            <pre className="whitespace-pre-wrap">{part.argsText}</pre>
          </div>
          {part.result !== undefined && (
            <div className="border-t border-dashed px-4 pt-2">
              <p className="font-semibold">Result:</p>
              <pre className="whitespace-pre-wrap">
                {typeof part.result === "string"
                  ? part.result
                  : JSON.stringify(part.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

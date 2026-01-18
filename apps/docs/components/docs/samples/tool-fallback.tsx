"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

type ToolFallbackStaticProps = {
  toolName: string;
  argsText: string;
  result: unknown;
};

function formatResult(result: unknown): string {
  if (typeof result === "string") return result;
  return JSON.stringify(result, null, 2);
}

function ToolFallbackStatic({
  toolName,
  argsText,
  result,
}: ToolFallbackStaticProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const ToggleIcon = isCollapsed ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div className="aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="aui-tool-fallback-header flex items-center gap-2 px-4">
        <CheckIcon className="aui-tool-fallback-icon size-4" />
        <p className="aui-tool-fallback-title grow">
          Used tool: <b>{toolName}</b>
        </p>
        <Button onClick={() => setIsCollapsed(!isCollapsed)}>
          <ToggleIcon />
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
                {formatResult(result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolFallbackSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackStatic
        toolName="get_weather"
        argsText={JSON.stringify({ location: "San Francisco" }, null, 2)}
        result={{ temperature: 72, condition: "Sunny", humidity: 45 }}
      />
    </SampleFrame>
  );
}

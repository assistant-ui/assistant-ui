"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const ToolCallItem = ({
  toolName,
  args,
}: {
  toolName: string;
  args: Record<string, unknown>;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="flex items-center gap-2 px-4">
        <CheckIcon className="size-4" />
        <p className="grow">
          Used tool: <b>{toolName}</b>
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="border-t px-4 pt-2">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const ToolGroupSample = () => {
  return (
    <SampleFrame className="h-auto bg-background p-4">
      <details className="my-2" open>
        <summary className="cursor-pointer font-medium">3 tool calls</summary>
        <div className="space-y-2 pt-2 pl-4">
          <ToolCallItem
            toolName="get_weather"
            args={{ location: "New York" }}
          />
          <ToolCallItem toolName="get_weather" args={{ location: "London" }} />
          <ToolCallItem toolName="get_weather" args={{ location: "Tokyo" }} />
        </div>
      </details>
    </SampleFrame>
  );
};

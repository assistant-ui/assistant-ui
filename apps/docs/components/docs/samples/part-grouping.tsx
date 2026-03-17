"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const CollapsibleGroup = ({
  groupKey,
  itemCount,
  children,
}: {
  groupKey: string;
  itemCount: number;
  children: React.ReactNode;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="my-2 overflow-hidden rounded-lg border">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between p-3 hover:bg-muted/50"
      >
        <span>
          Group {groupKey} ({itemCount} items)
        </span>
        {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
      </button>
      {!isCollapsed && <div className="border-t p-3">{children}</div>}
    </div>
  );
};

export const PartGroupingSample = () => {
  return (
    <SampleFrame className="h-auto bg-background p-4">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          Message parts grouped by type:
        </p>
        <CollapsibleGroup groupKey="research" itemCount={2}>
          <div className="space-y-2 text-sm">
            <div className="rounded bg-muted/50 p-2">Search: climate data</div>
            <div className="rounded bg-muted/50 p-2">
              Search: renewable energy stats
            </div>
          </div>
        </CollapsibleGroup>
        <CollapsibleGroup groupKey="analysis" itemCount={2}>
          <div className="space-y-2 text-sm">
            <div className="rounded bg-muted/50 p-2">Analyzing trends...</div>
            <div className="rounded bg-muted/50 p-2">Generating summary...</div>
          </div>
        </CollapsibleGroup>
      </div>
    </SampleFrame>
  );
};

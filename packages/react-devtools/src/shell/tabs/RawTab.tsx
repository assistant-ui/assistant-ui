import { useCallback, useState } from "react";
import clsx from "clsx";
import { ScopesView } from "../../views/scopes";
import type { DevToolsTabContext } from "../registry";

export const RawTab = ({ data }: DevToolsTabContext) => {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  const toggleStateSection = useCallback((key: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const stateEntries = Object.entries(data.state);

  return (
    <div className="flex flex-col gap-3">
      {stateEntries.map(([key, value]) => {
        const expanded = expandedStates.has(key);
        return (
          <div
            key={key}
            className="bg-card overflow-hidden rounded-lg border transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleStateSection(key)}
              className="bg-muted text-foreground hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors"
            >
              <span>{key}</span>
              <span
                className={clsx(
                  "text-muted-foreground transition-transform",
                  expanded && "rotate-90",
                )}
              >
                ›
              </span>
            </button>
            {expanded && (
              <div className="border-t p-4">
                <pre className="bg-muted text-foreground overflow-auto rounded-lg p-3 font-mono text-[11px] whitespace-pre">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
      <ScopesView scopes={data.scopes} />
    </div>
  );
};

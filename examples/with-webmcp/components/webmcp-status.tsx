"use client";

import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";

const emptySubscribe = () => () => {};
const detectWebMcp = () =>
  "modelContext" in document || "modelContext" in navigator;
const getServerSnapshot = () => undefined;

export function WebMcpStatus({ toolNames }: { toolNames: string[] }) {
  const available = useSyncExternalStore(
    emptySubscribe,
    detectWebMcp,
    getServerSnapshot,
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {available === undefined ? null : available ? (
        <Badge className="bg-green-600/10 text-green-700 dark:text-green-400">
          WebMCP available
        </Badge>
      ) : (
        <Badge variant="secondary">WebMCP unavailable</Badge>
      )}
      {available === false && (
        <span className="text-muted-foreground">
          Enable chrome://flags/#enable-webmcp-testing and reload — the chat
          below works either way.
        </span>
      )}
      {available && (
        <span className="text-muted-foreground">
          Exposed tools:{" "}
          <span className="font-mono text-xs">{toolNames.join(", ")}</span>
        </span>
      )}
    </div>
  );
}

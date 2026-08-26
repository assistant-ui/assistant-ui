"use client";

import { useWebMcpBridge } from "@assistant-ui/react-webmcp";
import { Badge } from "@/components/ui/badge";

export function WebMcpStatus() {
  const { status, registeredToolNames } = useWebMcpBridge();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {status === "active" ? (
        <Badge className="bg-green-600/10 text-green-700 dark:text-green-400">
          WebMCP active
        </Badge>
      ) : (
        <Badge variant="secondary">WebMCP unavailable</Badge>
      )}
      {status === "unsupported" && (
        <span className="text-muted-foreground">
          Enable chrome://flags/#enable-webmcp-testing and reload — the chat
          below works either way.
        </span>
      )}
      {status === "active" && (
        <span className="text-muted-foreground">
          Exposed tools:{" "}
          <span className="font-mono text-xs">
            {registeredToolNames.length > 0
              ? registeredToolNames.join(", ")
              : "none yet"}
          </span>
        </span>
      )}
    </div>
  );
}

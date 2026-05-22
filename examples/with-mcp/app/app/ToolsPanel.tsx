"use client";

import { useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "lucide-react";

export function ToolsPanel() {
  const aui = useAui();
  const servers = useAuiState((s) => s.mcp.servers);
  const [result, setResult] = useState<string>("");

  const connectedTools = servers
    .filter((s) => s.connectionState === "connected")
    .flatMap((s) => s.tools.map((t) => ({ serverId: s.id, name: t.name })));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tools</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {connectedTools.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Open the MCP servers panel above and connect to see tools here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {connectedTools.map((t) => (
              <li
                key={`${t.serverId}__${t.name}`}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <code className="truncate font-mono text-xs">
                  {t.serverId}__{t.name}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-xs"
                  onClick={async () => {
                    try {
                      const out = await aui
                        .mcp()
                        .server({ id: t.serverId })
                        .callTool(t.name, { text: "hello", input: "hello" });
                      setResult(JSON.stringify(out, null, 2));
                    } catch (err) {
                      setResult(String(err));
                    }
                  }}
                >
                  <PlayIcon className="size-3" />
                  Call
                </Button>
              </li>
            ))}
          </ul>
        )}
        {result && (
          <pre className="overflow-x-auto rounded-md border bg-muted px-3 py-2 text-xs">
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

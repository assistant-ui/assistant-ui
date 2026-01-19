"use client";

import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/settings-store";
import { MCP_SERVERS, type MCPServerConfig } from "@/lib/server-config";

function ServerItem({
  server,
  isEnabled,
  onToggle,
}: {
  server: MCPServerConfig;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground text-sm">
            {server.name}
          </span>
          {isEnabled && (
            <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-700 dark:bg-green-900 dark:text-green-300">
              Active
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-muted-foreground text-xs">
          {server.description}
        </p>
      </div>
    </label>
  );
}

export function SettingsDialog() {
  const { enabledServers, toggleServer } = useSettingsStore();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>MCP Servers</DialogTitle>
          <DialogDescription>
            Toggle which MCP servers are available to the assistant.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-3">
            {MCP_SERVERS.map((server) => (
              <ServerItem
                key={server.id}
                server={server}
                isEnabled={enabledServers.includes(server.id)}
                onToggle={() => toggleServer(server.id)}
              />
            ))}
          </div>
        </div>
        <div className="border-t pt-3 text-muted-foreground text-xs">
          All servers must be running before enabling. Run{" "}
          <code className="rounded bg-muted px-1">pnpm dev:all</code> to start
          all servers.
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useWorkbenchStore, useMockConfig } from "@/lib/workbench/store";
import { fetchMcpTools } from "@/lib/workbench/mcp-client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, Wrench, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { MockVariantEditor } from "./mock-variant-editor";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ServerStatus = "idle" | "connecting" | "connected" | "error";

const STATUS_CONFIG: Record<
  Exclude<ServerStatus, "idle">,
  { dot: string; text?: string; textClass: string }
> = {
  connecting: {
    dot: "bg-amber-500 animate-pulse",
    text: "Connecting...",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  connected: {
    dot: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    dot: "bg-red-500",
    text: "Not connected",
    textClass: "text-red-600 dark:text-red-400",
  },
};

const ERROR_MESSAGE_MAX_LENGTH = 80;
const ACCORDION_EASING = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function truncateMessage(message: string, maxLength: number): string {
  return message.length > maxLength
    ? message.slice(0, maxLength) + "…"
    : message;
}

function formatToolCount(count: number): string {
  return `${count} tool${count !== 1 ? "s" : ""}`;
}

interface ServerStatusIndicatorProps {
  status: ServerStatus;
  toolCount?: number;
  errorMessage?: string;
}

function ServerStatusIndicator({
  status,
  toolCount,
  errorMessage,
}: ServerStatusIndicatorProps) {
  if (status === "idle") return null;

  const config = STATUS_CONFIG[status];
  const displayText =
    status === "connected" && toolCount !== undefined
      ? formatToolCount(toolCount)
      : config.text;

  const indicator = (
    <span
      className={cn("flex items-center gap-1.5 text-[10px]", config.textClass)}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {displayText}
    </span>
  );

  if (status === "error" && errorMessage) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="cursor-help">
            {indicator}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          {truncateMessage(errorMessage, ERROR_MESSAGE_MAX_LENGTH)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-medium text-[10px] text-muted-foreground/70 uppercase tracking-widest">
      {children}
    </div>
  );
}

interface FetchToolsButtonProps {
  onClick: () => void;
  isLoading: boolean;
  variant?: "default" | "icon";
  onDemoModeClick?: () => void;
}

function FetchToolsButton({
  onClick,
  isLoading,
  variant = "default",
  onDemoModeClick,
}: FetchToolsButtonProps) {
  const handleClick = isDemoMode && onDemoModeClick ? onDemoModeClick : onClick;
  const icon = isLoading ? (
    <Loader2 className="size-3.5 animate-spin" />
  ) : (
    <RefreshCw className="size-3.5" />
  );

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={isLoading}
        className="size-7 shrink-0"
        title="Fetch tools from server"
      >
        {icon}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="mt-4 gap-2"
    >
      {icon}
      Fetch from Server
    </Button>
  );
}

interface ToolAccordionItemProps {
  name: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function ToolAccordionItem({
  name,
  isExpanded,
  onToggle,
}: ToolAccordionItemProps) {
  const mockConfig = useMockConfig();
  const toolConfig = mockConfig.tools[name];
  const isSimulationEnabled = mockConfig.globalEnabled;
  const updateToolResponse = useWorkbenchStore((s) => s.updateToolResponse);

  if (!toolConfig) return null;

  const editorVariant = {
    id: "default",
    name: "Default",
    type: "success" as const,
    delay: 300,
    response: toolConfig.mockResponse ?? { structuredContent: {} },
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border/40 bg-card/50">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-card"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-100",
            ACCORDION_EASING,
            isExpanded ? "rotate-0" : "-rotate-90",
          )}
        />
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Wrench className="size-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium font-mono text-xs">{name}</div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-150",
          ACCORDION_EASING,
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-border/40 border-t px-3 py-3">
            <div className={cn(!isSimulationEnabled && "opacity-60")}>
              {!isSimulationEnabled && (
                <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-amber-600 text-xs dark:text-amber-400">
                  <span>Enable Simulation to use mock responses</span>
                </div>
              )}

              <div className="mb-2 font-medium text-[10px] text-muted-foreground/70 uppercase tracking-widest">
                Mock Response
              </div>

              <MockVariantEditor
                variant={editorVariant}
                onSave={(variant) => updateToolResponse(name, variant.response)}
                onCancel={() => {}}
                inline
                disabled={!isSimulationEnabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onFetchTools: () => void;
  isFetching: boolean;
  hasError: boolean;
  onDemoModeClick?: () => void;
}

function EmptyState({
  onFetchTools,
  isFetching,
  hasError,
  onDemoModeClick,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/10">
        <Wrench className="size-5 text-blue-500/50" />
      </div>
      <div className="mb-1 font-medium text-sm">No tools yet</div>
      <p className="max-w-[200px] text-center text-muted-foreground text-xs">
        Tools appear here when your widget calls{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
          callTool()
        </code>
      </p>
      <FetchToolsButton
        onClick={onFetchTools}
        isLoading={isFetching}
        onDemoModeClick={onDemoModeClick}
      />
      {hasError && (
        <p className="mt-2 text-[10px] text-red-600 dark:text-red-400">
          Server not connected
        </p>
      )}
    </div>
  );
}

interface SimulationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function SimulationToggle({ enabled, onToggle }: SimulationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex cursor-pointer items-center gap-2.5">
        <Switch
          id="simulation-toggle"
          checked={enabled}
          onCheckedChange={onToggle}
        />
        <label
          htmlFor="simulation-toggle"
          className="cursor-pointer font-medium text-sm"
        >
          Simulation
        </label>
      </div>
      {enabled && (
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          Active
        </span>
      )}
    </div>
  );
}

interface McpServerSectionProps {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  onFetchTools: () => void;
  isFetching: boolean;
  status: ServerStatus;
  toolCount?: number;
  errorMessage?: string;
  onDemoModeClick?: () => void;
}

function McpServerSection({
  serverUrl,
  onServerUrlChange,
  onFetchTools,
  isFetching,
  status,
  toolCount,
  errorMessage,
  onDemoModeClick,
}: McpServerSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-[10px] text-muted-foreground/70 uppercase tracking-widest">
          MCP Server
        </span>
        <ServerStatusIndicator
          status={status}
          toolCount={toolCount}
          errorMessage={errorMessage}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => onServerUrlChange(e.target.value)}
          placeholder="http://localhost:3001/mcp"
          className="flex-1 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 font-mono text-xs placeholder:text-muted-foreground/50 focus:border-foreground/20 focus:outline-none"
        />
        <FetchToolsButton
          onClick={onFetchTools}
          isLoading={isFetching}
          variant="icon"
          onDemoModeClick={onDemoModeClick}
        />
      </div>
    </div>
  );
}

export function MockConfigPanel() {
  const mockConfig = useMockConfig();
  const toolNames = Object.keys(mockConfig.tools);

  const [serverStatus, setServerStatus] = useState<ServerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [lastFetchedCount, setLastFetchedCount] = useState<
    number | undefined
  >();
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [showDemoDialog, setShowDemoDialog] = useState(false);

  const setMocksEnabled = useWorkbenchStore((s) => s.setMocksEnabled);
  const setServerUrl = useWorkbenchStore((s) => s.setServerUrl);
  const registerToolsFromServer = useWorkbenchStore(
    (s) => s.registerToolsFromServer,
  );

  const handleFetchTools = useCallback(async () => {
    setServerStatus("connecting");
    setErrorMessage(undefined);

    const result = await fetchMcpTools(mockConfig.serverUrl);

    if (result.success && result.tools) {
      registerToolsFromServer(result.tools);
      setLastFetchedCount(result.tools.length);
      setServerStatus("connected");
    } else if (result.error) {
      setErrorMessage(result.error.message);
      setServerStatus("error");
    }
  }, [mockConfig.serverUrl, registerToolsFromServer]);

  const toggleTool = useCallback((name: string) => {
    setExpandedTool((prev) => (prev === name ? null : name));
  }, []);

  const isFetching = serverStatus === "connecting";
  const handleDemoModeClick = useCallback(() => {
    setShowDemoDialog(true);
  }, []);

  return (
    <>
      {toolNames.length === 0 ? (
        <EmptyState
          onFetchTools={handleFetchTools}
          isFetching={isFetching}
          hasError={serverStatus === "error"}
          onDemoModeClick={handleDemoModeClick}
        />
      ) : (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="shrink-0 space-y-4 border-border/40 border-b p-4">
            <SimulationToggle
              enabled={mockConfig.globalEnabled}
              onToggle={setMocksEnabled}
            />
            <McpServerSection
              serverUrl={mockConfig.serverUrl}
              onServerUrlChange={setServerUrl}
              onFetchTools={handleFetchTools}
              isFetching={isFetching}
              status={serverStatus}
              toolCount={lastFetchedCount}
              errorMessage={errorMessage}
              onDemoModeClick={handleDemoModeClick}
            />
          </div>

          <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
            <SectionLabel>Tools</SectionLabel>
            <div className="space-y-2">
              {toolNames.map((name) => (
                <ToolAccordionItem
                  key={name}
                  name={name}
                  isExpanded={expandedTool === name}
                  onToggle={() => toggleTool(name)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demo Mode</DialogTitle>
            <DialogDescription>
              This feature is only available when running the workbench locally.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

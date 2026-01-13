"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { useSelectedComponent } from "@/lib/workbench/store";
import { getComponent } from "@/lib/workbench/component-registry";

type ExportStatus = "idle" | "exporting" | "success" | "error";

interface ExportResult {
  success: boolean;
  files?: Array<{ relativePath: string; size: number }>;
  errors?: string[];
  warnings?: string[];
  outputDir?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExportPopover() {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [result, setResult] = useState<ExportResult | null>(null);
  const selectedComponentId = useSelectedComponent();
  const componentEntry = getComponent(selectedComponentId);

  const handleExport = useCallback(async () => {
    if (!componentEntry) {
      setResult({ success: false, errors: ["No component selected"] });
      setStatus("error");
      return;
    }

    setStatus("exporting");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetEntryPoint: componentEntry.exportConfig.entryPoint,
          widgetExportName: componentEntry.exportConfig.exportName,
          widgetName: componentEntry.label,
          manifest: {
            name: componentEntry.label,
            description: componentEntry.description,
            version: "1.0.0",
          },
        }),
      });

      const data: ExportResult = await response.json();
      setResult(data);
      setStatus(data.success ? "success" : "error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setResult({ success: false, errors: [message] });
      setStatus("error");
    }
  }, [componentEntry]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "export" }),
      });
    } catch {
      // Silently fail - not critical
    }
  }, []);

  const hasExported = result !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 rounded-md px-2.5 font-medium text-xs",
            status === "success" &&
              "border-green-500/50 text-green-600 hover:text-green-600 dark:text-green-400",
            status === "error" &&
              "border-destructive/50 text-destructive hover:text-destructive",
          )}
        >
          {status === "exporting" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="size-3.5" />
          ) : status === "error" ? (
            <AlertCircle className="size-3.5" />
          ) : (
            <Download className="size-3.5" />
          )}
          Export
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 text-xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Export Widget</div>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={status === "exporting"}
              className="h-7 gap-1.5 text-xs"
            >
              {status === "exporting" ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="size-3" />
                  {hasExported ? "Re-export" : "Export"}
                </>
              )}
            </Button>
          </div>

          {!hasExported && status !== "exporting" && componentEntry && (
            <p className="text-[11px] text-muted-foreground">
              Bundle <span className="font-medium">{componentEntry.label}</span>{" "}
              for production deployment.
            </p>
          )}

          {result?.success && result.files && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-3.5" />
                <span>Export successful</span>
              </div>
              <button
                onClick={handleOpenFolder}
                className="flex w-full items-center justify-between rounded bg-muted px-2 py-1.5 font-mono text-[11px] transition-colors hover:bg-muted/80"
              >
                <span>./export/</span>
                <FolderOpen className="size-3.5 text-muted-foreground" />
              </button>
              <div className="space-y-0.5 text-[11px]">
                {result.files.map((f) => (
                  <div
                    key={f.relativePath}
                    className="flex justify-between gap-3 text-muted-foreground"
                  >
                    <span className="truncate">{f.relativePath}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 text-[11px] text-muted-foreground">
                Total:{" "}
                {formatBytes(result.files.reduce((sum, f) => sum + f.size, 0))}
              </div>
            </div>
          )}

          {result && !result.success && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="size-3.5" />
                <span>Export failed</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {result.errors?.[0] ?? "Unknown error"}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

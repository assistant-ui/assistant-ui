"use client";

import { memo, useMemo } from "react";
import { CheckIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ApplyPatchSummary, useApplyPatchInfo } from "./apply-patch-inline";

const getToolSummary = (toolName: string, argsText?: string): string => {
  if (!argsText) return "";

  try {
    const args = JSON.parse(argsText);

    const value =
      args.file_path ??
      args.path ??
      args.pattern ??
      args.command ??
      args.query ??
      args.glob ??
      args.url ??
      "";
    if (typeof value !== "string") return "";
    if (value.includes("/") && (toolName === "read" || toolName === "Read")) {
      const parts = value.split("/").filter(Boolean);
      return parts.length > 2 ? parts.slice(-2).join("/") : value;
    }
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  } catch {
    return "";
  }
};

const StatusIcon = ({
  statusType,
  isCancelled,
}: {
  statusType: string;
  isCancelled: boolean;
}) => {
  if (statusType === "running")
    return <LoaderIcon className="size-3 shrink-0 animate-spin" />;
  if (statusType === "incomplete")
    return (
      <XCircleIcon
        className={`size-3 shrink-0 ${isCancelled ? "" : "text-destructive"}`}
      />
    );
  return <CheckIcon className="size-3 shrink-0" />;
};

const ToolCallInlineImpl: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  status,
}) => {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";

  const isPatch = toolName === "apply_patch";

  const patchInfo = useApplyPatchInfo(isPatch ? argsText : undefined);

  const summary = useMemo(
    () => (isPatch ? "" : getToolSummary(toolName, argsText)),
    [isPatch, toolName, argsText],
  );

  return (
    <div className="flex items-center gap-2 py-0.5 text-muted-foreground text-sm">
      <StatusIcon statusType={statusType} isCancelled={isCancelled} />
      <span
        className={`flex items-center gap-1.5 truncate ${isCancelled ? "line-through opacity-50" : ""}`}
      >
        <span className="font-medium">{toolName}</span>
        {isPatch && patchInfo ? (
          <ApplyPatchSummary patchInfo={patchInfo} isRunning={isRunning} />
        ) : (
          summary && <span className="opacity-60">{summary}</span>
        )}
      </span>
    </div>
  );
};

export const ToolCallInline = memo(ToolCallInlineImpl);
ToolCallInline.displayName = "ToolCallInline";

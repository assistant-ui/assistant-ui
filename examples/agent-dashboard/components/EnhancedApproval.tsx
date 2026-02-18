"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ApprovalPrimitive,
  useApproval,
  useApprovalState,
} from "@assistant-ui/react-agent";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  FileText,
  Edit3,
  Clock,
  Keyboard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

type RiskLevel = "low" | "medium" | "high";

const toolRiskLevels: Record<string, RiskLevel> = {
  Read: "low",
  Glob: "low",
  Grep: "low",
  Write: "medium",
  Edit: "medium",
  Bash: "high",
};

const riskConfig: Record<
  RiskLevel,
  {
    icon: React.ReactNode;
    label: string;
    bgColor: string;
    borderColor: string;
    badgeVariant: "success" | "warning" | "destructive";
  }
> = {
  low: {
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Low Risk",
    bgColor: "bg-success/5",
    borderColor: "border-success/30",
    badgeVariant: "success",
  },
  medium: {
    icon: <Shield className="h-5 w-5" />,
    label: "Medium Risk",
    bgColor: "bg-warning/5",
    borderColor: "border-warning/30",
    badgeVariant: "warning",
  },
  high: {
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "High Risk",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/30",
    badgeVariant: "destructive",
  },
};

const toolIcons: Record<string, React.ReactNode> = {
  Bash: <Terminal className="h-5 w-5" />,
  Read: <FileText className="h-5 w-5" />,
  Write: <Edit3 className="h-5 w-5" />,
  Edit: <Edit3 className="h-5 w-5" />,
};

export interface EnhancedApprovalProps {
  approvalId: string;
  className?: string | undefined;
}

function ApprovalContent({ className }: { className?: string }) {
  const approval = useApproval();
  const state = useApprovalState((s) => s);
  const [elapsed, setElapsed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toolName = state?.toolName ?? "Unknown";
  const riskLevel = toolRiskLevels[toolName] || "medium";
  const risk = riskConfig[riskLevel];
  const toolIcon = toolIcons[toolName] || <Terminal className="h-5 w-5" />;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - new Date(state?.createdAt ?? Date.now()).getTime()) /
          1000,
      );
      setElapsed(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.createdAt]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state?.status !== "pending") return;
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        approval?.approve();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        approval?.deny();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        approval?.approve("session");
      }
    },
    [approval, state?.status],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle if this component's container is focused
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }
      handleKeyDown(e);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyDown]);

  const formatElapsed = () => {
    if (elapsed < 60) return `${elapsed}s`;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}m ${secs}s`;
  };

  const formatInput = () => {
    const input = (state?.toolInput ?? {}) as Record<string, unknown>;
    if (toolName === "Bash" && "command" in input && input["command"]) {
      return String(input["command"]);
    }
    if (
      (toolName === "Read" || toolName === "Write") &&
      "path" in input &&
      input["path"]
    ) {
      return String(input["path"]);
    }
    return JSON.stringify(input, null, 2);
  };

  const getActionPreview = () => {
    const input = (state?.toolInput ?? {}) as Record<string, unknown>;
    switch (toolName) {
      case "Bash":
        return `Execute shell command: ${String(input["command"] || "").slice(0, 100)}`;
      case "Read":
        return `Read file: ${String(input["path"])}`;
      case "Write":
        return `Write to file: ${String(input["path"])}`;
      case "Edit":
        return `Edit file: ${String(input["path"] || input["file_path"])}`;
      case "Glob":
        return `Search for files matching: ${String(input["pattern"])}`;
      case "Grep":
        return `Search for: ${String(input["pattern"] || input["query"])}`;
      default:
        return `Execute ${toolName}`;
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={cn(
        "overflow-hidden rounded-xl border-2 shadow-lg transition-all",
        risk.bgColor,
        risk.borderColor,
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-border/50 border-b bg-background/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg p-2",
              riskLevel === "high"
                ? "bg-destructive/10 text-destructive"
                : riskLevel === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success",
            )}
          >
            {risk.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Approval Required</h3>
              <Badge variant={risk.badgeVariant}>{risk.label}</Badge>
            </div>
            <p className="mt-0.5 text-muted-foreground text-sm">
              {getActionPreview()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{formatElapsed()}</span>
        </div>
      </div>

      {/* Tool Details */}
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-muted-foreground">{toolIcon}</span>
          <code className="rounded bg-muted px-2 py-1 font-mono font-semibold text-sm">
            {toolName}
          </code>
        </div>

        {/* Input Preview */}
        <div className="mb-4 rounded-lg border border-border bg-background p-3">
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Tool Input
          </h4>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-sm">
            {formatInput()}
          </pre>
        </div>

        {/* Warning for high risk */}
        {riskLevel === "high" && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This tool can execute arbitrary commands on the system. Review the
              input carefully before approving.
            </p>
          </div>
        )}

        {/* Main Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Keyboard className="h-3.5 w-3.5" />
            <span>
              <kbd className="rounded bg-muted px-1.5 py-0.5">y</kbd> approve{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">s</kbd> session{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">d</kbd> deny
            </span>
          </div>
          <div className="flex gap-2">
            <ApprovalPrimitive.Deny className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 font-medium text-destructive text-sm transition-colors hover:bg-destructive/20">
              Deny
            </ApprovalPrimitive.Deny>
            <ApprovalPrimitive.Approve className="rounded-lg bg-success px-4 py-2 font-medium text-sm text-success-foreground transition-colors hover:bg-success/90">
              Approve
            </ApprovalPrimitive.Approve>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-muted-foreground text-xs hover:text-foreground"
        >
          {showAdvanced ? (
            <>
              Hide options <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              More options <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Advanced Approval Options */}
        {showAdvanced && (
          <div className="mt-3 flex flex-wrap gap-2 border-border border-t pt-3">
            <ApprovalPrimitive.ApproveSession className="rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground">
              Allow for this session
            </ApprovalPrimitive.ApproveSession>
            <ApprovalPrimitive.ApproveAlways className="rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground">
              Always allow {toolName}
            </ApprovalPrimitive.ApproveAlways>
            <ApprovalPrimitive.ApproveTimed
              duration={300000}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              Allow for 5 minutes
            </ApprovalPrimitive.ApproveTimed>
          </div>
        )}
      </div>
    </div>
  );
}

export function EnhancedApproval({
  approvalId,
  className,
}: EnhancedApprovalProps) {
  const contentProps = className ? { className } : {};
  return (
    <ApprovalPrimitive.Root approvalId={approvalId}>
      <ApprovalContent {...contentProps} />
    </ApprovalPrimitive.Root>
  );
}

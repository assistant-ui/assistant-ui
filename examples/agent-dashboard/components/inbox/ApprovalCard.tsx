"use client";

import {
  useEffect,
  useState,
  forwardRef,
  Component,
  type ReactNode,
} from "react";
import { ApprovalPrimitive, useApprovalState } from "@assistant-ui/react-agent";

// Error boundary to handle missing approvals (race condition when approval is resolved)
class ApprovalErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  FileText,
  Edit3,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    focusBorderColor: string;
    badgeVariant: "success" | "warning" | "destructive";
  }
> = {
  low: {
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Low Risk",
    bgColor: "bg-success/5",
    borderColor: "border-success/30",
    focusBorderColor: "border-success",
    badgeVariant: "success",
  },
  medium: {
    icon: <Shield className="h-5 w-5" />,
    label: "Medium Risk",
    bgColor: "bg-warning/5",
    borderColor: "border-warning/30",
    focusBorderColor: "border-warning",
    badgeVariant: "warning",
  },
  high: {
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "High Risk",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/30",
    focusBorderColor: "border-destructive",
    badgeVariant: "destructive",
  },
};

const toolIcons: Record<string, React.ReactNode> = {
  Bash: <Terminal className="h-5 w-5" />,
  Read: <FileText className="h-5 w-5" />,
  Write: <Edit3 className="h-5 w-5" />,
  Edit: <Edit3 className="h-5 w-5" />,
};

export interface ApprovalCardProps {
  approvalId: string;
  isFocused?: boolean;
  onViewSession?: () => void;
  className?: string;
}

const ApprovalCardContent = forwardRef<
  HTMLDivElement,
  {
    isFocused?: boolean;
    onViewSession?: () => void;
    className?: string;
  }
>(({ isFocused = false, onViewSession, className }, ref) => {
  const state = useApprovalState((s) => s);
  const [elapsed, setElapsed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Timer - must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!state) return;
    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - new Date(state.createdAt).getTime()) / 1000,
      );
      setElapsed(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.createdAt, state]);

  // If approval was resolved/removed, don't render
  if (!state) {
    return null;
  }

  const toolName = state.toolName;
  const riskLevel = toolRiskLevels[toolName] || "medium";
  const risk = riskConfig[riskLevel];
  const toolIcon = toolIcons[toolName] || <Terminal className="h-5 w-5" />;

  const formatElapsed = () => {
    if (elapsed < 60) return `${elapsed}s`;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}m ${secs}s`;
  };

  const formatInput = () => {
    const input = state.toolInput as Record<string, unknown>;
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
    const input = state.toolInput as Record<string, unknown>;
    switch (toolName) {
      case "Bash":
        return `Execute: ${String(input["command"] || "").slice(0, 60)}`;
      case "Read":
        return `Read: ${String(input["path"])}`;
      case "Write":
        return `Write: ${String(input["path"])}`;
      case "Edit":
        return `Edit: ${String(input["path"] || input["file_path"])}`;
      case "Glob":
        return `Find: ${String(input["pattern"])}`;
      case "Grep":
        return `Search: ${String(input["pattern"] || input["query"])}`;
      default:
        return `Execute ${toolName}`;
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-xl border-2 shadow-lg transition-all",
        risk.bgColor,
        isFocused ? risk.focusBorderColor : risk.borderColor,
        isFocused && "ring-2 ring-offset-2",
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
              {isFocused && (
                <Badge variant="outline" className="ml-2">
                  Focused
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-muted-foreground text-sm">
              {getActionPreview()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onViewSession && (
            <button
              type="button"
              onClick={onViewSession}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Session
            </button>
          )}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatElapsed()}</span>
          </div>
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
            Press{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium">a</kbd>{" "}
            approve{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium">s</kbd>{" "}
            session{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium">d</kbd>{" "}
            deny
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
});

ApprovalCardContent.displayName = "ApprovalCardContent";

export const ApprovalCard = forwardRef<HTMLDivElement, ApprovalCardProps>(
  ({ approvalId, isFocused = false, onViewSession, className }, ref) => {
    const contentProps: {
      isFocused: boolean;
      onViewSession?: () => void;
      className?: string;
    } = { isFocused };
    if (onViewSession) contentProps.onViewSession = onViewSession;
    if (className) contentProps.className = className;

    return (
      <ApprovalErrorBoundary>
        <ApprovalPrimitive.Root approvalId={approvalId}>
          <ApprovalCardContent ref={ref} {...contentProps} />
        </ApprovalPrimitive.Root>
      </ApprovalErrorBoundary>
    );
  },
);

ApprovalCard.displayName = "ApprovalCard";

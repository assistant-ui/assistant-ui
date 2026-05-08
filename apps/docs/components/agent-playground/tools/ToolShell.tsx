import {
  AlertCircle,
  CheckCircle2,
  ChevronDownIcon,
  Loader2,
  PauseCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/agent-playground/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAutoOpenWhileBusy } from "@/components/agent-playground/lib/useAutoOpenWhileBusy";

export type ToolVisualStatus =
  | "running"
  | "waiting"
  | "done"
  | "error"
  | undefined;

const ANIMATION_DURATION = 200;

const toneClasses: Record<string, string> = {
  shell: "border-l-amber-500",
  file: "border-l-emerald-500",
  search: "border-l-sky-500",
  task: "border-l-fuchsia-500",
  default: "border-l-border",
};

export function getToolVisualStatus(
  statusType?: string,
  isError?: boolean,
  hasResult?: boolean,
): ToolVisualStatus {
  if (statusType === "running") return "running";
  if (statusType === "requires-action") return "waiting";
  if (isError) return "error";
  if (hasResult) return "done";
  return undefined;
}

function StatusBadge({ status }: { status?: ToolVisualStatus }) {
  if (status === "running") {
    return (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
        <span className="text-amber-300 text-xs">running</span>
      </>
    );
  }
  if (status === "done") {
    return (
      <>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-emerald-300 text-xs">done</span>
      </>
    );
  }
  if (status === "waiting") {
    return (
      <>
        <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-amber-300 text-xs">waiting</span>
      </>
    );
  }
  if (status === "error") {
    return (
      <>
        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        <span className="text-red-300 text-xs">error</span>
      </>
    );
  }
  return null;
}

export function ToolShell({
  title,
  icon,
  tone = "default",
  status,
  busy: busyProp,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone?: keyof typeof toneClasses | undefined;
  status?: ToolVisualStatus | undefined;
  /**
   * Override the busy signal that drives auto-expand. Defaults to
   * `status === 'running' || status === 'waiting'`. Pass an explicit value
   * when "busy" needs to extend beyond the visual status (e.g. result hasn't
   * arrived yet for a tool that doesn't surface a running status).
   */
  busy?: boolean | undefined;
  children: React.ReactNode;
}) {
  const busy = busyProp ?? (status === "running" || status === "waiting");
  const { open, onOpenChange } = useAutoOpenWhileBusy(busy);

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "overflow-hidden rounded-md border border-border/60 border-l-2 bg-muted/20",
        toneClasses[tone] ?? toneClasses.default,
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
    >
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60">
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-(--animation-duration) ease-out",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          <StatusBadge status={status} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "overflow-hidden text-sm outline-none",
          "group/collapsible-content ease-out",
          "data-[state=closed]:animate-collapsible-up",
          "data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
          "data-[state=open]:duration-(--animation-duration)",
          "data-[state=closed]:duration-(--animation-duration)",
        )}
      >
        <div className="border-border border-t px-3 py-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

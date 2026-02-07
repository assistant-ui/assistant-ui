"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@assistant-ui/react-agent";
import {
  Terminal,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  Users,
  UserCheck,
  ThumbsUp,
  ThumbsDown,
  Clock,
  DollarSign,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventStreamProps {
  events: AgentEvent[];
  className?: string;
  autoScroll?: boolean;
}

const eventConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  tool_call: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    label: "Tool Call",
    color: "text-blue-500",
  },
  tool_result: {
    icon: <Check className="h-3.5 w-3.5" />,
    label: "Tool Result",
    color: "text-green-500",
  },
  reasoning: {
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    label: "Thinking",
    color: "text-purple-500",
  },
  message: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: "Message",
    color: "text-foreground",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: "Error",
    color: "text-destructive",
  },
  task_started: {
    icon: <Play className="h-3.5 w-3.5" />,
    label: "Task Started",
    color: "text-green-500",
  },
  task_completed: {
    icon: <Square className="h-3.5 w-3.5" />,
    label: "Task Completed",
    color: "text-green-600",
  },
  agent_spawned: {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Agent Spawned",
    color: "text-blue-500",
  },
  agent_completed: {
    icon: <UserCheck className="h-3.5 w-3.5" />,
    label: "Agent Completed",
    color: "text-blue-600",
  },
  tool_approved: {
    icon: <ThumbsUp className="h-3.5 w-3.5" />,
    label: "Tool Approved",
    color: "text-green-500",
  },
  tool_denied: {
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
    label: "Tool Denied",
    color: "text-red-500",
  },
  tool_progress: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Tool Progress",
    color: "text-yellow-500",
  },
  cost_update: {
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: "Cost Update",
    color: "text-emerald-500",
  },
  system_init: {
    icon: <Settings className="h-3.5 w-3.5" />,
    label: "System Init",
    color: "text-gray-500",
  },
};

export function EventStream({
  events,
  className,
  autoScroll = true,
}: EventStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getEventContent = (event: AgentEvent) => {
    const content = event.content as Record<string, unknown>;
    switch (event.type) {
      case "tool_call":
        return {
          summary: `${content["toolName"]}()`,
          detail: JSON.stringify(content["toolInput"], null, 2),
        };
      case "tool_result": {
        const result = content["result"];
        const resultString =
          typeof result === "object"
            ? JSON.stringify(result, null, 2)
            : String(result || "");
        return {
          summary:
            resultString.slice(0, 80) + (resultString.length > 80 ? "..." : ""),
          detail: resultString,
        };
      }
      case "reasoning": {
        const text = String(content["text"] || "");
        return {
          summary: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
          detail: text,
        };
      }
      case "message": {
        const msg = String(content["text"] || "");
        return {
          summary: msg.slice(0, 100) + (msg.length > 100 ? "..." : ""),
          detail: msg,
        };
      }
      case "error":
        return {
          summary: String(content["message"]),
          detail: JSON.stringify(content, null, 2),
        };
      case "task_started": {
        const prompt = String(content["prompt"] || "");
        return {
          summary: prompt.slice(0, 80) + (prompt.length > 80 ? "..." : ""),
          detail: prompt,
        };
      }
      case "task_completed":
        return {
          summary: content["totalCost"]
            ? `Total cost: $${content["totalCost"]}`
            : "Completed",
          detail: JSON.stringify(content, null, 2),
        };
      case "agent_spawned":
        return {
          summary: `${content["name"]}${content["parentAgentId"] ? " (sub-agent)" : ""}`,
          detail: JSON.stringify(content, null, 2),
        };
      case "agent_completed":
        return {
          summary: content["summary"]
            ? String(content["summary"]).slice(0, 80)
            : "Completed",
          detail: JSON.stringify(content, null, 2),
        };
      case "tool_approved":
        return {
          summary: `Approval ${content["approvalId"]}`,
          detail: JSON.stringify(content, null, 2),
        };
      case "tool_denied":
        return {
          summary: `Denied ${content["approvalId"]}`,
          detail: JSON.stringify(content, null, 2),
        };
      case "tool_progress":
        return {
          summary: `${content["toolName"]} - ${content["elapsedSeconds"]}s`,
          detail: JSON.stringify(content, null, 2),
        };
      case "cost_update":
        return {
          summary: content["totalCost"]
            ? `Total: $${content["totalCost"]}`
            : `$${content["cost"]}`,
          detail: JSON.stringify(content, null, 2),
        };
      case "system_init": {
        const tools = content["tools"] as string[] | undefined;
        return {
          summary: tools ? `${tools.length} tools available` : "Initialized",
          detail: JSON.stringify(content, null, 2),
        };
      }
      default:
        return {
          summary: JSON.stringify(content).slice(0, 80),
          detail: JSON.stringify(content, null, 2),
        };
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-y-auto rounded-lg border border-border bg-card",
        className,
      )}
    >
      {events.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
          Waiting for events...
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((event) => {
            const config = eventConfig[event.type] ?? eventConfig["message"]!;
            const { summary, detail } = getEventContent(event);
            const isExpanded = expandedEvents.has(event.id);
            const hasDetail = detail.length > summary.length;

            return (
              <div
                key={event.id}
                className={cn(
                  "group transition-colors hover:bg-muted/50",
                  event.type === "reasoning" && "bg-purple-500/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => hasDetail && toggleExpand(event.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                  disabled={!hasDetail}
                >
                  <span className="shrink-0 pt-0.5 font-mono text-muted-foreground text-xs">
                    {formatTime(event.timestamp)}
                  </span>
                  <span className={cn("shrink-0 pt-0.5", config.color)}>
                    {config.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 font-medium text-xs",
                          config.color,
                        )}
                      >
                        {config.label}
                      </span>
                      {event.type === "tool_call" && (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {(event.content as any).toolName}
                        </code>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {summary}
                    </p>
                  </div>
                  {hasDetail && (
                    <span className="shrink-0 pt-0.5 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </button>
                {isExpanded && hasDetail && (
                  <div className="border-border border-t bg-muted/30 px-3 py-2">
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-muted-foreground text-xs">
                      {detail}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

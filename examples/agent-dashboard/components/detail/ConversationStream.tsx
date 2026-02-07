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
import { ToolWidget } from "@/components/tools/ToolWidget";

export interface ConversationStreamProps {
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

export function ConversationStream({
  events,
  className,
  autoScroll = true,
}: ConversationStreamProps) {
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

  // Group tool_call with its corresponding tool_result
  type GroupedEvent =
    | {
        type: "tool_execution";
        callEvent: AgentEvent;
        resultEvent: AgentEvent | undefined;
        toolName: string;
        toolInput: unknown;
      }
    | { type: "single"; event: AgentEvent };

  const groupedEvents = events.reduce<GroupedEvent[]>((groups, event) => {
    // Skip tool_result events - they'll be included with their tool_call
    if (event.type === "tool_result") {
      return groups;
    }

    if (event.type === "tool_call") {
      const content = event.content as {
        toolCallId: string;
        toolName: string;
        toolInput: unknown;
      };
      // Find matching result
      const resultEvent = events.find(
        (e) =>
          e.type === "tool_result" &&
          (e.content as { toolCallId: string }).toolCallId ===
            content.toolCallId,
      );
      groups.push({
        type: "tool_execution",
        callEvent: event,
        resultEvent,
        toolName: content.toolName,
        toolInput: content.toolInput,
      });
    } else {
      groups.push({ type: "single", event });
    }

    return groups;
  }, []);

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
          {groupedEvents.map((group) => {
            if (group.type === "tool_execution") {
              const { callEvent, resultEvent, toolName, toolInput } = group;
              const result = resultEvent
                ? (resultEvent.content as {
                    result: unknown;
                    isError?: boolean;
                  })
                : undefined;

              return (
                <ToolWidget
                  key={callEvent.id}
                  toolName={toolName}
                  input={toolInput}
                  output={result?.result}
                  isError={result?.isError ?? false}
                  isRunning={!resultEvent}
                  timestamp={callEvent.timestamp}
                />
              );
            }

            const { event } = group;
            const config = eventConfig[event.type] ?? eventConfig["message"]!;
            const content = event.content as Record<string, unknown>;
            const isExpanded = expandedEvents.has(event.id);

            // Get summary and detail
            let summary = "";
            let detail = "";
            switch (event.type) {
              case "reasoning": {
                const text = String(content["text"] || "");
                summary = text.slice(0, 100) + (text.length > 100 ? "..." : "");
                detail = text;
                break;
              }
              case "message": {
                const msg = String(content["text"] || "");
                summary = msg.slice(0, 100) + (msg.length > 100 ? "..." : "");
                detail = msg;
                break;
              }
              case "task_started": {
                const prompt = String(content["prompt"] || "");
                summary =
                  prompt.slice(0, 80) + (prompt.length > 80 ? "..." : "");
                detail = prompt;
                break;
              }
              case "agent_spawned":
                summary = `${content["name"]}${content["parentAgentId"] ? " (sub-agent)" : ""}`;
                detail = JSON.stringify(content, null, 2);
                break;
              default:
                summary = JSON.stringify(content).slice(0, 80);
                detail = JSON.stringify(content, null, 2);
            }

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

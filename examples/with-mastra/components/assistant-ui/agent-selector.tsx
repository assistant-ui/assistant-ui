"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface Agent {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: string;
  onAgentChange?: (agentId: string) => void;
  className?: string;
}

/**
 * AgentSelector component for switching between Mastra agents.
 *
 * @example
 * ```tsx
 * import { ChefHat, Cloud } from "lucide-react";
 * import { AgentSelector } from "@/components/assistant-ui/agent-selector";
 *
 * const agents = [
 *   { id: "chef", name: "Chef Agent", icon: ChefHat, description: "Cooking assistance" },
 *   { id: "weather", name: "Weather Agent", icon: Cloud, description: "Weather info" }
 * ];
 *
 * <AgentSelector
 *   agents={agents}
 *   selectedAgent={selectedAgent}
 *   onAgentChange={setSelectedAgent}
 * />
 * ```
 */
export function AgentSelector({
  agents,
  selectedAgent,
  onAgentChange,
  className,
}: AgentSelectorProps) {
  return (
    <div className={cn("w-64 border-r border-border bg-muted/50 p-4", className)}>
      <h2 className="text-lg font-semibold mb-4">Select Agent</h2>
      <div className="space-y-2">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.id;

          return (
            <Button
              key={agent.id}
              variant={isSelected ? "default" : "ghost"}
              className="w-full justify-start h-auto p-3"
              onClick={() => onAgentChange?.(agent.id)}
              aria-pressed={isSelected}
              aria-label={`Select ${agent.name}`}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium truncate">{agent.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {agent.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

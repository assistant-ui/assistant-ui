"use client";

import { useTaskState } from "@assistant-ui/react-agent";
import { DollarSign, TrendingUp, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CostDashboardProps {
  className?: string;
}

export function CostDashboard({ className }: CostDashboardProps) {
  const totalCost = useTaskState((s) => s.cost);
  const agents = useTaskState((s) => s.agents);
  const createdAt = useTaskState((s) => s.createdAt);

  const agentCosts = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    cost: agent.cost,
    events: agent.events.length,
  }));

  const startTime = new Date(createdAt).getTime();
  const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
  const safeTotalCost = totalCost ?? 0;
  const costPerMinute = elapsed > 0 ? safeTotalCost / elapsed : 0;

  // Estimate tokens from cost (rough: $3/1M input, $15/1M output for Claude 3.5 Sonnet)
  const estimatedTokens = Math.round(safeTotalCost / 0.000003);

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="border-border border-b p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <DollarSign className="h-4 w-4 text-success" />
          Cost Dashboard
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {/* Total Cost */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground uppercase tracking-wider">
            <DollarSign className="h-3 w-3 shrink-0" />
            Total
          </div>
          <div className="mt-0.5 font-mono font-semibold text-lg">
            ${safeTotalCost.toFixed(4)}
          </div>
        </div>

        {/* Cost Rate */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-3 w-3 shrink-0" />
            $/Min
          </div>
          <div className="mt-0.5 font-mono font-semibold text-lg">
            ${costPerMinute.toFixed(4)}
          </div>
        </div>

        {/* Estimated Tokens */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground uppercase tracking-wider">
            <Cpu className="h-3 w-3 shrink-0" />
            Tokens
          </div>
          <div className="mt-0.5 font-mono font-semibold text-lg">
            {estimatedTokens.toLocaleString()}
          </div>
        </div>

        {/* Active Agents */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground uppercase tracking-wider">
            <Zap className="h-3 w-3 shrink-0" />
            Agents
          </div>
          <div className="mt-0.5 font-mono font-semibold text-lg">
            {agents.length}
          </div>
        </div>
      </div>

      {/* Per-Agent Breakdown */}
      {agentCosts.length > 0 && (
        <div className="border-border border-t p-4">
          <h4 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Per-Agent Breakdown
          </h4>
          <div className="space-y-2">
            {agentCosts.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{agent.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({agent.events} events)
                  </span>
                </div>
                <span className="font-mono text-sm">
                  ${agent.cost.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

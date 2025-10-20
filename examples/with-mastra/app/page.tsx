"use client";

import { useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { AgentSelector } from "@/components/assistant-ui/agent-selector";
import { MemoryStatus } from "@/components/assistant-ui/memory-status";
import { WorkflowControls } from "@/components/assistant-ui/workflow-controls";
import { useAgentContext } from "./MyRuntimeProvider";
import { ChefHat, Cloud } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  const { selectedAgent, setSelectedAgent } = useAgentContext();

  const agents = [
    {
      id: "chefAgent",
      name: "Chef Agent",
      icon: ChefHat,
      description: "Cooking and recipe assistance",
    },
    {
      id: "weatherAgent",
      name: "Weather Agent",
      icon: Cloud,
      description: "Weather information and forecasts",
    },
  ];

  // Mock workflow state for demonstration
  const [workflowStatus, setWorkflowStatus] = useState<
    "idle" | "running" | "paused" | "completed" | "error"
  >("idle");
  const [workflowProgress, setWorkflowProgress] = useState(0);

  const handleWorkflowStart = () => {
    setWorkflowStatus("running");
    setWorkflowProgress(0);
    // Simulate progress
    const interval = setInterval(() => {
      setWorkflowProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setWorkflowStatus("completed");
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleWorkflowReset = () => {
    setWorkflowStatus("idle");
    setWorkflowProgress(0);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Agent Control & Status */}
      <div className="w-64 border-r border-border bg-muted/30 p-4 space-y-4 overflow-y-auto">
        {/* Agent Selection */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Agent Selection
          </h2>
          <AgentSelector
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            className="w-full border-0 bg-transparent p-0"
          />
        </div>

        {/* Memory Status */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Memory System
          </h2>
          <MemoryStatus showStats={true} />
        </div>

        {/* Workflow Controls (Mock) */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Workflow Demo
          </h2>
          <WorkflowControls
            workflowId="demo-workflow"
            status={workflowStatus}
            progress={workflowProgress}
            showSteps={true}
            allowPause={false}
            steps={[
              { id: "1", name: "Initialize", status: workflowProgress > 0 ? "completed" : "pending" },
              { id: "2", name: "Process", status: workflowProgress > 50 ? "completed" : workflowProgress > 0 ? "running" : "pending" },
              { id: "3", name: "Finalize", status: workflowProgress === 100 ? "completed" : "pending" },
            ]}
            onStart={handleWorkflowStart}
            onReset={handleWorkflowReset}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4 bg-background">
          <h1 className="text-xl font-semibold">
            {agents.find((a) => a.id === selectedAgent)?.name || "Mastra Agent"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.find((a) => a.id === selectedAgent)?.description}
          </p>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </div>
  );
}

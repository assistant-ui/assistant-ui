"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AgentSelector } from "@/components/assistant-ui/agent-selector";
import { MemoryStatus } from "@/components/assistant-ui/memory-status";
import { CandidateForm } from "@/components/assistant-ui/candidate-form";
import { WorkflowStatus } from "@/components/assistant-ui/workflow-status";
import { useAgentContext, useWorkflowContext } from "./MyRuntimeProvider";
import { UserCheck, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  const { selectedAgent, setSelectedAgent } = useAgentContext();
  const {
    workflowState,
    startWorkflow,
    resumeWorkflow,
    isStarting,
    isResuming,
  } = useWorkflowContext();

  const agents = [
    {
      id: "screeningAgent",
      name: "Screening Agent",
      icon: UserCheck,
      description: "Initial candidate screening and evaluation",
    },
    {
      id: "interviewAgent",
      name: "Interview Agent",
      icon: MessageSquare,
      description: "Technical and behavioral interviews",
    },
  ];

  const handleCandidateSubmit = async (candidateData: any) => {
    await startWorkflow(candidateData);
  };

  const handleResume = async (resumeData: any) => {
    await resumeWorkflow(resumeData);
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

        {/* Hiring Workflow */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hiring Workflow
          </h2>
          {!workflowState && (
            <CandidateForm onSubmit={handleCandidateSubmit} isLoading={isStarting} />
          )}
          {workflowState && (
            <WorkflowStatus
              status={workflowState.status as any}
              currentStep={workflowState.current}
              suspendData={(workflowState as any).suspendData}
              onResume={handleResume}
              isResuming={isResuming}
            />
          )}
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
          <Thread selectedAgent={selectedAgent} />
        </div>
      </div>
    </div>
  );
}

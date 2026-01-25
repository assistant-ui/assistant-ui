"use client";

import { useState, useEffect } from "react";
import {
  AgentWorkspaceProvider,
  useAgentWorkspace,
  useWorkspaceTasks,
} from "@assistant-ui/react-agent";
import {
  Plus,
  Activity,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Github,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskListCompact } from "@/components/TaskListCompact";
import { TaskDetailView } from "@/components/TaskDetailView";
import { DemoPresets } from "@/components/DemoPresets";

function Dashboard() {
  const workspace = useAgentWorkspace();
  const tasks = useWorkspaceTasks();
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPresets, setShowPresets] = useState(true);

  // Auto-select new tasks
  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      const latestRunning = tasks.find(
        (t) => t.getState().status === "running",
      );
      if (latestRunning) {
        setSelectedTaskId(latestRunning.id);
      } else {
        const firstTask = tasks[0];
        if (firstTask) {
          setSelectedTaskId(firstTask.id);
        }
      }
    }
  }, [tasks, selectedTaskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isCreating) return;

    setIsCreating(true);
    setShowPresets(false);
    try {
      const task = await workspace.createTask(prompt);
      setSelectedTaskId(task.id);
      setPrompt("");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePresetSelect = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  const totalPendingApprovals = tasks.reduce(
    (acc, t) =>
      acc +
      t.getState().pendingApprovals.filter((a) => a.status === "pending")
        .length,
    0,
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-border border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-2">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Agent UI</h1>
              <p className="text-muted-foreground text-xs">
                Powered by Claude Agent SDK
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {totalPendingApprovals > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-warning">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
              </span>
              <span className="font-medium text-sm">
                {totalPendingApprovals} approval
                {totalPendingApprovals > 1 ? "s" : ""} pending
              </span>
            </div>
          )}

          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-border border-r bg-card transition-all",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-80",
          )}
        >
          {/* Task Input */}
          <div className="shrink-0 border-border border-b p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a task for the agent..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  ⌘ + Enter to submit
                </span>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isCreating}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {isCreating ? "Creating..." : "Launch"}
                </button>
              </div>
            </form>
          </div>

          {/* Task List */}
          <div className="min-h-0 flex-1 overflow-auto">
            <TaskListCompact
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              className="p-2"
            />
          </div>
        </aside>

        {/* Sidebar Toggle */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="shrink-0 border-border border-r bg-muted/30 px-1 transition-colors hover:bg-muted"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Main Panel */}
        <main className="min-w-0 flex-1">
          {selectedTaskId ? (
            <TaskDetailView
              key={selectedTaskId}
              taskId={selectedTaskId}
              className="h-full"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="max-w-2xl">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Sparkles className="h-8 w-8 text-purple-500" />
                  </div>
                  <h2 className="mb-2 font-bold text-2xl">
                    Welcome to Agent UI
                  </h2>
                  <p className="text-muted-foreground">
                    A showcase of the Anthropic Agents SDK integrated with
                    assistant-ui primitives. Launch a task to see it in action!
                  </p>
                </div>

                {showPresets && (
                  <DemoPresets
                    onSelect={handlePresetSelect}
                    className="fade-in slide-in-from-bottom-4 animate-in duration-500"
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AgentWorkspaceProvider apiKey="demo-key">
      <Dashboard />
    </AgentWorkspaceProvider>
  );
}

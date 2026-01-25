"use client";

import {
  FileText,
  Terminal,
  Search,
  Code2,
  FolderTree,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DemoPresetsProps {
  onSelect: (prompt: string) => void;
  className?: string;
}

const presets = [
  {
    id: "list-files",
    icon: <FolderTree className="h-4 w-4" />,
    title: "List Files",
    description: "Simple tool use - lists current directory",
    prompt: "List all files in the current directory using the Bash tool.",
    features: ["Tool Use", "Quick"],
  },
  {
    id: "read-write",
    icon: <FileText className="h-4 w-4" />,
    title: "Read & Write File",
    description: "Multi-step with approval flow",
    prompt:
      "Create a file called 'hello.txt' with the content 'Hello from Claude!', then read it back and tell me what it contains.",
    features: ["Approval Flow", "Multi-step"],
  },
  {
    id: "code-review",
    icon: <Code2 className="h-4 w-4" />,
    title: "Code Analysis",
    description: "Reasoning-heavy task",
    prompt:
      "Find any TypeScript files in the current directory, read one of them, and provide a brief code review with suggestions for improvement.",
    features: ["Reasoning", "Analysis"],
  },
  {
    id: "search-grep",
    icon: <Search className="h-4 w-4" />,
    title: "Search & Summarize",
    description: "Uses multiple tools",
    prompt:
      "Search for any TODO comments in the codebase using grep, then summarize what needs to be done.",
    features: ["Multi-tool", "Summary"],
  },
  {
    id: "shell-command",
    icon: <Terminal className="h-4 w-4" />,
    title: "System Info",
    description: "High-risk Bash commands",
    prompt:
      "Tell me about this system - what OS is it running, how much disk space is free, and what's the current memory usage?",
    features: ["High Risk", "Bash"],
  },
  {
    id: "creative",
    icon: <Sparkles className="h-4 w-4" />,
    title: "Creative Task",
    description: "Extended thinking showcase",
    prompt:
      "Think step by step about how you would design a simple TODO app. Write out your reasoning, then create a basic implementation plan in a markdown file called 'todo-plan.md'.",
    features: ["Extended Thinking", "Planning"],
  },
];

export function DemoPresets({ onSelect, className }: DemoPresetsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-medium text-muted-foreground text-sm">
        Quick Start - Demo Scenarios
      </h3>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.prompt)}
            className="group rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-muted-foreground transition-colors group-hover:text-primary">
                {preset.icon}
              </span>
              <span className="font-medium text-sm">{preset.title}</span>
            </div>
            <p className="mb-2 text-muted-foreground text-xs">
              {preset.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {preset.features.map((feature) => (
                <span
                  key={feature}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    feature === "High Risk"
                      ? "bg-destructive/10 text-destructive"
                      : feature === "Extended Thinking" ||
                          feature === "Reasoning"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {feature}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

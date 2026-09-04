"use client";

import { useAssistantInstructions } from "@assistant-ui/react";
import { QuoteIcon, SparklesIcon, TableIcon, WorkflowIcon } from "lucide-react";

// A directive is a formatting instruction the model reads in the sent message,
// so a command needs no side effect and no route support beyond the line below.
export const HOME_COMMANDS = [
  {
    id: "diagram",
    type: "command",
    label: "/diagram",
    description: "Answer with a mermaid diagram",
    icon: "diagram",
  },
  {
    id: "table",
    type: "command",
    label: "/table",
    description: "Answer as a markdown table",
    icon: "table",
  },
  {
    id: "cite",
    type: "command",
    label: "/cite",
    description: "Cite the documentation pages used",
    icon: "cite",
  },
  {
    id: "simple",
    type: "command",
    label: "/simple",
    description: "Explain it plainly, without jargon",
    icon: "simple",
  },
] as const;

export const COMMAND_ICONS = {
  diagram: WorkflowIcon,
  table: TableIcon,
  cite: QuoteIcon,
  simple: SparklesIcon,
};

const COMMAND_INSTRUCTION = [
  "A user message may carry a command chip written as :command[/name]{name=name}. Treat it as an instruction about the shape of your answer and never repeat the syntax back.",
  ...HOME_COMMANDS.map((command) => `- /${command.id}: ${command.description}`),
].join("\n");

export function CommandInstructions(): null {
  useAssistantInstructions(COMMAND_INSTRUCTION);
  return null;
}

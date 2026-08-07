"use client";

import { useState } from "react";
import {
  BookOpenIcon,
  GitBranchIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { Composer, type ComposerCommand } from "@/components/elements/composer";

const COMMANDS: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
  { name: "branch", description: "Start a new branch", icon: GitBranchIcon },
  { name: "improve", description: "Suggest improvements", icon: SparklesIcon },
];

export function ComposerSlashDemo() {
  const [value, setValue] = useState("/");

  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-44" />
      <Composer
        value={value}
        onValueChange={setValue}
        onSend={() => setValue("")}
        placeholder="Type / for commands"
        commands={COMMANDS}
      />
    </div>
  );
}

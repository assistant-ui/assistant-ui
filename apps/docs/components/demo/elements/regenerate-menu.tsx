"use client";

import { useState } from "react";
import {
  RegenerateMenu,
  type RegenerateOption,
} from "@/components/assistant-ui/elements/regenerate-menu";

const OPTIONS: readonly RegenerateOption[] = [
  { id: "opus", label: "Try again with Opus 5", detail: "slower" },
  { id: "sonnet", label: "Try again with Sonnet 5", detail: "balanced" },
  { id: "haiku", label: "Try again with Haiku 4.5", detail: "fastest" },
];

export function RegenerateMenuDemo() {
  const [open, setOpen] = useState(true);

  return (
    <RegenerateMenu
      options={OPTIONS}
      open={open}
      currentId="sonnet"
      onOpenChange={setOpen}
      onPick={() => setOpen(false)}
    />
  );
}

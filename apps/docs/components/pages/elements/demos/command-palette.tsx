"use client";

import { useState } from "react";
import {
  CommandPalette,
  type PaletteCommand,
} from "@/components/elements/command-palette";

const COMMANDS: readonly PaletteCommand[] = [
  { id: "new", label: "New thread", group: "Thread", keys: ["⌘", "N"] },
  { id: "search", label: "Search threads", group: "Thread", keys: ["⌘", "K"] },
  {
    id: "share",
    label: "Share conversation",
    group: "Thread",
    keys: ["⌘", "S"],
  },
  { id: "model", label: "Switch model", group: "Session", keys: ["⌘", "M"] },
  { id: "stop", label: "Stop the run", group: "Session", keys: ["esc"] },
];

export function CommandPaletteDemo() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("new");

  return (
    <CommandPalette
      commands={COMMANDS}
      query={query}
      activeId={activeId}
      onQueryChange={setQuery}
      onActiveChange={setActiveId}
      onRun={setActiveId}
    />
  );
}

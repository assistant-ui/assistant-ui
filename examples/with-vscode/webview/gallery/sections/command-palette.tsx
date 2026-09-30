import { useState } from "react";
import {
  CommandPalette,
  type PaletteCommand,
} from "@assistant-ui/ui/components/assistant-ui/elements/command-palette.tsx";
import { defineSections } from "../types";

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

function CommandPaletteExample({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeId, setActiveId] = useState(initialQuery ? "share" : "new");
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

export default defineSections([
  {
    id: "command-palette",
    title: "Command palette",
    category: "chat",
    notes:
      "command-palette.tsx (standalone) renders open, inline: grouped commands with key hints.",
    render: () => <CommandPaletteExample />,
  },
  {
    id: "command-palette-filtered",
    title: "Command palette (filtered)",
    category: "chat",
    notes: 'Query "sh".',
    render: () => <CommandPaletteExample initialQuery="sh" />,
  },
]);

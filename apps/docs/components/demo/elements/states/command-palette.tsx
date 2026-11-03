"use client";

import {
  CommandPalette,
  type PaletteCommand,
} from "@/components/assistant-ui/elements/command-palette";
import { defineStates } from "./types";

const noop = () => {};

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

const MORE_COMMANDS: readonly PaletteCommand[] = [
  ...COMMANDS,
  { id: "rename", label: "Rename thread", group: "Thread", keys: ["⌘", "R"] },
  { id: "archive", label: "Archive thread", group: "Thread", keys: ["⌘", "E"] },
  {
    id: "export",
    label: "Export conversation as Markdown with attachments",
    group: "Thread",
    keys: ["⌘", "⇧", "E"],
  },
  {
    id: "retry",
    label: "Retry last message",
    group: "Session",
    keys: ["⌘", "↵"],
  },
  {
    id: "effort",
    label: "Change reasoning effort",
    group: "Session",
    keys: [],
  },
  {
    id: "theme",
    label: "Toggle dark mode",
    group: "App",
    keys: ["⌘", "⇧", "L"],
  },
  { id: "settings", label: "Open settings", group: "App", keys: ["⌘", ","] },
  { id: "shortcuts", label: "Keyboard shortcuts", group: "App", keys: ["?"] },
];

const handlers = { onQueryChange: noop, onActiveChange: noop, onRun: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filtered",
    label: "Filtered",
    note: "A query keeps only matching commands, still grouped.",
    Component: () => (
      <CommandPalette
        commands={COMMANDS}
        query="thread"
        activeId="search"
        {...handlers}
      />
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "Nothing matches the query, so the list says so.",
    Component: () => (
      <CommandPalette
        commands={COMMANDS}
        query="deploy to staging"
        activeId="new"
        {...handlers}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long list",
    note: "More commands than fit scroll inside the list, and long labels truncate.",
    Component: () => (
      <CommandPalette
        commands={MORE_COMMANDS}
        query=""
        activeId="export"
        {...handlers}
      />
    ),
  },
]);

"use client";

export const threadCommands = [
  { id: "new", label: "New thread", shortcut: "Alt ⇧ O" },
  { id: "previous", label: "Previous thread", shortcut: "Alt ↑" },
  { id: "next", label: "Next thread", shortcut: "Alt ↓" },
  { id: "rename", label: "Rename thread", shortcut: "Alt ⇧ R" },
  { id: "archive", label: "Archive / restore", shortcut: "Alt ⇧ X" },
  { id: "pin", label: "Pin / unpin", shortcut: "Alt ⇧ P" },
  { id: "sidebar", label: "Toggle threads", shortcut: "Alt ⇧ H" },
  { id: "composer", label: "Focus message", shortcut: "Alt ⇧ C" },
] as const;

export type ThreadCommand = (typeof threadCommands)[number]["id"];

export function getThreadShortcut(
  event: KeyboardEvent,
): ThreadCommand | undefined {
  if (event.defaultPrevented || event.isComposing || event.repeat) return;
  if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey)
    return (
      {
        KeyO: "new",
        KeyR: "rename",
        KeyX: "archive",
        KeyH: "sidebar",
        KeyP: "pin",
        KeyC: "composer",
      } as Record<string, ThreadCommand | undefined>
    )[event.code];
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    if (event.key === "ArrowUp") return "previous";
    if (event.key === "ArrowDown") return "next";
  }
  return undefined;
}

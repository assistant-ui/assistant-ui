"use client";

export const threadCommands = [
  { id: "new", label: "New thread", shortcut: "⌘/Ctrl ⇧ O" },
  { id: "previous", label: "Previous thread", shortcut: "Alt ↑" },
  { id: "next", label: "Next thread", shortcut: "Alt ↓" },
  { id: "rename", label: "Rename thread", shortcut: "⌘/Ctrl ⇧ R" },
  { id: "archive", label: "Archive / restore", shortcut: "⌘/Ctrl ⇧ A" },
  { id: "pin", label: "Pin / unpin", shortcut: "⌘/Ctrl ⇧ P" },
  { id: "sidebar", label: "Toggle threads", shortcut: "⌘/Ctrl ⇧ B" },
  { id: "composer", label: "Focus message", shortcut: "Shift Esc" },
] as const;

export type ThreadCommand = (typeof threadCommands)[number]["id"];

export function getThreadShortcut(
  event: KeyboardEvent,
): ThreadCommand | undefined {
  if (event.defaultPrevented || event.isComposing || event.repeat) return;
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    if (event.key === "ArrowUp") return "previous";
    if (event.key === "ArrowDown") return "next";
  }
  if (!event.altKey && (event.metaKey || event.ctrlKey) && event.shiftKey) {
    return (
      { o: "new", r: "rename", a: "archive", p: "pin", b: "sidebar" } as Record<
        string,
        ThreadCommand | undefined
      >
    )[event.key.toLowerCase()];
  }
  if (
    !event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    event.shiftKey &&
    event.key === "Escape"
  )
    return "composer";
  return undefined;
}

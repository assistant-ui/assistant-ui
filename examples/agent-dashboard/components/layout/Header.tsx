"use client";

import {
  useState,
  useRef,
  useImperativeHandle,
  type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TaskLauncherPrimitive,
  ApprovalQueuePrimitive,
  useTaskLauncher,
} from "@assistant-ui/react-agent";

export interface HeaderHandle {
  focusSearch: () => void;
  openNewSession: () => void;
}

export interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNewSession?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

function NewSessionLauncher({ onCancel }: { onCancel: () => void }) {
  const { submit } = useTaskLauncher();

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <>
      <TaskLauncherPrimitive.Input
        placeholder="What would you like the agent to do?"
        onKeyDown={handleInputKeyDown}
        className="min-h-24 w-full resize-none rounded-lg border border-input bg-background p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-4 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Press{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5">Cmd + Enter</kbd> to
          submit
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <TaskLauncherPrimitive.Submit className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90">
            Create Session
          </TaskLauncherPrimitive.Submit>
        </div>
      </div>
    </>
  );
}

export const Header = function Header({
  title = "Sessions",
  showSearch = true,
  showNewSession = true,
  onSearch,
  searchPlaceholder = "Search sessions... (press /)",
  ref,
}: HeaderProps & { ref?: RefObject<HeaderHandle | null> }) {
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      focusSearch: () => {
        searchInputRef.current?.focus();
      },
      openNewSession: () => {
        setIsNewSessionOpen(true);
      },
    }),
    [],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <header className="flex h-14 items-center justify-between border-border border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearch}
              className="h-9 w-64 rounded-lg border border-input bg-background pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  onSearch?.("");
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Notifications */}
        <ApprovalQueuePrimitive.Root filter={{ status: "pending" }}>
          <ApprovalQueuePrimitive.Count>
            {(count) => (
              <button
                type="button"
                onClick={() => router.push("/inbox")}
                className={cn(
                  "relative rounded-lg p-2 transition-colors",
                  count > 0
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:bg-muted",
                )}
                title={
                  count > 0
                    ? `${count} pending approval(s)`
                    : "No pending approvals"
                }
              >
                <Bell className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground">
                    {count}
                  </span>
                )}
              </button>
            )}
          </ApprovalQueuePrimitive.Count>
        </ApprovalQueuePrimitive.Root>

        {/* New Session Button */}
        {showNewSession && (
          <button
            type="button"
            onClick={() => setIsNewSessionOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        )}
      </div>

      {/* New Session Modal */}
      {isNewSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-border border-b px-6 py-4">
              <h2 className="font-semibold text-lg">Create New Session</h2>
              <button
                type="button"
                onClick={() => setIsNewSessionOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <TaskLauncherPrimitive.Root
                onSubmit={(taskId: string) => {
                  setIsNewSessionOpen(false);
                  router.push(`/sessions/${taskId}`);
                }}
              >
                <NewSessionLauncher
                  onCancel={() => setIsNewSessionOpen(false)}
                />
              </TaskLauncherPrimitive.Root>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

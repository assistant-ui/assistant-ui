"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWorkspaceTasks,
  ApprovalQueuePrimitive,
} from "@assistant-ui/react-agent";
import { Badge } from "@/components/ui/badge";

const navigation = [
  {
    name: "Sessions",
    href: "/sessions",
    icon: LayoutDashboard,
    description: "View all agent sessions",
  },
  {
    name: "Inbox",
    href: "/inbox",
    icon: Inbox,
    description: "Pending approvals",
    showBadge: true,
  },
];

function PendingApprovalsBadge() {
  return (
    <ApprovalQueuePrimitive.Root filter={{ status: "pending" }}>
      <ApprovalQueuePrimitive.Count>
        {(count) =>
          count > 0 ? (
            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5">
              {count}
            </Badge>
          ) : null
        }
      </ApprovalQueuePrimitive.Count>
    </ApprovalQueuePrimitive.Root>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const tasks = useWorkspaceTasks();

  const activeTasks = tasks.filter((t) => {
    const state = t.getState();
    return ["starting", "running", "waiting_input"].includes(state.status);
  });

  return (
    <aside className="flex h-full w-64 flex-col border-sidebar-border border-r bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-sidebar-border border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="font-bold text-primary-foreground text-sm">A</span>
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground text-sm">
            Agent Dashboard
          </h1>
          <p className="text-muted-foreground text-xs">Supervision Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.showBadge && <PendingApprovalsBadge />}
            </Link>
          );
        })}
      </nav>

      {/* Active Sessions */}
      {activeTasks.length > 0 && (
        <div className="border-sidebar-border border-t p-3">
          <h3 className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Active Sessions
          </h3>
          <div className="space-y-1">
            {activeTasks.slice(0, 5).map((task) => {
              const state = task.getState();
              return (
                <Link
                  key={task.id}
                  href={`/sessions/${task.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === `/sessions/${task.id}`
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-muted",
                  )}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{state.title}</span>
                </Link>
              );
            })}
            {activeTasks.length > 5 && (
              <p className="px-3 text-muted-foreground text-xs">
                +{activeTasks.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <div className="text-muted-foreground text-xs">
            <span className="font-medium">j/k</span> navigate •{" "}
            <span className="font-medium">Enter</span> open
          </div>
        </div>
      </div>
    </aside>
  );
}

import { ThreadListPrimitive } from "@assistant-ui/react";

export function ThreadList() {
  return (
    <ThreadListPrimitive.Root className="w-64 border-r bg-muted">
      <ThreadListPrimitive.Viewport className="flex-1 overflow-y-auto">
        <ThreadListPrimitive.Empty>
          <div className="p-4 text-center text-muted-foreground">
            No conversations yet
          </div>
        </ThreadListPrimitive.Empty>
        <ThreadListPrimitive.Items />
      </ThreadListPrimitive.Viewport>
    </ThreadListPrimitive.Root>
  );
}
import {
  ThreadList,
  ThreadListNew,
} from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S6/project/components/assistant-ui/elements/thread-list.aui";
import { ToolProvider } from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S5/project/components/tool-provider";
import { Thread } from "../components/assistant-ui/elements/thread.aui";

export default function Page() {
  return (
    <ToolProvider>
      <main className="flex h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--muted)]/30 p-3 md:block">
          <p className="px-2 py-3 text-sm font-semibold">Conversations</p>
          <ThreadList />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[var(--border)] p-2 md:hidden">
            <ThreadListNew />
          </div>
          <div className="min-h-0 flex-1">
            <Thread />
          </div>
        </section>
      </main>
    </ToolProvider>
  );
}

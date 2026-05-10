"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { TodosPanel } from "@/components/TodosPanel";

export default function Home() {
  return (
    <div className="flex h-dvh">
      <div className="flex-grow">
        <Thread />
      </div>
      <aside className="w-80 overflow-y-auto border-l p-4">
        <TodosPanel />
      </aside>
    </div>
  );
}

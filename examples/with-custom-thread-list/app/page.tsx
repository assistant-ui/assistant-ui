"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function Home() {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <div className="grid h-full grid-cols-[200px_1fr] gap-4 p-4">
        <div className="overflow-y-auto">
          <ThreadList />
        </div>
        <div className="overflow-hidden">
          <Thread />
        </div>
      </div>
    </main>
  );
}

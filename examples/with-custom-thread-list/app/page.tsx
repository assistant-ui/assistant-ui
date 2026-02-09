"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function Home() {
  return (
    <main className="grid h-dvh grid-cols-[200px_1fr] grid-rows-[minmax(0,1fr)] gap-4 p-4">
      <ThreadList />
      <Thread />
    </main>
  );
}

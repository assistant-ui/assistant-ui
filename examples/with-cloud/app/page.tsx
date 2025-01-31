"use client";

import { Thread, ThreadList } from "@assistant-ui/react-ui";

export default function Home() {
  return (
    <main className="grid h-full grid-cols-[200px,1fr] gap-4 p-4">
      <ThreadList />
      <Thread />
    </main>
  );
}

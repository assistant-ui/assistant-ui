"use client";

import { useState } from "react";
import {
  ThreadList,
  type ThreadItem,
} from "@/components/assistant-ui/elements/thread-list";

const THREADS: ThreadItem[] = [
  { title: "Draft persistence design", time: "2m" },
  { title: "Streaming tool arguments", time: "1h", unread: true },
  { title: "Migrate thread list to tap", time: "3h" },
  { title: "Fix scroll pinning race", time: "1d" },
];

export function ThreadListDemo() {
  const [threads, setThreads] = useState(THREADS);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <ThreadList
      threads={threads}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      onRename={(index) => {
        const currentTitle = threads[index]?.title;
        const title = window.prompt("Rename thread", currentTitle);
        if (!title?.trim()) return;
        setThreads((current) =>
          current.map((thread, i) =>
            i === index ? { ...thread, title: title.trim() } : thread,
          ),
        );
      }}
      onDelete={(index) => {
        setThreads((current) => current.filter((_, i) => i !== index));
        setActiveIndex((current) =>
          Math.max(0, current - Number(index <= current)),
        );
      }}
    />
  );
}

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
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <ThreadList
      threads={THREADS}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
    />
  );
}

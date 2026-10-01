import { useState } from "react";
import {
  ThreadList,
  type ThreadItem,
} from "@assistant-ui/ui/components/assistant-ui/elements/thread-list.tsx";
import { ThreadList as RuntimeThreadList } from "@assistant-ui/ui/components/assistant-ui/elements/thread-list.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime, type SeededThreadItem } from "../runtime";

const THREADS: ThreadItem[] = [
  { id: "drafts", title: "Draft persistence design", time: "2m" },
  {
    id: "tool-arguments",
    title: "Streaming tool arguments",
    time: "1h",
    unread: true,
  },
  { id: "tap-migration", title: "Migrate thread list to tap", time: "3h" },
  {
    id: "scroll-pinning",
    title: "Fix scroll pinning race when the viewport resizes mid-stream",
    time: "1d",
  },
];

function StandaloneThreadList() {
  const [threads, setThreads] = useState(THREADS);
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <ThreadList
      threads={threads}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      onRename={() => {}}
      onDelete={(index) => {
        setThreads((current) => current.filter((_, i) => i !== index));
        setActiveIndex((current) =>
          Math.max(0, current - Number(index <= current)),
        );
      }}
    />
  );
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

const SEEDED_THREADS: SeededThreadItem[] = [
  {
    id: "t-bridge",
    title: "Tunnel fetch over postMessage",
    lastMessageAt: hoursAgo(1),
  },
  {
    id: "t-theme",
    title: "Map shadcn tokens to --vscode-*",
    lastMessageAt: hoursAgo(3),
  },
  {
    id: "t-csp",
    title: "Why does zod trip the strict CSP in the webview bundle?",
    lastMessageAt: hoursAgo(30),
  },
  { id: "t-archived", title: "Old experiment", archived: true },
];

export default defineSections([
  {
    id: "thread-list",
    title: "Thread list (standalone)",
    category: "chat",
    notes: "Controlled rows: selection, rename and delete callbacks.",
    render: () => <StandaloneThreadList />,
  },
  {
    id: "thread-list-aui",
    title: "Thread list (runtime)",
    category: "chat",
    notes:
      "thread-list.aui.tsx over a remote thread list seeded with three threads and one archived.",
    render: () => (
      <SeededRuntime threads={SEEDED_THREADS}>
        <RuntimeThreadList />
      </SeededRuntime>
    ),
  },
]);

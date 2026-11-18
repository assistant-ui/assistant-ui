"use client";

import { ThreadListSample } from "@/components/pages/docs/samples/threadlist";
import { THREAD_LIST_FIXTURES, ThreadListRuntime } from "../states/thread-list";
import { DemoSurface } from "./surface";

export function AuiThreadListSidebarDemo() {
  return (
    <ThreadListRuntime threads={THREAD_LIST_FIXTURES.grouped}>
      <DemoSurface>
        <ThreadListSample />
      </DemoSurface>
    </ThreadListRuntime>
  );
}

"use client";

import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { THREAD_LIST_FIXTURES, ThreadListRuntime } from "../states/thread-list";
import { DemoSurface } from "./surface";

export function AuiThreadListDemo() {
  return (
    <ThreadListRuntime threads={THREAD_LIST_FIXTURES.grouped}>
      <DemoSurface>
        <div className="bg-background h-full w-full max-w-72 overflow-hidden rounded-2xl shadow-sm">
          <ThreadList />
        </div>
      </DemoSurface>
    </ThreadListRuntime>
  );
}

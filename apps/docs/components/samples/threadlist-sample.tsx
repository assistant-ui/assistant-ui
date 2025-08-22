"use client";
import { Thread } from "../assistant-ui/thread";
import { ThreadList } from "../assistant-ui/thread-list";
import { SampleFrame } from "./sample-frame";

export const ThreadListSample = () => {
  return (
    <SampleFrame sampleText="Sample ThreadList">
      <div className="grid h-full grid-cols-[200px_1fr]">
        <ThreadList />
        <Thread />
      </div>
    </SampleFrame>
  );
};

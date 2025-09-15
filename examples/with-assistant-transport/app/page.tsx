"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export default function Home() {
  return (
    <MyRuntimeProvider>
      <div className="h-full">
        <Thread />
      </div>
    </MyRuntimeProvider>
  );
}

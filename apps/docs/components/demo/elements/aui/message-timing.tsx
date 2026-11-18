"use client";

import { MessageTimingSample } from "@/components/pages/docs/samples/message-timing";
import { DemoSurface } from "./surface";

export function AuiMessageTimingDemo() {
  return (
    <DemoSurface>
      <MessageTimingSample />
    </DemoSurface>
  );
}

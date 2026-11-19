"use client";

import { ConversationMapThread } from "@/components/pages/docs/samples/conversation-map";
import { DemoSurface } from "./surface";

export function AuiConversationMapDemo() {
  return (
    <DemoSurface className="bg-muted/40">
      <div className="h-full w-full">
        <ConversationMapThread />
      </div>
    </DemoSurface>
  );
}

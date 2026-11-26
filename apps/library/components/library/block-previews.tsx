"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * The registry's blocks on its scripted demo runtime, keyed by name. Each
 * block's own page is wired to /api/chat, which the library doesn't have, so
 * the viewer renders the block's component here instead.
 */
const BLOCK_PREVIEWS: Record<string, ComponentType> = {
  chat: dynamic(async () => {
    const [{ Chat }, { DemoRuntimeProvider }] = await Promise.all([
      import("@/registry/blocks/chat/components/chat"),
      import("@/registry/shared/lib/demo-runtime"),
    ]);
    return function ChatPreview() {
      return (
        <DemoRuntimeProvider>
          <Chat autoFocus={false} />
        </DemoRuntimeProvider>
      );
    };
  }),
  "chat-sidebar": dynamic(async () => {
    const [{ ChatSidebar }, { Thread }, { DemoRuntimeProvider }] =
      await Promise.all([
        import("@/registry/shared/components/chat-sidebar"),
        import("@/components/assistant-ui/elements/thread.aui"),
        import("@/registry/shared/lib/demo-runtime"),
      ]);
    return function ChatSidebarPreview() {
      return (
        <DemoRuntimeProvider>
          <ChatSidebar>
            <Thread autoFocus={false} />
          </ChatSidebar>
        </DemoRuntimeProvider>
      );
    };
  }),
  base: dynamic(async () => {
    const [{ Base }, { DemoRuntimeProvider }] = await Promise.all([
      import("@/registry/blocks/base/components/base"),
      import("@/registry/shared/lib/demo-runtime"),
    ]);
    return function BasePreview() {
      return (
        <DemoRuntimeProvider>
          <Base />
        </DemoRuntimeProvider>
      );
    };
  }),
};

export function BlockPreview({ slug }: { slug: string }) {
  const Block = BLOCK_PREVIEWS[slug];
  return Block ? <Block /> : null;
}

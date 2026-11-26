"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * The registry's blocks on its scripted demo runtime, keyed by name. Each
 * block's own page is wired to /api/chat, which the library doesn't have, so
 * the viewer renders the block's component here instead.
 */
const BLOCK_PREVIEWS: Record<string, ComponentType> = {
  "chat-thread": dynamic(async () => {
    const [{ ChatThread }, { DemoRuntimeProvider }] = await Promise.all([
      import("@/registry/blocks/chat-thread/components/chat-thread"),
      import("@/registry/shared/lib/demo-runtime"),
    ]);
    return function ChatThreadPreview() {
      return (
        <DemoRuntimeProvider>
          <ChatThread autoFocus={false} />
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
  // React Native, through react-native-web, at a phone's width. It renders
  // on the client only, since react-native-web injects its styles there.
  "native-chat-thread": dynamic(
    async () => {
      const [{ NativeChatThread }, { NativeDemoRuntimeProvider }] =
        await Promise.all([
          import("@/registry/blocks/native-chat-thread/components/native-chat-thread"),
          import("@/registry/shared/lib/native-runtime-provider"),
        ]);
      return function NativeChatThreadPreview() {
        return (
          <div className="flex h-full justify-center">
            <div className="flex h-full w-full max-w-[420px] flex-col">
              <NativeDemoRuntimeProvider>
                <NativeChatThread />
              </NativeDemoRuntimeProvider>
            </div>
          </div>
        );
      };
    },
    { ssr: false },
  ),
};

export function BlockPreview({ slug }: { slug: string }) {
  const Block = BLOCK_PREVIEWS[slug];
  return Block ? <Block /> : null;
}

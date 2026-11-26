import type { RegistryItem } from "../../registry/src/schema";

/**
 * The library's blocks as `apps/registry/src/registry.ts` writes its items, so
 * each can move there as is when it is published. Nothing reads this yet; the
 * library reads `registry.json`, which lists the same blocks for shadcn.
 *
 * Each block follows shadcn's block layout: `page.tsx` first, installed as a
 * route, then its `components/`. `path` is where a file lands in a project and
 * `sourcePath` is where the registry build reads it, relative to
 * `apps/registry`. The build turns each dependency URL into its `/base/` twin
 * for the Base UI flavor.
 */
const blockPage = (
  name: string,
): NonNullable<RegistryItem["files"]>[number] => ({
  type: "registry:page",
  path: `app/${name}/page.tsx`,
  target: `app/${name}/page.tsx`,
  sourcePath: `../library/registry/blocks/${name}/page.tsx`,
});

/** The runtime files every block's page shares, installed into lib/. */
const sharedLib = (
  file: string,
): NonNullable<RegistryItem["files"]>[number] => ({
  type: "registry:lib",
  path: `lib/${file}`,
  sourcePath: `../library/registry/shared/lib/${file}`,
});

const SHARED_LIB = [
  sharedLib("runtime-provider.tsx"),
  sharedLib("demo-runtime.tsx"),
  sharedLib("demo-script.ts"),
  // The key that switches a block from demo replies to the real route.
  {
    type: "registry:file",
    path: ".env.example",
    target: "~/.env.example",
    sourcePath: "../library/registry/shared/.env.example",
  },
] satisfies NonNullable<RegistryItem["files"]>;

/** The shared chat sidebar layout, installed into components/. */
const CHAT_SIDEBAR = {
  type: "registry:component",
  path: "components/chat-sidebar.tsx",
  sourcePath: "../library/registry/shared/components/chat-sidebar.tsx",
} satisfies NonNullable<RegistryItem["files"]>[number];

const blockComponent = (
  name: string,
  file: string,
): NonNullable<RegistryItem["files"]>[number] => ({
  type: "registry:component",
  path: `components/${file}`,
  sourcePath: `../library/registry/blocks/${name}/components/${file}`,
});

export const blocks: RegistryItem[] = [
  {
    name: "chat-thread",
    type: "registry:block",
    title: "Chat thread",
    description:
      "A full-height chat: a header with a new-chat button over a thread built in the block from assistant-ui primitives and elements.",
    files: [
      blockPage("chat-thread"),
      blockComponent("chat-thread", "chat-thread.tsx"),
      ...SHARED_LIB,
    ],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/ai-sdk",
      "lucide-react",
    ],
    registryDependencies: [
      "button",
      "skeleton",
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/file.json",
      "https://r.assistant-ui.com/follow-up-suggestions.json",
      "https://r.assistant-ui.com/image.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/reasoning.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/tool-fallback.json",
      "https://r.assistant-ui.com/tool-group.json",
      "https://r.assistant-ui.com/utils.json",
    ],
  },

  {
    name: "chat-sidebar",
    type: "registry:block",
    title: "Chat sidebar",
    description:
      "A chat app with past conversations in a collapsible sidebar, a sheet on narrow screens.",
    files: [blockPage("chat-sidebar"), CHAT_SIDEBAR, ...SHARED_LIB],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/ai-sdk",
      "lucide-react",
      "react-resizable-panels",
    ],
    registryDependencies: [
      "resizable",
      "button",
      "sheet",
      "tooltip",
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/thread-list.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/utils.json",
    ],
  },
  {
    name: "base",
    type: "registry:block",
    title: "Base",
    description:
      "The full assistant-ui chat app, unthemed: thread list, attachments, mentions, slash commands, model picker, and voice input.",
    files: [
      blockPage("base"),
      blockComponent("base", "base.tsx"),
      CHAT_SIDEBAR,
      ...SHARED_LIB,
    ],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/react-lexical",
      "@assistant-ui/ai-sdk",
      "lucide-react",
      "react-resizable-panels",
    ],
    registryDependencies: [
      "resizable",
      "button",
      "sheet",
      "skeleton",
      "tooltip",
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/message-timing.json",
      "https://r.assistant-ui.com/tool-fallback.json",
      "https://r.assistant-ui.com/tool-group.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/reasoning.json",
      "https://r.assistant-ui.com/quote.json",
      "https://r.assistant-ui.com/composer-trigger-popover.json",
      "https://r.assistant-ui.com/directive-text.json",
      "https://r.assistant-ui.com/model-selector.json",
      "https://r.assistant-ui.com/thread-list.json",
      "https://r.assistant-ui.com/dot-matrix.json",
      "https://r.assistant-ui.com/utils.json",
    ],
  },
  {
    name: "chat-sidebar-layout",
    type: "registry:component",
    title: "Chat sidebar layout",
    description:
      "The collapsible conversations sidebar the chat blocks share. Put a thread, or anything else, in its main area.",
    files: [CHAT_SIDEBAR],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "react-resizable-panels",
    ],
    registryDependencies: [
      "resizable",
      "button",
      "sheet",
      "tooltip",
      "https://r.assistant-ui.com/thread-list.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/utils.json",
    ],
  },
  {
    name: "native-chat-thread",
    type: "registry:block",
    title: "Native chat thread",
    description:
      "A full-screen React Native chat for Expo: a header with a new-chat button over a thread built from the assistant-ui native primitives, styled with StyleSheet.",
    files: [
      // An Expo Router screen rather than a Next.js page.
      {
        type: "registry:page",
        path: "app/native-chat-thread/index.tsx",
        target: "app/native-chat-thread/index.tsx",
        sourcePath: "../library/registry/blocks/native-chat-thread/page.tsx",
      },
      blockComponent("native-chat-thread", "native-chat-thread.tsx"),
      sharedLib("demo-script.ts"),
      sharedLib("native-runtime-provider.tsx"),
      // The chat route that switches the block from demo replies to real ones.
      {
        type: "registry:file",
        path: ".env.example",
        target: "~/.env.example",
        sourcePath: "../library/registry/shared/native/.env.example",
      },
    ],
    dependencies: ["@assistant-ui/react-native", "@assistant-ui/ai-sdk"],
  },
];

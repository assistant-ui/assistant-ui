import {
  generativeUiThemeVars,
  generativeUiVocabularyCss,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css.ts";
import type { RegistryItem } from "./schema";

const collapsibleStateCss = {
  '@custom-variant data-open (&:where([data-state="open"], [data-open]:not([data-open="false"])))':
    {},
  '@custom-variant data-closed (&:where([data-state="closed"], [data-closed]:not([data-closed="false"])))':
    {},
  "@keyframes collapsible-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
  },
  "@keyframes collapsible-up": {
    from: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

const accordionKeyframesCss = {
  "@keyframes accordion-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
  },
  "@keyframes accordion-up": {
    from: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

export const registry: RegistryItem[] = [
  {
    name: "shimmer-style",
    type: "registry:style",
    title: "Shimmer Style",
    description:
      "Keyframes and theme variables for the streaming shimmer animation.",
    cssVars: {
      theme: {
        "--animate-shimmer":
          "shimmer-sweep var(--shimmer-duration, 1000ms) linear infinite both",
      },
    },
    css: {
      "@keyframes shimmer-sweep": {
        from: {
          "background-position": "150% 0",
        },
        to: {
          "background-position": "-100% 0",
        },
      },
    },
  },
  {
    name: "chat/b/ai-sdk-quick-start/json",
    type: "registry:page",
    title: "AI SDK Quick Start",
    description:
      "Assistant page wired to the AI SDK chat route, with the thread component installed.",
    files: [
      {
        type: "registry:page",
        path: "app/ai-sdk/assistant.tsx",
        target: "app/assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/thread.json",
    ],
    dependencies: ["@assistant-ui/react-ai-sdk"],
    meta: {
      importSpecifier: "Assistant",
      moduleSpecifier: "@/app/assistant",
      nextVersion: "15.1.6",
    },
  },
  {
    name: "ai-sdk-backend",
    type: "registry:page",
    title: "AI SDK Backend",
    description:
      "Next.js route handler that streams chat completions through the AI SDK.",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
    dependencies: ["ai", "@ai-sdk/openai", "@assistant-ui/react-ai-sdk"],
  },
  {
    name: "ai-sdk-backend-resumable",
    type: "registry:page",
    title: "AI SDK Resumable Backend",
    description:
      "AI SDK route handlers with resumable stream context, so a run survives a reload.",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        sourcePath: "templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
      {
        type: "registry:page",
        path: "app/api/chat/resume/[streamId]/route.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/app/api/chat/resume/[streamId]/route.ts",
        target: "app/api/chat/resume/[streamId]/route.ts",
      },
      {
        type: "registry:lib",
        path: "lib/resumable-context.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
        target: "lib/resumable-context.ts",
      },
    ],
    dependencies: [
      "ai",
      "@ai-sdk/openai",
      "@assistant-ui/react-ai-sdk",
      "assistant-stream",
      "next",
    ],
  },
  {
    name: "eve-chat",
    type: "registry:item",
    title: "Eve Chat",
    description:
      "Chat page for an Eve agent, rendering the session through an assistant-ui thread.",
    files: [
      {
        type: "registry:file",
        path: "app/page.tsx",
        sourcePath: "templates/eve/app/page.tsx",
        target: "app/page.tsx",
      },
    ],
    dependencies: ["@assistant-ui/eve"],
    bundledRegistryDependencies: ["https://r.assistant-ui.com/thread.json"],
    docs: "Eve installs registry files without touching CSS, so add the reasoning and collapsible styles to app/globals.css, and replace the default auth policy in agent/channels/eve.ts before deploying: https://www.assistant-ui.com/docs/runtimes/eve/quickstart",
    meta: {
      eve: {
        requires: ">=0.27.6",
      },
    },
  },
  {
    name: "thread",
    type: "registry:component",
    title: "Thread",
    description:
      "Chat container with message list, composer, auto scroll, and accessibility built in.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/thread.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/follow-up-suggestions.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/reasoning.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/tool-fallback.json",
      "https://r.assistant-ui.com/tool-group.json",
    ],
  },
  {
    name: "voice",
    type: "registry:component",
    title: "Voice",
    description:
      "Realtime voice session controls with connect, mute, and a status indicator.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/voice.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/voice.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
  },
  {
    name: "markdown-text",
    type: "registry:component",
    title: "Markdown Text",
    description:
      "Render assistant markdown with headings, lists, links, and code blocks.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/markdown-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/markdown-text.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: [
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
  },
  {
    name: "reasoning",
    type: "registry:component",
    title: "Reasoning",
    description:
      "Collapsible panel for assistant reasoning and thinking content.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/reasoning.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/reasoning.tsx",
      },
    ],
    registryDependencies: [
      "collapsible",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "message-timing",
    type: "registry:component",
    title: "Message Timing",
    description:
      "Badge with streaming stats: time to first token, total time, and tokens per second.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/message-timing.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/message-timing.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "context-display",
    type: "registry:component",
    title: "Context Display",
    description:
      "Token usage against a model's context window as a ring, bar, or text, with a hover popover.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/context-display.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/context-display.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "thread-list",
    type: "registry:component",
    title: "Thread List",
    description:
      "Sidebar or dropdown for switching conversations, with search and active selection.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread-list.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/thread-list.tsx",
      },
    ],
    registryDependencies: [
      "button",
      "input",
      "skeleton",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "mcp-config",
    type: "registry:component",
    title: "MCP Config Dialog",
    description:
      "Dialog listing MCP connectors and custom servers, with OAuth and bearer auth controls.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/mcp-config.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/mcp-config.tsx",
      },
    ],
    registryDependencies: [
      "badge",
      "button",
      "dialog",
      "input",
      "label",
      "separator",
    ],
    dependencies: [
      "@assistant-ui/react-mcp",
      "@assistant-ui/store",
      "lucide-react",
    ],
  },
  {
    name: "attachment",
    type: "registry:component",
    title: "Attachment",
    description:
      "Attach files from the composer and view them inside messages.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/attachment.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/attachment.tsx",
      },
    ],
    registryDependencies: [
      "dialog",
      "tooltip",
      "avatar",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "zustand"],
  },
  {
    name: "follow-up-suggestions",
    type: "registry:component",
    title: "Follow Up Suggestions",
    description:
      "Prompt chips rendered from runtime generated follow up suggestions.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/follow-up-suggestions.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/follow-up-suggestions.tsx",
      },
    ],
    registryDependencies: [],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "tooltip-icon-button",
    type: "registry:component",
    title: "Tooltip Icon Button",
    description:
      "Icon button with an accessible tooltip label, shared across the assistant UI components.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tooltip-icon-button.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tooltip-icon-button.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    registryDependencies: ["tooltip", "button"],
  },
  {
    name: "syntax-highlighter",
    type: "registry:component",
    title: "Syntax Highlighter",
    description: "Code block highlighting powered by react-syntax-highlighter.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/syntax-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/syntax-highlighter.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "@assistant-ui/react-markdown",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "assistant-modal",
    type: "registry:component",
    title: "Assistant Modal",
    description: "Floating chat bubble for support widgets and help desks.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-modal.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-modal.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    baseRegistryDependencies: ["popover"],
  },
  {
    name: "assistant-sidebar",
    type: "registry:component",
    title: "Assistant Sidebar",
    description:
      "Side panel chat for copilot experiences and inline assistance.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/assistant-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/assistant-sidebar.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "resizable",
      "https://r.assistant-ui.com/thread.json",
    ],
  },
  {
    name: "tool-fallback",
    type: "registry:component",
    title: "Tool Fallback",
    description: "Default renderer for tool calls that have no dedicated UI.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-fallback.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-fallback.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "tw-shimmer"],
    registryDependencies: ["button", "collapsible"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "tool-group",
    type: "registry:component",
    title: "Tool Group",
    description: "Collapsible wrapper around consecutive tool calls.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tool-group.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/tool-group.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    registryDependencies: ["collapsible"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "shiki-highlighter",
    type: "registry:component",
    title: "Shiki Highlighter",
    description: "Code block highlighting powered by react-shiki.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/shiki-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/shiki-highlighter.tsx",
      },
    ],
    dependencies: [
      "react-shiki",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "mermaid-diagram",
    type: "registry:component",
    title: "Mermaid Diagram",
    description:
      "Render Mermaid diagrams in messages, including while they stream.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/mermaid-diagram.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/mermaid-diagram.tsx",
      },
    ],
    dependencies: [
      "beautiful-mermaid",
      "lucide-react",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "diff-viewer",
    type: "registry:component",
    title: "Diff Viewer",
    description: "Render code diffs with highlighted additions and deletions.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/diff-viewer.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/diff-viewer.tsx",
      },
    ],
    dependencies: [
      "diff",
      "parse-diff",
      "@assistant-ui/react-markdown",
      "class-variance-authority",
    ],
  },
  {
    name: "threadlist-sidebar",
    type: "registry:component",
    title: "Thread List Sidebar",
    description: "Sidebar shell that hosts the thread list beside a thread.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/threadlist-sidebar.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/threadlist-sidebar.tsx",
      },
      {
        type: "registry:component",
        path: "components/icons/github.tsx",
        sourcePath: "../../packages/ui/src/components/icons/github.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "sidebar",
      "https://r.assistant-ui.com/thread-list.json",
    ],
  },
  {
    name: "quote",
    type: "registry:component",
    title: "Quote",
    description:
      "Select and quote message text with a floating toolbar and a composer preview.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/quote.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/quote.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "sources",
    type: "registry:component",
    title: "Sources",
    description:
      "Display URL sources with favicon, title, and an external link.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/sources.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/sources.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "image",
    type: "registry:component",
    title: "Image",
    description:
      "Display image parts with preview, loading states, and a fullscreen dialog.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/image.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/image.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "file",
    type: "registry:component",
    title: "File",
    description:
      "Display file parts with icon, name, size, and a download button.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/file.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/file.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
  },
  {
    name: "model-selector",
    type: "registry:component",
    title: "Model Selector",
    description:
      "Model picker with reasoning effort levels, search, and runtime integration.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/model-selector.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/model-selector.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: ["command", "popover"],
  },
  {
    name: "logos",
    type: "registry:component",
    title: "Logos",
    description: "Model provider logos as inline SVG components.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/logos.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/logos.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "select",
    type: "registry:component",
    title: "Select",
    description:
      "Dropdown select styled for the assistant UI, with composable sub components.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/select.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/select.tsx",
      },
    ],
    dependencies: ["lucide-react", "class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "direction",
    type: "registry:ui",
    title: "Direction Provider",
    description: "Direction provider and hook for right to left layouts.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/direction.tsx",
        sourcePath: "../../packages/ui/src/components/ui/radix/direction.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "badge",
    type: "registry:component",
    title: "Badge",
    description: "Small label for status, categories, and metadata.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/badge.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/badge.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "tabs",
    type: "registry:component",
    title: "Tabs",
    description: "Tabs for organizing content into switchable panels.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/tabs.tsx",
        sourcePath: "../../packages/ui/src/components/assistant-ui/tabs.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "accordion",
    type: "registry:component",
    title: "Accordion",
    description: "Stacked headings that reveal or hide content sections.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/accordion.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/accordion.tsx",
      },
    ],
    dependencies: ["lucide-react", "class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
    css: accordionKeyframesCss,
  },
  {
    name: "dot-matrix",
    type: "registry:component",
    title: "Dot Matrix",
    description: "5x5 dot matrix indicator with state specific blink patterns.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/dot-matrix.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/dot-matrix.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "number-roll",
    type: "registry:component",
    title: "Number Roll",
    description:
      "Animated number that rolls its digits odometer style when the value changes.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/number-roll.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/number-roll.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "heat-graph",
    type: "registry:component",
    title: "Heat Graph",
    description: "Activity heat map with month and weekday labels.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/heat-graph.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/heat-graph.tsx",
      },
    ],
    dependencies: ["heat-graph"],
    registryDependencies: [],
  },
  {
    name: "composer-trigger-popover",
    type: "registry:component",
    title: "Composer Trigger Popover",
    description:
      "Character triggered picker for @ mentions, / commands, and similar popovers.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/composer-trigger-popover.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/composer-trigger-popover.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "directive-text",
    type: "registry:component",
    title: "Directive Text",
    description: "Render mention directives as inline chips in user messages.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/directive-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/directive-text.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "generative-ui-style",
    type: "registry:style",
    title: "Generative UI Style",
    description: "Theme variables and vocabulary CSS for generative UI output.",
    cssVars: generativeUiThemeVars,
    css: generativeUiVocabularyCss,
  },
  {
    name: "generative-ui",
    type: "registry:component",
    title: "Generative UI",
    description: "Styled component library for rendering generative UI output.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/generative-ui.tsx",
        sourcePath:
          "../../packages/ui/src/components/assistant-ui/generative-ui.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-generative-ui",
      "react-markdown",
      "remark-gfm",
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/generative-ui-style.json",
    ],
  },
];

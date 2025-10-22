import * as fs from "fs";
import * as path from "path";

export interface TemplateOptions {
  projectName: string;
  targetDir: string;
  agentId?: string;
  openaiApiKey?: string;
  enableMemory?: boolean;
  enableWorkflows?: boolean;
}

export function generateMastraTemplate(options: TemplateOptions): void {
  const {
    projectName,
    targetDir,
    agentId = "chef-agent",
    enableMemory = true,
  } = options;

  // Create directory structure
  const dirs = [
    "app/api/chat",
    "mastra/agents",
    "mastra/tools",
    "components/assistant-ui",
    "components/ui",
    "lib",
  ];

  dirs.forEach((dir) => {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  });

  // Generate package.json
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: {
      "@assistant-ui/react": "latest",
      "@assistant-ui/react-mastra": "latest",
      "@assistant-ui/react-markdown": "latest",
      "@mastra/core": "latest",
      "@mastra/libsql": "latest",
      "@mastra/memory": "latest",
      "@ai-sdk/openai": "latest",
      "@radix-ui/react-slot": "latest",
      "@radix-ui/react-tooltip": "latest",
      "class-variance-authority": "latest",
      clsx: "latest",
      "lucide-react": "latest",
      next: "latest",
      react: "latest",
      "react-dom": "latest",
      "remark-gfm": "latest",
      "tailwind-merge": "latest",
      tailwindcss: "latest",
      zod: "latest",
    },
    devDependencies: {
      "@types/node": "latest",
      "@types/react": "latest",
      "@types/react-dom": "latest",
      eslint: "latest",
      "eslint-config-next": "latest",
      typescript: "latest",
    },
  };

  fs.writeFileSync(
    path.join(targetDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  // Generate Next.js configuration
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@mastra/*"],
};

export default nextConfig;
`;

  fs.writeFileSync(path.join(targetDir, "next.config.mjs"), nextConfig);

  // Generate TypeScript configuration
  const tsConfig = {
    compilerOptions: {
      lib: ["dom", "dom.iterable", "es6"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [
        {
          name: "next",
        },
      ],
      paths: {
        "@/*": ["./*"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };

  fs.writeFileSync(
    path.join(targetDir, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2),
  );

  // Generate components.json
  const componentsJson = {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "new-york",
    rsc: true,
    tsx: true,
    tailwind: {
      config: "",
      css: "app/globals.css",
      baseColor: "zinc",
      cssVariables: true,
      prefix: "",
    },
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
    },
  };

  fs.writeFileSync(
    path.join(targetDir, "components.json"),
    JSON.stringify(componentsJson, null, 2),
  );

  // Generate globals.css
  const globalsCss = `@import "tailwindcss";

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

  fs.writeFileSync(path.join(targetDir, "app/globals.css"), globalsCss);

  // Generate app layout
  const layout = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastra Chat App",
  description: "AI chat application powered by Mastra and assistant-ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-dvh">{children}</body>
    </html>
  );
}
`;

  fs.writeFileSync(path.join(targetDir, "app/layout.tsx"), layout);

  // Generate main page
  const mainPage = `"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";

export default function Home() {
  const runtime = useMastraRuntime({
    agentId: "${agentId}",
    memory: ${enableMemory},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
`;

  fs.writeFileSync(path.join(targetDir, "app/page.tsx"), mainPage);

  // Generate API route
  const apiRoute = `import { mastra } from "@/mastra";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, threadId, agentId = "${agentId}" } = await req.json();

    const agent = mastra.getAgent(agentId);
    const result = await agent.stream(messages, { threadId });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
`;

  fs.writeFileSync(path.join(targetDir, "app/api/chat/route.ts"), apiRoute);

  // Generate Mastra configuration
  const mastraIndex = `import { Mastra } from "@mastra/core";
${
  enableMemory
    ? `import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";`
    : ""
}
import { ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} } from "./agents/${agentId}";

${
  enableMemory
    ? `const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
});`
    : ""
}

export const mastra = new Mastra({
  agents: {
    ${agentId},
  },
  ${enableMemory ? "memory," : ""}
  logger: {
    level: "info",
  },
});
`;

  fs.writeFileSync(path.join(targetDir, "mastra/index.ts"), mastraIndex);

  // Generate agent
  const agentConfig = `import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} = new Agent({
  name: "${agentId}",
  instructions: \`You are a helpful AI assistant powered by Mastra and assistant-ui. You provide intelligent, context-aware responses and can use various tools to help users.\`,
  model: openai("gpt-4o-mini"),
  memory: ${enableMemory},
});
`;

  fs.writeFileSync(
    path.join(targetDir, `mastra/agents/${agentId}.ts`),
    agentConfig,
  );

  // Generate utilities
  const utils = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  fs.writeFileSync(path.join(targetDir, "lib/utils.ts"), utils);

  // Generate thread component (simplified)
  const threadComponent = `import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowDownIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, PencilIcon, RefreshCwIcon, SendHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";

export const Thread = () => {
  return (
    <ThreadPrimitive.Root
      className="text-foreground bg-background box-border flex h-full flex-col overflow-hidden"
      style={{
        ["--thread-max-width" as string]: "42rem",
      }}
    >
      <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth bg-inherit px-4 pt-8">
        <ThreadWelcome />
        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            EditComposer: EditComposer,
            AssistantMessage: AssistantMessage,
          }}
        />
        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>
        <div className="sticky bottom-0 mt-3 flex w-full max-w-[var(--thread-max-width)] flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
          <ThreadScrollToBottom />
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome = () => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <p className="mt-4 font-medium">How can I help you today?</p>
        </div>
        <ThreadWelcomeSuggestions />
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions = () => {
  return (
    <div className="mt-3 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
        prompt="Hello! Tell me about yourself."
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          Hello! Tell me about yourself.
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-muted/80 flex max-w-sm grow basis-0 flex-col items-center justify-center rounded-lg border p-3 transition-colors ease-in"
        prompt="What can you help me with?"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm font-semibold">
          What can you help me with?
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer = () => {
  return (
    <ComposerPrimitive.Root className="focus-within:border-ring/20 flex w-full flex-wrap items-end rounded-lg border bg-inherit px-2.5 shadow-sm transition-colors ease-in">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="Write a message..."
        className="placeholder:text-muted-foreground max-h-40 flex-grow resize-none border-none bg-transparent px-2 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
      <ComposerAction />
    </ComposerPrimitive.Root>
  );
};

const ComposerAction = () => {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton
            tooltip="Cancel"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
          >
            <CircleStopIcon />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
};

const UserMessage = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 py-4 [&:where(>*)]:col-start-2">
      <UserActionBar />
      <div className="bg-muted text-foreground col-start-2 row-start-2 max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5">
        <MessagePrimitive.Parts />
      </div>
      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="col-start-1 row-start-2 mr-3 mt-2.5 flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer = () => {
  return (
    <ComposerPrimitive.Root className="bg-muted my-4 flex w-full max-w-[var(--thread-max-width)] flex-col gap-2 rounded-xl">
      <ComposerPrimitive.Input className="text-foreground flex h-8 w-full resize-none bg-transparent p-4 pb-0 outline-none" />
      <div className="mx-3 mb-3 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost">Cancel</Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button>Send</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="text-foreground col-span-2 col-start-2 row-start-1 my-1.5 max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7">
        <MessagePrimitive.Parts
          components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }}
        />
        <MessageError />
      </div>
      <AssistantActionBar />
      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const MessageError = () => {
  return (
    <MessagePrimitive.Error>
      <div className="border-destructive bg-destructive/10 dark:bg-destructive/5 text-destructive mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <MessagePrimitive.Message className="line-clamp-2" />
      </div>
    </MessagePrimitive.Error>
  );
};

const AssistantActionBar = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-muted-foreground data-[floating]:bg-background col-start-3 row-start-2 -ml-1 flex gap-1 data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

const CircleStopIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      width="16"
      height="16"
    >
      <rect width="10" height="10" x="3" y="3" rx="2" />
    </svg>
  );
};
`;

  fs.writeFileSync(
    path.join(targetDir, "components/assistant-ui/thread.tsx"),
    threadComponent,
  );

  // Generate UI components (simplified versions)
  const buttonComponent = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;

  fs.writeFileSync(
    path.join(targetDir, "components/ui/button.tsx"),
    buttonComponent,
  );

  // Generate markdown text component
  const markdownText = `import { MessagePrimitive } from "@assistant-ui/react";
import { memo } from "react";

const remarkGfm = require("remark-gfm");

const MarkdownText = memo(() => {
  return (
    <MessagePrimitive.Text
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
        ),
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children }) => (
          <code className="bg-muted rounded px-1 py-0.5 text-sm font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted rounded p-2 mb-2 overflow-x-auto">
            <code className="text-sm font-mono">{children}</code>
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-muted-foreground pl-4 italic">
            {children}
          </blockquote>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    />
  );
});

MarkdownText.displayName = "MarkdownText";

export { MarkdownText };
`;

  fs.writeFileSync(
    path.join(targetDir, "components/assistant-ui/markdown-text.tsx"),
    markdownText,
  );

  // Generate tooltip icon button
  const tooltipIconButton = `import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tooltipVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "icon",
    },
  }
);

export interface TooltipIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tooltipVariants> {
  tooltip: string;
  asChild?: boolean;
}

const TooltipIconButton = React.forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(({ className, variant, size, tooltip, asChild = false, ...props }, ref) => {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            className={cn(tooltipVariants({ variant, size, className }))}
            ref={ref}
            {...props}
          />
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={4}
            className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          >
            {tooltip}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
});
TooltipIconButton.displayName = "TooltipIconButton";

export { TooltipIconButton, tooltipVariants };
`;

  fs.writeFileSync(
    path.join(targetDir, "components/assistant-ui/tooltip-icon-button.tsx"),
    tooltipIconButton,
  );

  // Generate tool fallback
  const toolFallback = `import { MessagePrimitive } from "@assistant-ui/react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToolFallback = ({ tool }) => {
  return (
    <MessagePrimitive.Root className="my-2">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border p-3",
        tool.state === "running" && "border-blue-200 bg-blue-50",
        tool.state === "success" && "border-green-200 bg-green-50",
        tool.state === "error" && "border-red-200 bg-red-50"
      )}>
        {tool.state === "running" && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
        {tool.state === "success" && (
          <div className="h-4 w-4 rounded-full bg-green-600" />
        )}
        {tool.state === "error" && (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}

        <div className="flex-1">
          <div className="font-medium text-sm">
            Using tool: {tool.name}
          </div>
          {tool.args && (
            <div className="text-xs text-muted-foreground mt-1">
              {JSON.stringify(tool.args, null, 2)}
            </div>
          )}
          {tool.state === "error" && tool.error && (
            <div className="text-xs text-red-600 mt-1">
              Error: {tool.error}
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
`;

  fs.writeFileSync(
    path.join(targetDir, "components/assistant-ui/tool-fallback.tsx"),
    toolFallback,
  );

  // Generate README
  const readme = `# ${projectName}

A Next.js application powered by Mastra and assistant-ui.

## Features

- 🤖 **AI Agents**: Powered by Mastra's agent framework
- 💬 **Real-time Chat**: Streaming responses with assistant-ui
- 🧠 **Memory${enableMemory ? "" : ""}**: ${enableMemory ? "Persistent conversation context" : "No memory (can be enabled)"}
- 🔧 **Tools**: Extensible tool system
- 📱 **Responsive**: Mobile-friendly interface

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

   Add your OpenAI API key to \`.env.local\`:
   \`\`\`
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

3. **Run the development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Project Structure

\`\`
${projectName}/
├── app/
│   ├── api/chat/           # Mastra API route
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── components/
│   ├── assistant-ui/        # Chat components
│   └── ui/                  # Reusable UI components
├── lib/
│   └── utils.ts             # Utility functions
├── mastra/
│   ├── agents/              # Mastra agents
│   └── index.ts             # Mastra configuration
├── package.json             # Dependencies
└── README.md               # This file
\`\`

## Customization

### Adding New Agents

1. Create a new agent file in \`mastra/agents/\`
2. Define the agent with instructions and tools
3. Register it in \`mastra/index.ts\`
4. Update the page component to use the new agent

### Enabling Memory

Memory is ${enableMemory ? "enabled" : "disabled"} by default. To ${enableMemory ? "keep it" : "enable it"}:

1. Update the runtime configuration in \`app/page.tsx\`:
   \`\`\`tsx
   const runtime = useMastraRuntime({
     agentId: "${agentId}",
     memory: ${enableMemory ? "true" : "false"}, // Change to true
   });
   \`\`\`

2. The database file will be created automatically at \`./mastra.db\`

### Adding Tools

1. Create tool files in \`mastra/tools/\`
2. Define tool parameters and execution logic
3. Import and use them in your agents

## Learn More

- [Mastra Documentation](https://mastra.ai/docs)
- [Assistant UI Documentation](https://www.assistant-ui.com)
- [Next.js Documentation](https://nextjs.org/docs)
`;

  fs.writeFileSync(path.join(targetDir, "README.md"), readme);

  // Generate environment example
  const envExample = `# OpenAI API Key for Mastra agents
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Database URL for persistent memory
${enableMemory ? "DATABASE_URL=file:./mastra.db" : "# DATABASE_URL=file:./mastra.db # Uncomment to enable memory"}
`;

  fs.writeFileSync(path.join(targetDir, ".env.local.example"), envExample);

  // Generate .gitignore
  const gitignore = `# dependencies
/node_modules
/.pnpm
.vercel
/.next/

# testing
/coverage

# next.js
/.next/

# production
/build
/dist

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# database
*.db
*.sqlite
*.sqlite3
`;

  fs.writeFileSync(path.join(targetDir, ".gitignore"), gitignore);

  console.log(`✅ Generated Mastra template for ${projectName}`);
  console.log(`📁 Directory: ${targetDir}`);
  console.log(`🤖 Agent ID: ${agentId}`);
  console.log(`🧠 Memory: ${enableMemory ? "Enabled" : "Disabled"}`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   cd ${targetDir}`);
  console.log(`   npm install`);
  console.log(`   cp .env.local.example .env.local`);
  console.log(`   # Add your OPENAI_API_KEY to .env.local`);
  console.log(`   npm run dev`);
}

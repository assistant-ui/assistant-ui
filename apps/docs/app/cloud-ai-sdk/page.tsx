import {
  ArrowRight,
  Cloud,
  FileText,
  Layers,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

const ANALYTICS_PAGE = "cloud-ai-sdk" as const;

const INSTALL_COMMAND =
  "npm install @assistant-ui/cloud-ai-sdk @ai-sdk/react ai";

const FEATURES = [
  {
    title: "Zero Config",
    description:
      "Set one environment variable. No providers, no context wrappers, no runtime objects. It just works.",
    icon: Settings,
    iconColor: "text-emerald-400",
  },
  {
    title: "Thread Management",
    description:
      "Built-in thread list, selection, creation, deletion, archiving, and renaming. Everything you need for a ChatGPT-style sidebar.",
    icon: Layers,
    iconColor: "text-blue-400",
  },
  {
    title: "Auto Persistence",
    description:
      "Messages persist automatically as they stream in. Users pick up where they left off, even after a full page refresh.",
    icon: Cloud,
    iconColor: "text-purple-400",
  },
  {
    title: "Auto Titles",
    description:
      "Every thread gets an AI-generated title after the first response. No extra code required.",
    icon: FileText,
    iconColor: "text-yellow-400",
  },
  {
    title: "Works With Any UI",
    description:
      "useCloudChat returns the same interface as useChat. Keep your existing components — only the import changes.",
    icon: Zap,
    iconColor: "text-cyan-400",
  },
  {
    title: "Full AI SDK Compatibility",
    description:
      "All useChat options pass through. Streaming, tool calls, message metadata — everything works as expected.",
    icon: RefreshCw,
    iconColor: "text-orange-400",
  },
] as const;

export default function CloudAiSdkPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="mx-auto max-w-3xl font-medium text-3xl tracking-tight md:text-5xl">
            <span className="font-mono">useChat</span>
            <span className="mx-3 text-muted-foreground/40">{"\u2192"}</span>
            <span className="font-mono">useCloudChat</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Cloud persistence and thread management for any Vercel AI SDK app.
            One import change. Zero config.
          </p>
        </div>

        <CopyCommandButton
          command={INSTALL_COMMAND}
          analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
          <Link
            href="/docs/cloud/ai-sdk"
            className="font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Getting Started {"\u2192"}
          </Link>
          <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
          <Link
            href="/docs/cloud/ai-sdk#api-reference"
            className="font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            API Reference {"\u2192"}
          </Link>
        </div>
      </div>

      {/* Code comparison */}
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
        <DynamicCodeBlock
          lang="tsx"
          code={`import { useChat } from "@ai-sdk/react"

const { messages, sendMessage } = useChat()`}
          options={{
            themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
          }}
          codeblock={{
            title: "Before",
            keepBackground: true,
            className: "my-0 bg-neutral-900!",
          }}
        />
        <DynamicCodeBlock
          lang="tsx"
          code={`import { useCloudChat } from "@assistant-ui/cloud-ai-sdk"

const { messages, sendMessage, threads } = useCloudChat()`}
          options={{
            themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
          }}
          codeblock={{
            title: "After",
            keepBackground: true,
            className: "border! my-0 border-blue-600! bg-neutral-900!",
          }}
        />
      </div>

      {/* Features */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Everything you need, nothing you don't
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Two hooks. Four types. Full cloud persistence and thread management
            for any AI SDK app.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-border/80"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon className={cn("size-4", feature.iconColor)} />
                  {feature.title}
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashboard */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Manage everything from the dashboard
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Analytics, thread browser, run tracking, user insights, auth rules —
            all from{" "}
            <a
              href="https://cloud.assistant-ui.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              cloud.assistant-ui.com
            </a>
          </p>
        </div>

        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-border/50 shadow-lg">
          <Image
            src="/images/cloud-dashboard.png"
            alt="Assistant Cloud dashboard showing analytics, threads, and run tracking"
            width={1200}
            height={675}
            className="w-full"
          />
        </div>

        <div className="mx-auto grid max-w-3xl gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            "Analytics & cost tracking",
            "Thread browser with conversation replay",
            "Per-user metrics & activity",
            "Run waterfall traces",
            "Auth rules (Clerk, Auth0, Supabase, Firebase)",
            "API key management",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span className="size-1 shrink-0 rounded-full bg-blue-400" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Callout */}
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-8 text-center">
        <Cloud className="size-8 text-blue-400" />
        <h3 className="font-medium text-xl tracking-tight">
          Already using AI SDK?
        </h3>
        <p className="max-w-lg text-muted-foreground">
          If you're using <code className="text-foreground/80">useChat</code>{" "}
          from <code className="text-foreground/80">@ai-sdk/react</code> today,
          switching is a one-line change. Your components, your route handlers,
          your tool definitions — they all stay the same.
        </p>
        <Button variant="outline" asChild>
          <Link href="/docs/cloud/ai-sdk">
            Read the docs <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="font-medium text-2xl tracking-tight">
          Start building today
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/docs/cloud/ai-sdk">
              Get Started <ArrowRight />
            </Link>
          </Button>
          <a
            href="https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-cloud-standalone"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            View Example
          </a>
        </div>
      </div>
    </div>
  );
}

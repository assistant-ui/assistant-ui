import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { CLOUD_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ANALYTICS_PAGE = "cloud-ai-sdk" as const;

const CODE_THEMES = {
  light: "catppuccin-latte",
  dark: "catppuccin-mocha",
} as const;

const EXAMPLE_HREF =
  "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-cloud-standalone";

const FEATURES = [
  {
    title: "Zero config",
    description:
      "Set one environment variable. No providers, no context wrappers, no runtime objects.",
  },
  {
    title: "Thread management",
    description:
      "List, select, create, delete, archive, and rename threads. Enough for a ChatGPT-style sidebar.",
  },
  {
    title: "Auto persistence",
    description:
      "Messages persist as they stream in. Users pick up where they left off after a refresh.",
  },
  {
    title: "Auto titles",
    description:
      "Every thread gets an AI-generated title after the first response.",
  },
] as const;

const DASHBOARD_ITEMS = [
  "Analytics and cost tracking",
  "Thread browser with conversation replay",
  "Per-user metrics and activity",
  "Run waterfall traces",
  "Auth rules for Clerk, Auth0, Supabase, and Firebase",
  "API key management",
] as const;

export default function CloudAiSdkPage() {
  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={typePage}>
          <span className="font-mono">useChat</span>
          <span className="text-muted-foreground/40 mx-3">{"\u2192"}</span>
          <span className="font-mono">useCloudChat</span>
        </h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Cloud persistence and thread management for any Vercel AI SDK app. One
          import change.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install @assistant-ui/cloud-ai-sdk"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/cloud/ai-sdk"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 [&_figure]:my-0!">
        <Snippet
          title="Before"
          code={`import { useChat } from "@ai-sdk/react"

const { messages, sendMessage } = useChat()`}
        />
        <Snippet
          title="After"
          code={`import { useCloudChat } from "@assistant-ui/cloud-ai-sdk"

const { messages, sendMessage, threads } = useCloudChat()`}
        />
      </div>

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{feature.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {feature.description}
            </dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-6">
        <p className={cn(typeDeck, "max-w-[52ch]")}>
          The same threads show up in the{" "}
          <a
            href={CLOUD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 hover:text-foreground underline underline-offset-4"
          >
            Cloud dashboard.
          </a>
        </p>
        <div className="overflow-hidden rounded-2xl">
          <Image
            src="/images/cloud-dashboard.png"
            alt="Assistant Cloud dashboard showing analytics, threads, and run tracking"
            width={1200}
            height={675}
            className="w-full"
          />
        </div>
        <ul className="grid gap-x-16 gap-y-2 sm:grid-cols-2">
          {DASHBOARD_ITEMS.map((item) => (
            <li
              key={item}
              className="text-muted-foreground text-sm leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <a
          href={EXAMPLE_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          View the standalone example
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <DynamicCodeBlock
      lang="tsx"
      code={code}
      options={{ themes: CODE_THEMES }}
      codeblock={{
        title,
        className: "my-0",
      }}
    />
  );
}

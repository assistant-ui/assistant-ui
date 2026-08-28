import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { CLOUD_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ANALYTICS_PAGE = "cloud-ai-sdk" as const;

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

const BEFORE = `import { useChat } from "@ai-sdk/react"

const { messages, sendMessage } = useChat()`;

const AFTER = `import { useCloudChat } from "@assistant-ui/cloud-ai-sdk"

const { messages, sendMessage, threads } = useCloudChat()`;

export default function CloudAiSdkPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>
          <span className="font-mono">useChat</span>
          <span className="text-muted-foreground/40 mx-3">{"→"}</span>
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

      <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-2">
        <figure>
          <CodeBlock title="before" className="my-0">
            <Highlight code={BEFORE} language="tsx" />
          </CodeBlock>
          <figcaption className="text-muted-foreground/70 mt-2 font-mono text-[11px] tracking-wide">
            fig. 01 · ephemeral
          </figcaption>
        </figure>
        <figure>
          <CodeBlock title="after" className="my-0">
            <Highlight code={AFTER} language="tsx" />
          </CodeBlock>
          <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
            <span>fig. 02 · persistent</span>
            <span>threads included</span>
          </figcaption>
        </figure>
      </div>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="lg:px-8 lg:first:ps-0 lg:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The dashboard</p>
          <p className="text-muted-foreground mt-4 max-w-[52ch] text-sm leading-relaxed">
            The same threads show up in the{" "}
            <a
              href={CLOUD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium"
            >
              Cloud dashboard
            </a>
            .
          </p>
          <figure className="mt-8">
            <div className="border-foreground/10 overflow-hidden border">
              <Image
                src="/images/cloud-dashboard.png"
                alt="Assistant Cloud dashboard showing analytics, threads, and run tracking"
                width={1200}
                height={675}
                className="w-full"
              />
            </div>
            <figcaption className="text-muted-foreground/70 mt-2 font-mono text-[11px] tracking-wide">
              fig. 03 · the same threads, server-side
            </figcaption>
          </figure>
          <ul className="mt-8 grid max-w-[52rem] gap-x-16 gap-y-2 sm:grid-cols-2">
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
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Already on @assistant-ui/react? Pass an AssistantCloud instance to{" "}
          <Link
            href="/docs/cloud/ai-sdk-assistant-ui"
            className="text-foreground font-medium"
          >
            react-ai-sdk
          </Link>{" "}
          instead.
        </p>
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

"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { LiveDot } from "@/components/shared/live-dot";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const ANALYTICS_PAGE = "native" as const;

const INSTALL_COMMAND = "npx assistant-ui@latest create --native my-app";

const DEMO_SRC = "https://assistant-ui-expo.vercel.app/";

const PRIMITIVES = [
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "Message",
  "Composer",
  "ActionBar",
  "Attachment",
  "BranchPicker",
  "ChainOfThought",
  "Error",
  "QueueItem",
  "Suggestion",
] as const;

const FEATURES = [
  {
    title: "Built for Expo",
    description:
      "Expo Router, EAS Build, and the Expo ecosystem work out of the box.",
  },
  {
    title: "iOS, Android, and web",
    description: "Share UI and logic across every platform from one codebase.",
  },
  {
    title: "Shared runtime",
    description:
      "The same engine as the web SDK. AI SDK, LangGraph, tools, and adapters carry over.",
  },
] as const;

const SNIPPET = `import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
} from "@assistant-ui/react-native";
import { Thread } from "@/components/assistant-ui/thread";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import toolkit from "@/components/assistant-ui/tools";

export default function App() {
  const runtime = useAppRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

export default function NativePage() {
  return (
    <PageFrame pad="sub">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
        <header className="max-w-2xl">
          <h1 className={typePage}>AI chat, on the phone.</h1>
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
            Native Thread, Composer, and Message primitives for React Native.
            The same runtime and adapters as the web SDK — Expo, iOS, Android,
            and web.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <CopyCommandButton
              command={INSTALL_COMMAND}
              analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
            />
            <Link
              href="/docs/react-native"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </header>

        <figure className="mx-auto w-full max-w-[300px] lg:mx-0">
          <NativeDemo />
          <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
            <span>fig. 01</span>
            <span>a real Expo build — tap around</span>
          </figcaption>
        </figure>
      </div>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The setup</p>
          <CodeBlock
            title="app/_layout.tsx · abridged from examples/with-expo"
            className="my-0 mt-6 max-w-[44rem]"
          >
            <Highlight code={SNIPPET} language="tsx" />
          </CodeBlock>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className={typeEyebrow}>The primitives</p>
            <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
              {PRIMITIVES.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {PRIMITIVES.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Composable and unstyled — the web component model, adapted to
            pressables, gestures, and native views.
          </p>
        </section>

        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The same runtime ships for the{" "}
          <Link
            href="/docs"
            className="text-foreground font-medium transition-colors"
          >
            web
          </Link>{" "}
          and the{" "}
          <Link
            href="/ink"
            className="text-foreground font-medium transition-colors"
          >
            terminal
          </Link>
          .
        </p>
        <Link
          href="/docs/react-native/migration"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Migration from web
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

function NativeDemo() {
  const src = useHydrated() ? DEMO_SRC : null;

  return (
    <div className="border-foreground/10 overflow-hidden border">
      <div className="border-foreground/10 text-muted-foreground flex h-9 items-center justify-between border-b px-3.5 font-mono text-[11px] tracking-wide">
        <span>~ assistant-ui · expo</span>
        <span className="flex items-center gap-1.5">
          <LiveDot />
          live
        </span>
      </div>
      {src ? (
        <iframe
          src={src}
          title="assistant-ui React Native demo"
          className="aspect-[9/17.5] w-full border-0"
        />
      ) : (
        <div
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] aspect-[9/17.5] w-full"
          aria-hidden
        />
      )}
    </div>
  );
}

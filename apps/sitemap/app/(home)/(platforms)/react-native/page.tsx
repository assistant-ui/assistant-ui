"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageHero } from "@/components/shared/page-hero";
import { LiveFrame } from "@/components/pages/platforms/live-frame";

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
      <PageHero
        title="AI chat, on the phone."
        deck="Native Thread, Composer, and Message primitives for React Native. The same runtime and adapters as the web SDK: Expo, iOS, Android, and web."
        primary={{ label: "Read the docs", href: "/docs/react-native" }}
        secondary={{ install: INSTALL_COMMAND }}
        showcase={
          <DemoSetupPanel
            demo={
              <LiveFrame
                src={DEMO_SRC}
                title="assistant-ui React Native demo"
                className="size-full rounded-none border-0"
              />
            }
            demoCaption="A real Expo build, running on the web. Tap around."
            files={[
              { path: "app/_layout.tsx", language: "tsx", code: SNIPPET },
            ]}
            setupCaption="Abridged from examples/with-expo."
            frameClassName="h-[36rem]"
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">The primitives</p>
            <span className="text-muted-foreground text-sm tabular-nums">
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
            href="/react"
            className="text-foreground font-medium transition-colors"
          >
            web
          </Link>
          , the{" "}
          <Link
            href="/ink"
            className="text-foreground font-medium transition-colors"
          >
            terminal
          </Link>
          , and{" "}
          <Link
            href="/vue"
            className="text-foreground font-medium transition-colors"
          >
            Vue
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

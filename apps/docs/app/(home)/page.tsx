"use client";

import { Shadcn } from "@/components/shadcn/Shadcn";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "../../components/testimonials/TestimonialContainer";
import {
  ArrowRight,
  CheckIcon,
  CopyIcon,
  Cpu,
  PanelsTopLeft,
  Terminal,
  Zap,
} from "lucide-react";
import { GlowingEffect } from "@/components/home/glowing-effect";
import Image from "next/image";
import { DocsRuntimeProvider } from "./DocsRuntimeProvider";
import { Marquee } from "@/components/magicui/marquee";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { StarPill } from "./home/StarPill";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FEATURE_CARDS = [
  {
    title: "Instant Chat UI",
    description:
      "Drop in a polished ChatGPT-style UX with theming and sensible defaults powered by shadcn/ui and Tailwind.",
    icon: PanelsTopLeft,
    iconClassName: "text-purple-400",
  },
  {
    title: "State Management",
    description:
      "Optimized for streaming responses, interruptions, retries, and multi-turn conversations out of the box.",
    icon: Cpu,
    iconClassName: "text-blue-400",
  },
  {
    title: "High Performance",
    description:
      "Optimized rendering and minimal bundle size keep your app responsive during streaming.",
    icon: Zap,
    iconClassName: "text-green-400",
  },
  {
    title: "Works Everywhere",
    description:
      "Compatible with Vercel AI SDK, LangChain, or any LLM provider. React-based.",
    icon: Terminal,
    iconClassName: "text-orange-400",
  },
] as const;

export default function HomePage() {
  return (
    <main className="container relative z-2 flex flex-col gap-16 px-4 py-12">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <StarPill />
          <h1 className="font-medium text-2xl tracking-tight">
            UX of ChatGPT in your own app
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Open-source React toolkit for production AI chat experiences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CopyCommandButton />
          <Button asChild className="h-10 px-5">
            <Link href="/docs/getting-started">
              Get Started
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <a
            href="https://cal.com/simon-farshid/assistant-ui"
            className="transition-colors hover:text-foreground"
          >
            Contact Sales
          </a>
          <span className="size-1 rounded-full bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <span>Backed by</span>
            <Image
              src="/logos/yc_logo.png"
              alt="Y Combinator"
              height={24}
              width={24}
            />
            <span>Combinator</span>
          </div>
        </div>
      </section>

      <div className="relative w-full">
        <div className="flex h-[600px] w-full flex-col overflow-hidden rounded-xl border bg-background/50 shadow-xl backdrop-blur-sm">
          <DocsRuntimeProvider>
            <Shadcn />
          </DocsRuntimeProvider>
        </div>

        <div className="-bottom-6 -right-6 -z-10 absolute h-full w-full rounded-xl bg-linear-to-br from-primary/5 to-secondary/5 blur-2xl" />
      </div>

      <Button
        className="mx-auto border bg-background text-foreground shadow-sm hover:bg-background/90"
        size="lg"
        asChild
      >
        <Link href="/examples">
          Explore more examples <ArrowRight className="ml-2 size-4" />
        </Link>
      </Button>

      <FeatureHighlights />

      <section className="flex flex-col items-center gap-2">
        <h2 className="text-center font-medium text-3xl tracking-tight">
          Trusted by fast-growing companies
        </h2>
        <Logos />
      </section>

      <section className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Be part of the community
          </h2>
          <p className="text-muted-foreground">
            Join our active Discord community for support and updates.
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <a
            className={buttonVariants({
              variant: "outline",
              className: "flex-1",
            })}
            href="https://discord.gg/S9dwgCNEFs"
          >
            <DiscordLogoIcon className="mr-2 size-4 text-indigo-600" />
            Join our Discord
          </a>
          <a
            className={buttonVariants({
              variant: "outline",
              className: "flex-1",
            })}
            href="https://github.com/assistant-ui/assistant-ui"
          >
            <span className="mr-2">🌟</span> Star us on GitHub
          </a>
        </div>

        <div className="relative mx-auto max-h-[500px] w-full max-w-7xl overflow-hidden">
          <TestimonialContainer
            testimonials={TESTIMONIALS}
            className="sm:columns-2 lg:columns-3 xl:columns-4"
          />
          <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-linear-to-t from-background" />
        </div>
      </section>

      <div className="relative flex w-full flex-col items-center justify-between gap-4 rounded-xl border p-6 sm:flex-row sm:p-10 lg:px-16">
        <GlowingEffect
          spread={40}
          glow={true}
          enabled={true}
          proximity={64}
          inactiveZone={0.01}
        />
        <p className="text-center font-bold text-2xl sm:text-left">
          Ship your AI assistant this week
        </p>
        <Button
          asChild
          className="w-full bg-foreground hover:bg-foreground/80 sm:w-auto"
        >
          <Link href="/docs/getting-started">
            Get Started <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}

function FeatureHighlights() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-medium text-3xl tracking-tight">
          Everything you need to ship AI chat
        </h2>
        <p className="text-muted-foreground">
          Production-ready components and state management to build AI chat,
          faster.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                <Icon className={cn("size-6", feature.iconClassName)} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-xl tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const Logos = () => {
  const isMobile = useMediaQuery("(max-width: 1080px)");

  const content = (
    <div className="flex w-full items-center justify-around">
      <Image
        src="/logos/cust/langchain.svg"
        alt="Langchain"
        width={100}
        height={28}
        className="h-7 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/athenaintel.png"
        alt="Athena Intelligence"
        width={100}
        height={44}
        className="h-11 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/browseruse.svg"
        alt="Browseruse"
        width={100}
        height={26}
        className="h-6 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src="/logos/cust/stack.svg"
        alt="Stack"
        width={100}
        height={22}
        className="h-5 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full overflow-clip">
        <Marquee repeat={4}>
          <div className="flex w-[1000px]">{content}</div>
        </Marquee>
      </div>
    );
  }

  return content;
};

function CopyCommandButton() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText("npx assistant-ui init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group flex h-10 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-4 font-mono text-sm transition-all hover:border-border hover:bg-muted/50"
    >
      <span className="text-muted-foreground/70">$</span>
      <span>npx assistant-ui init</span>
      <div className="ml-1 flex size-4 items-center justify-center text-muted-foreground">
        {copied ? (
          <CheckIcon className="size-3.5 text-green-500" />
        ) : (
          <CopyIcon className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

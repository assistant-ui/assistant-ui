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
import athenaintel from "./logos/cust/athenaintel.png";
import browseruse from "./logos/cust/browseruse.svg";
import langchain from "./logos/cust/langchain.svg";
import stack from "./logos/cust/stack.svg";
import Image from "next/image";
import { DocsRuntimeProvider } from "./DocsRuntimeProvider";
import { Marquee } from "@/components/magicui/marquee";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { StarPill } from "./home/StarPill";
import ycombinator from "./logos/ycombinator.svg";
import { useState } from "react";

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
    <main className="container relative z-2 flex flex-col gap-24 px-4 py-16 lg:py-16">
      <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-start text-left">
          <div className="flex flex-col gap-2">
            <StarPill />
            <h1 className="font-medium text-2xl tracking-tight">
              UX of ChatGPT in your own app
            </h1>
            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              The open-source React toolkit for production AI chat experiences.
              <br className="hidden lg:inline" />
              Built on <span className="text-foreground">shadcn/ui</span> and{" "}
              <span className="text-foreground">Tailwind</span>.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <CopyCommandButton />
              <Button asChild size="lg" className="h-12">
                <Link href="/docs/getting-started">
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 text-muted-foreground">
              <a
                href="https://cal.com/simon-farshid/assistant-ui"
                className="text-sm underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Contact Sales →
              </a>
              <span className="h-4 w-px bg-border" />
              <a
                href="https://www.ycombinator.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100"
              >
                <Image
                  src={ycombinator}
                  alt="Y Combinator"
                  className="h-5 w-auto"
                  width={100}
                />
              </a>
            </div>
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

      <div className="flex justify-center">
        <Button
          className="mx-auto flex w-fit border bg-background text-foreground shadow-sm hover:bg-background/90"
          size="lg"
          asChild
        >
          <Link href="/examples">
            Explore more examples <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <FeatureHighlights />

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-center font-medium text-3xl tracking-tight">
          Trusted by fast-growing companies
        </h2>
        <Logos />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center sm:w-full sm:self-start lg:w-[unset] lg:self-center">
          <h2 className="self-start font-medium text-3xl tracking-tight sm:self-center">
            Be part of the community
          </h2>
          <p className="text-muted-foreground">
            Join our active Discord community for support and updates.
          </p>

          <div className="my-2 flex w-full flex-col gap-4 sm:grid sm:grid-cols-2">
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://discord.gg/S9dwgCNEFs"
            >
              <DiscordLogoIcon className="mr-2 size-4 text-indigo-600" /> Join
              our Discord
            </a>
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://github.com/assistant-ui/assistant-ui"
            >
              <span className="mr-2">🌟</span> Star us on GitHub
            </a>
          </div>
        </div>

        <div className="relative mx-auto max-h-[500px] w-full max-w-7xl overflow-hidden">
          <TestimonialContainer
            testimonials={TESTIMONIALS}
            className="sm:columns-2 lg:columns-3 xl:columns-4"
          />
          <div className="-bottom-8 pointer-events-none absolute left-0 z-10 h-12 w-full bg-linear-to-t from-background via-background" />
        </div>
      </div>
      <div className="flex justify-center">
        <div className="relative flex h-max w-full flex-col items-center justify-between gap-5 rounded-xl border p-6 sm:w-max sm:flex-row sm:p-10 lg:h-32 lg:w-full lg:px-16">
          <GlowingEffect
            spread={40}
            glow={true}
            enabled={true}
            proximity={64}
            inactiveZone={0.01}
          />
          <p className="text-center font-bold text-2xl">
            Ship your AI assistant this week
          </p>
          <Button
            asChild
            className="w-full bg-foreground hover:bg-foreground/80 sm:w-[unset]"
          >
            <Link href="/docs/getting-started">
              Get Started <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function FeatureHighlights() {
  return (
    <section>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-medium text-3xl tracking-tight">
          Everything you need to ship AI chat
        </h2>
        <p className="text-muted-foreground">
          Production-ready components and state management to build AI chat,
          faster.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex h-full flex-col justify-between rounded-xl border bg-muted/20 p-6 text-left shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                  <Icon className={`size-6 ${feature.iconClassName}`} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-xl tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
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
    <div className="flex w-full items-center justify-around rounded pt-6">
      <Image
        src={langchain}
        alt="Langchain"
        className="inline-block h-[28px] w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src={athenaintel}
        alt="Athena Intelligence"
        className="inline-block h-11 w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src={browseruse}
        alt="Browseruse"
        className="inline-block h-[26px] w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
      />
      <Image
        src={stack}
        alt="Stack"
        className="mt-0.5 inline-block h-[22px] w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
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
      className={buttonVariants({
        size: "default",
        variant: "outline",
        className:
          "group relative flex h-12 items-center gap-2 rounded-xl border bg-background px-4 py-3 font-bold font-mono text-sm transition-all",
      })}
    >
      <span>$ npx assistant-ui init</span>
      <div className="ml-2 flex h-5 w-5 items-center justify-center text-muted-foreground">
        {copied ? (
          <CheckIcon className="h-3 w-3 text-green-500" />
        ) : (
          <CopyIcon className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

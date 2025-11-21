"use client";

import { Shadcn } from "@/components/shadcn/Shadcn";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "../../components/testimonials/TestimonialContainer";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckIcon,
  CopyIcon,
  Cpu,
  PanelsTopLeft,
  Terminal,
  Zap,
} from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import athenaintel from "./logos/cust/athenaintel.png";
import browseruse from "./logos/cust/browseruse.svg";
import entelligence from "./logos/cust/entelligence.svg";
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
      "State machines tuned for streaming responses, interruptions, retries, and multi-turn conversations out of the box.",
    icon: Cpu,
    iconClassName: "text-blue-400",
  },
  {
    title: "High Performance",
    description:
      "Lean bundles and careful rendering paths keep your chat snappy, even when tokens are flying in.",
    icon: Zap,
    iconClassName: "text-green-400",
  },
  {
    title: "Framework Agnostic",
    description:
      "Works with any React-based stack and any runtime—Vercel AI SDK, direct LLM calls, or your own agents.",
    icon: Terminal,
    iconClassName: "text-orange-400",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative z-2 container max-w-[1100px] px-2 py-16 lg:py-16">
      <StarPill />
      <Hero />

      <div className="mx-auto mt-6 flex h-[650px] w-full max-w-7xl flex-col overflow-hidden rounded-xl border shadow">
        <DocsRuntimeProvider>
          <Shadcn />
        </DocsRuntimeProvider>
      </div>

      <Button
        className="mx-auto mt-6 flex w-fit border bg-background text-foreground shadow-sm hover:bg-background/90"
        size="lg"
        asChild
      >
        <Link href="/examples">
          Explore more examples <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>

      <FeatureHighlights />

      <div className="mt-20 flex flex-col items-center gap-4">
        <h2 className="text-center text-3xl font-medium tracking-tight">
          Trusted by fast-growing companies
        </h2>
        <Logos />
      </div>

      <div className="my-20 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center sm:w-full sm:self-start lg:w-[unset] lg:self-center">
          <h2 className="self-start text-3xl font-medium tracking-tight sm:self-center">
            Be part of the community
          </h2>
          <p className="text-muted-foreground">
            1000+ developers are building with assistant-ui, you&apos;re in good
            company!
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
          <div className="pointer-events-none absolute -bottom-8 left-0 z-10 h-[120px] w-full bg-linear-to-t from-background via-background" />
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
            <p className="text-center text-2xl font-bold">
              Build conversational AI interfaces
            </p>
            <Button
              asChild
              className="w-full bg-foreground hover:bg-foreground/80 sm:w-[unset]"
            >
              <Link href="/docs/getting-started">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureHighlights() {
  return (
    <section className="mt-10 lg:mt-14">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-3xl font-medium tracking-tight">
          State, speed, and flexibility baked in
        </h2>
        <p className="text-muted-foreground">
          assistant-ui pairs refined UI primitives with production-ready chat
          state management so you can ship a real assistant, faster.
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
                  <h3 className="text-xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
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

function Hero() {
  return (
    <div className="relative z-2 flex flex-col overflow-hidden px-6 py-12 text-center md:pt-16">
      <h1 className="mb-8 text-4xl font-medium tracking-tight md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <h1 className="mb-8 text-5xl font-medium tracking-tight max-md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <p className="mb-8 text-muted-foreground md:text-xl">
        assistant-ui is the TypeScript/React library for{" "}
        <span className="text-foreground">AI Chat</span>.<br />
        Built on <span className="text-foreground">shadcn/ui</span> and{" "}
        <span className="text-foreground">Tailwind</span>.
      </p>

      <div className="mx-auto mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row">
        <CopyCommandButton />

        <a
          href="https://cal.com/simon-farshid/assistant-ui"
          className={cn(
            buttonVariants({
              size: "lg",
              variant: "outline",
              className: "h-12 self-center bg-background",
            }),
          )}
        >
          Contact Sales
        </a>
      </div>

      <div className="mt-8 text-muted-foreground">
        <p>
          Backed by{" "}
          <Image
            src={ycombinator}
            alt="Y Combinator"
            className="mb-1 inline"
            width={140}
          />
        </p>
      </div>
      {/* <Image
        // src={Img}
        alt="preview"
        className="animate-in fade-in slide-in-from-bottom-12 mb-[-250px] mt-12 min-w-[800px] select-none duration-1000 md:mb-[-340px] md:min-w-[1100px]"
        priority
      /> */}
    </div>
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
        src={entelligence}
        alt="Entelligence"
        className="mt-1 inline-block h-[22px] w-auto opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0"
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
        size: "lg",
        variant: "outline",
        className:
          "group relative flex h-12 items-center gap-2 rounded-xl border bg-background px-4 py-3 font-mono text-sm font-bold transition-all",
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

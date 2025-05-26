"use client";

import { Shadcn } from "@/components/shadcn/Shadcn";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "../../components/testimonials/TestimonialContainer";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import athenaintel from "./logos/cust/athenaintel.png";
import browseruse from "./logos/cust/browseruse.svg";
import entelligence from "./logos/cust/entelligence.svg";
import langchain from "./logos/cust/langchain.svg";
import stack from "./logos/cust/stack.svg";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DocsRuntimeProvider } from "./DocsRuntimeProvider";
import { Marquee } from "@/components/magicui/marquee";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { StarPill } from "./home/StarPill";
import ycombinator from "./logos/ycombinator.svg";
import { useState } from "react";

export default function HomePage() {
  return (
    <main className="container relative z-[2] max-w-[1100px] px-2 py-16 lg:py-16">
      <StarPill />
      <Hero />

      <div className="mx-auto mt-6 flex h-[650px] w-full max-w-screen-xl flex-col overflow-hidden rounded-lg border shadow">
        <DocsRuntimeProvider>
          <Shadcn />
        </DocsRuntimeProvider>
      </div>

      <Button variant="outline" className="mx-auto mt-6 flex" asChild>
        <Link href="/examples">
          View our other examples <ArrowRight />
        </Link>
      </Button>

      <div className="mt-20 flex flex-col items-center gap-4">
        <h1 className="text-center text-2xl font-medium">
          Trusted by fast-growing companies
        </h1>
        <Logos />
      </div>

      <div className="my-20 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center sm:w-full sm:self-start lg:w-[unset] lg:self-center">
          <h1 className="self-start text-2xl font-medium sm:self-center">
            Be part of the community
          </h1>
          <p>
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

        <div className="relative mx-auto max-h-[500px] w-full max-w-screen-xl overflow-hidden">
          <TestimonialContainer
            testimonials={TESTIMONIALS}
            className="sm:columns-2 lg:columns-3 xl:columns-4"
          />
          <div className="from-background via-background pointer-events-none absolute -bottom-8 left-0 z-10 h-[120px] w-full bg-gradient-to-t" />
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-max w-full flex-col items-center justify-between gap-5 rounded-3xl border p-6 sm:w-max sm:flex-row sm:p-10 lg:h-32 lg:w-full lg:px-16">
            <p className="text-center text-2xl font-bold">
              Build conversational AI interfaces
            </p>
            <Button asChild className="w-full sm:w-[unset]">
              <Link href="/docs/getting-started">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Hero() {
  return (
    <div className="relative z-[2] flex flex-col overflow-hidden px-6 py-12 text-center md:pt-16">
      <h1 className="mb-8 text-4xl font-medium md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <h1 className="mb-8 text-5xl font-medium max-md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <p className="text-muted-foreground mb-8 md:text-xl">
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
              className: "bg-background h-12 self-center",
            }),
          )}
        >
          Contact Sales
        </a>
      </div>

      <div className="text-muted-foreground mt-8">
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
          "bg-background group relative flex h-12 items-center gap-2 rounded-lg border px-4 py-3 font-mono text-sm font-bold transition-all",
      })}
    >
      <span>$ npx assistant-ui init</span>
      <div className="text-muted-foreground ml-2 flex h-5 w-5 items-center justify-center">
        {copied ? (
          <CheckIcon className="h-3 w-3 text-green-500" />
        ) : (
          <CopyIcon className="h-3 w-3 opacity-70 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

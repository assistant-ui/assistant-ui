"use client";

import { Shadcn } from "@/components/shadcn/Shadcn";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "../../components/testimonials/TestimonialContainer";
import { cn } from "@/lib/utils";

import athenaintel from "./logos/cust/athenaintel.png";
import browseruse from "./logos/cust/browseruse.svg";
import entelligence from "./logos/cust/entelligence.svg";
import langchain from "./logos/cust/langchain.svg";
import stack from "./logos/cust/stack.svg";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { MyRuntimeProvider } from "./MyRuntimeProvider";
import { Marquee } from "@/components/magicui/marquee";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { StarPill } from "./home/StarPill";
import ycombinator from "./logos/ycombinator.svg";

export default function HomePage() {
  return (
    <main className="container relative z-[2] max-w-[1100px] px-2 py-16 lg:py-16">
      <StarPill />
      <Hero />
      <div className="mx-auto mt-6 flex h-[650px] w-full max-w-screen-xl flex-col overflow-hidden rounded-lg border shadow">
        <MyRuntimeProvider>
          <Shadcn />
        </MyRuntimeProvider>
      </div>

      <Button variant="outline" className="mx-auto mt-6 flex" asChild>
        <Link href="/examples">
          View our other examples <ArrowRight />
        </Link>
      </Button>

      <div className="mt-20 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-medium">
          Trusted by fast-growing companies
        </h1>
        <Logos />
      </div>

      <div className="my-20 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center">
          <h1 className="text-2xl font-medium">Be part of the community</h1>
          <p>
            1000+ developers are building with assistant-ui, you&apos;re in good
            company!
          </p>

          <div className="my-2 flex gap-4">
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://discord.gg/S9dwgCNEFs"
            >
              <ChatBubbleIcon className="mr-2 size-4" /> Join our Discord
            </a>
            <a
              className={buttonVariants({ variant: "outline" })}
              href="https://github.com/assistant-ui/assistant-ui"
            >
              🌟 Star us on Github
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

        <div>
          <div className="relative flex h-32 w-full items-center justify-between rounded-3xl border px-16">
            <p className="text-2xl font-bold">
              Build conversational AI interfaces
            </p>
            <Button asChild>
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
    <div className="relative z-[2] flex flex-col overflow-hidden px-6 py-12 max-md:text-center md:pt-16">
      <h1 className="mb-8 text-4xl font-medium md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <h1 className="mb-8 max-w-[700px] text-5xl font-medium max-md:hidden">
        UX of ChatGPT in your own app
      </h1>
      <p className="text-muted-foreground mb-8 md:max-w-[80%] md:text-xl">
        assistant-ui is the Typescript/React library for{" "}
        <span className="text-foreground">AI Chat</span>.<br />
        Built on <span className="text-foreground">shadcn/ui</span> and{" "}
        <span className="text-foreground">Tailwind</span>.
      </p>
      <div className="inline-flex items-center gap-3 max-md:mx-auto">
        <Link
          href="/docs/getting-started"
          className={cn(
            buttonVariants({ size: "lg", className: "rounded-full" }),
          )}
        >
          Get Started
        </Link>
        <a
          href="https://cal.com/simon-farshid/assistant-ui"
          className={cn(
            buttonVariants({
              size: "lg",
              variant: "ghost",
              className: "bg-background rounded-full",
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

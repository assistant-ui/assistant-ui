"use client";

import { ChatGPT } from "@/components/chatgpt/ChatGPT";
import { Claude } from "@/components/claude/Claude";
import { Perplexity } from "@/components/perplexity/Perplexity";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { Tab } from "@/components/shared/tab";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { StarPill } from "@/components/home/star-pill";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import Image from "next/image";
import Link from "next/link";

const ExampleWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full overflow-hidden rounded-lg border">{children}</div>
);

const EXAMPLE_TABS = [
  {
    label: "Shadcn",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Shadcn />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "ChatGPT",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <ChatGPT />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Claude",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Claude />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Perplexity",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Perplexity />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Explore More →",
    href: "/examples",
  },
];

export function Hero() {
  return (
    <section className="flex flex-col gap-6">
      <StarPill />

      <div className="flex flex-col gap-1">
        <h1 className="font-medium text-2xl">UX of ChatGPT in your own app</h1>
        <p className="text-lg text-muted-foreground">
          Open-source React toolkit for production AI chat experiences.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <CopyCommandButton />
        <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
          <Link
            href="/docs"
            className="font-medium transition-colors hover:text-foreground"
          >
            Get Started →
          </Link>
          <span className="size-1 rounded-full bg-border" />
          <Link
            href="https://cal.com/simon-farshid/assistant-ui"
            className="transition-colors hover:text-foreground"
          >
            Contact Sales
          </Link>
          <span className="size-1 rounded-full bg-border" />
          <span className="inline-flex items-center gap-1.5">
            Backed by
            <Image
              src="/logos/yc_logo.png"
              alt="Y Combinator"
              height={18}
              width={18}
            />
            Combinator
          </span>
        </div>
      </div>

      <Tab tabs={EXAMPLE_TABS} className="h-[600px]" variant="ghost" />
    </section>
  );
}

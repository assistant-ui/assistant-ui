"use client";

import { ChatGPT } from "@/components/chatgpt/ChatGPT";
import { Claude } from "@/components/claude/Claude";
import { Perplexity } from "@/components/perplexity/Perplexity";
import { Shadcn } from "@/components/shadcn/Shadcn";
import { Tab } from "@/components/shared/tab";
import { Button } from "@/components/ui/button";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { StarPill } from "@/components/home/star-pill";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { ArrowRight } from "lucide-react";
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
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
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

        <div className="flex items-center gap-4 text-[13px]">
          <a
            href="https://cal.com/simon-farshid/assistant-ui"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
          >
            Contact Sales
          </a>
          <span className="size-1 rounded-full bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
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
      </div>

      <Tab tabs={EXAMPLE_TABS} className="h-[600px]" variant="ghost" />
    </section>
  );
}

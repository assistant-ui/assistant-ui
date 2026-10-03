import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Hackathon resources";
const description =
  "Chat UI, multiplayer AI chat, and a sync engine for your project.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

export default function HackathonResourcesPage() {
  return (
    <PageFrame pad="sub" className="antialiased">
      <header className="flex flex-col gap-5">
        <h1 className={typePage}>{title}.</h1>
        <p className={cn(typeDeck, "max-w-[48ch]")}>
          Three products to build with.
        </p>
      </header>
      <div className="border-foreground/10 divide-foreground/10 mt-12 divide-y border-y">
        <section className="grid gap-5 py-8 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className={typeSection}>assistant-ui</h2>
            <p className="text-muted-foreground">Chat UI</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/components" className="underline underline-offset-4">
              Choose components
            </Link>
            <Link
              href="/docs/installation"
              className="underline underline-offset-4"
            >
              Docs
            </Link>
          </div>
        </section>
        <section className="grid gap-5 py-8 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className={typeSection}>harness-sdk</h2>
            <p className="text-muted-foreground">Multiplayer AI Chat · Alpha</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/harness-sdk" className="underline underline-offset-4">
              Set up
            </Link>
            <a
              href="https://workos-demo-sandy.vercel.app/"
              className="underline underline-offset-4"
            >
              Demo
            </a>
          </div>
        </section>
        <section className="grid gap-5 py-8 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className={typeSection}>statewire</h2>
            <p className="text-muted-foreground">Sync Engine</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/statewire" className="underline underline-offset-4">
              Set up
            </Link>
            <a
              href="https://statewire-tic-tac-toe-hackathon-20261003.assistant-ui.workers.dev/"
              className="underline underline-offset-4"
            >
              Demo
            </a>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

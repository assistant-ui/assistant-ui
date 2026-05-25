import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { Megaphone } from "lucide-react";
import { GitHubIcon } from "@/components/icons/github";

const title = "Showcase";
const description = "Projects built with assistant-ui";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

type ShowcaseItem = {
  title: string;
  image: string;
  tag: string;
  secondaryTag?: string;
  link: string;
  announcementLink?: string;
  repositoryLink?: string;
  description: string;
};

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    title: "Chat LangChain",
    image: "/screenshot/chat-langchain.png",
    tag: "Developer Tools",
    secondaryTag: "OSS",
    link: "https://chat.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/chat-langchain",
    description: "AI-powered guide to the LangChain ecosystem.",
  },
  {
    title: "Inconvo",
    image: "/screenshot/inconvo.png",
    tag: "Developer Tools",
    link: "https://inconvo.com/",
    repositoryLink: "https://github.com/ten-dev/inconvo-assistant-ui-example",
    description: "Build AI agents that answer questions from your databases.",
  },
  {
    title: "Closing.wtf",
    image: "/screenshot/closing-wtf.png",
    tag: "AI Assistant",
    link: "https://closing.wtf/",
    announcementLink:
      "https://closing.wtf/blog/mortgage-analysis-chat-with-assistantui",
    description: "AI mortgage analysis that saves homebuyers thousands.",
  },
  {
    title: "Helicone",
    image: "/screenshot/helicone.png",
    tag: "Developer Tools",
    secondaryTag: "OSS",
    link: "https://www.helicone.ai/",
    repositoryLink: "https://github.com/helicone/helicone",
    description: "Open-source LLM observability and gateway platform.",
  },
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    tag: "AI Assistant",
    secondaryTag: "OSS",
    link: "https://opencanvas.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/open-canvas",
    description: "Open-source collaborative writing interface with AI.",
  },
  {
    title: "Portal",
    image: "/screenshot/portal.png",
    tag: "Browser",
    link: "https://www.portal.so/",
    description: "AI browser that automates tasks, analysis, and research.",
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    tag: "Developer Tools",
    secondaryTag: "OSS",
    link: "https://assistant-ui-stockbroker.vercel.app/",
    announcementLink: "https://blog.langchain.dev/assistant-ui/",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui-stockbroker",
    description: "AI assistant for researching public company financials.",
  },
  {
    title: "CoreViz",
    image: "/screenshot/coreviz.png",
    tag: "AI Assistant",
    link: "https://coreviz.io/",
    description: "Search and analyze photos and videos with natural language.",
  },
];

export default function ShowcasePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <header className="mb-16 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">Showcase</p>
        <h1 className="text-2xl font-medium tracking-tight">
          Built with assistant-ui
        </h1>
        <p className="text-muted-foreground mt-2">
          Explore projects from the community using assistant-ui to build
          production AI chat experiences.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SHOWCASE_ITEMS.map((item) => (
          <ShowcaseCard key={item.title} {...item} />
        ))}
      </div>

      <section className="mt-16">
        <p className="text-muted-foreground">
          Building something cool?{" "}
          <a
            href="mailto:showcase@assistant-ui.com"
            className="text-foreground hover:text-foreground/70 font-medium transition-colors"
          >
            Let us know →
          </a>
        </p>
      </section>
    </main>
  );
}

function ShowcaseCard({
  title,
  image,
  tag,
  secondaryTag,
  link,
  announcementLink,
  repositoryLink,
  description,
}: ShowcaseItem) {
  return (
    <div className="group border-border bg-card flex flex-col overflow-hidden rounded-lg border">
      <Link
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="bg-muted relative aspect-[16/10] overflow-hidden">
          <Image src={image} alt={title} fill className="object-cover" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {tag}
          </span>
          {secondaryTag && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
              {secondaryTag}
            </span>
          )}
        </div>

        <Link href={link} target="_blank" rel="noopener noreferrer">
          <h3 className="text-foreground/80 group-hover:text-foreground font-medium transition-colors">
            {title}
          </h3>
        </Link>

        <p className="text-muted-foreground mt-1 flex-1 text-sm">
          {description}
        </p>

        {(repositoryLink || announcementLink) && (
          <div className="mt-4 flex items-center gap-3">
            {repositoryLink && (
              <Link
                href={repositoryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <GitHubIcon className="h-3.5 w-3.5" />
                <span>Source</span>
              </Link>
            )}
            {announcementLink && (
              <Link
                href={announcementLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span>Blog</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

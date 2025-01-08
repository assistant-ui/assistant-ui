import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ShowcaseItem = {
  title: string;
  image: string;
  tag: string;
  secondaryTag?: string;
  link: string;
  announcementLink?: string;
  repositoryLink?: string;
  description?: string;
};

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    title: "Chat LangChain",
    image: "/screenshot/chat-langchain.png",
    tag: "Developer Tools",
    link: "https://chat.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/chat-langchain",
    description: "Chat with LangChain's documentation",
    secondaryTag: "OSS",
  },
  {
    title: "Closing.wtf",
    image: "/screenshot/closing-wtf.png",
    tag: "AI Assistant",
    link: "https://closing.wtf/",
    announcementLink:
      "https://closing.wtf/blog/mortgage-analysis-chat-with-assistantui",
    description:
      "Helps homebuyers get the best deal and avoid getting screwed on their mortgage",
  },
  {
    title: "Entelligence",
    image: "/screenshot/entelligence.png",
    tag: "Developer Tools",
    link: "https://entelligence.ai/",
    description: "AI-powered software engineering assistant",
  },
  {
    title: "Helicone",
    image: "/screenshot/helicone.png",
    tag: "Developer Tools",
    link: "https://www.helicone.ai/",
    repositoryLink: "https://github.com/helicone/helicone",
    description: "Open-source LLM observability for developers",
    secondaryTag: "OSS",
  },
  {
    title: "Komodo",
    image: "/screenshot/komodo.png",
    tag: "Developer Tools",
    link: "https://www.komodo.io/",
    description: "Build, train, and deploy AI models",
  },
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    tag: "AI Assistant",
    link: "https://opencanvas.langchain.com/",
    repositoryLink: "https://github.com/langchain-ai/open-canvas",
    description: "Open Source implementation of OpenAI Canvas",
    secondaryTag: "OSS",
  },
  {
    title: "Portal",
    image: "/screenshot/portal.png",
    tag: "Browser",
    link: "https://www.portal.so/",
    description: "AI executive assistant in the form of a browser",
  },
  {
    title: "Relta",
    image: "/screenshot/relta.png",
    tag: "Developer Tools",
    link: "https://www.relta.dev/",
    description: "Accurate, secure AI assistants for relational data",
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    tag: "Developer Tools",
    link: "https://assistant-ui-stockbroker.vercel.app/",
    announcementLink: "https://blog.langchain.dev/assistant-ui/",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui-stockbroker",
    description: "Research financial data about public companies",
    secondaryTag: "OSS",
  },
];

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <div className="text-muted-foreground text-sm uppercase tracking-wider">
            COMMUNITY SHOWCASE
          </div>
          <h1 className="mt-4 text-5xl font-bold">
            Built with
            <br />
            assistant-ui
          </h1>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE_ITEMS.map((item) => (
            <ShowcaseCard key={item.title} {...item} />
          ))}
        </div>

        <div className="my-20 flex flex-col items-center gap-6">
          <h2 className="text-4xl font-bold">Building something cool?</h2>
          <Button asChild>
            <a href="mailto:showcase@assistant-ui.com">Let us know about it!</a>
          </Button>
        </div>
      </div>
    </div>
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
    <Card className="bg-card group relative flex max-h-[350px] flex-col overflow-hidden rounded-lg">
      <div className="overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={600}
          height={400}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1 p-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            <span className="rounded bg-purple-300/50 px-2 py-1 text-xs dark:bg-purple-900/50">
              {tag}
            </span>
            {secondaryTag && (
              <span className="rounded bg-green-100 px-2 py-1 text-xs dark:bg-green-800">
                {secondaryTag}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="mt-1 flex gap-2">
          {!!announcementLink && (
            <Button variant="outline" className="flex-1" asChild>
              <a href={announcementLink}>Announcement</a>
            </Button>
          )}
          {!!repositoryLink && (
            <Button variant="outline" className="flex-1" asChild>
              <a href={repositoryLink}>Repository</a>
            </Button>
          )}
          <Button variant="outline" className="flex-1" asChild>
            <a href={link}>Homepage</a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

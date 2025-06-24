import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ShowcaseItem = {
  title: string;
  description?: string;
  image: string;
  link: string;
  repositoryLink?: string;
};

const EXAMPLE_ITEMS: ShowcaseItem[] = [
  {
    title: "Modal",
    image: "/screenshot/examples/modal.png",
    description: "Floating button that opens an AI assistant chat box.",
    link: "/examples/modal",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/components/modal",
  },
  {
    title: "Form Filling Co-Pilot",
    image: "/screenshot/examples/form-demo.png",
    description: "AssistantSidebar copilot which fills forms for the user.",
    link: "/examples/form-demo",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-react-hook-form",
  },
  {
    title: "ChatGPT Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a ChatGPT look and feel.",
    link: "/examples/chatgpt",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/components/chatgpt",
  },
  {
    title: "Claude Clone",
    image: "/screenshot/examples/claude.png",
    description: "Customized colors and styles for a Claude look and feel.",
    link: "/examples/claude",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/components/claude",
  },
  {
    title: "Perplexity Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a Perplexity look and feel.",
    link: "/examples/perplexity",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/components/perplexity",
  },
  {
    title: "AI SDK",
    image: "/screenshot/examples/ai-sdk.png",
    description: "Chat persistence with AI SDK.",
    link: "/examples/ai-sdk",
    repositoryLink: "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-ai-sdk",
  },
  {
    title: "Mem0 - ChatGPT with memory",
    image: "/screenshot/examples/mem0.png",
    description:
      "A personalized AI chat app powered by Mem0 that remembers your preferences, facts, and memories.",
    link: "/examples/mem0",
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    description: "A stockbroker showing human in the loop with LangGraph",
    link: "/examples/stockbroker",
  },
  {
    title: "Artifacts",
    image: "/screenshot/examples/artifacts.png",
    description:
      "Open Source Claude Artifacts. You can ask the bot to generate websites.",
    link: "/examples/artifacts",
  },
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    description: "OSS implementation of ChatGPT's Canvas.",
    link: "https://github.com/langchain-ai/open-canvas",
  },
  {
    title: "FastAPI + LangGraph",
    image: "/screenshot/examples/fastapi-langgraph.png",
    description:
      "Integration of a FastAPI + LangGraph server with assistant-ui.",
    link: "https://github.com/Yonom/assistant-ui-langgraph-fastapi",
  },
];

export default function Component() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-28 mt-12 text-center">
          <h1 className="mt-4 text-5xl font-bold">Examples</h1>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_ITEMS.map((item) => (
            <ShowcaseCard key={item.title} {...item} />
          ))}
        </div>

        <div className="my-20 flex flex-col items-center gap-6">
          <h2 className="text-4xl font-bold">Looking for more examples?</h2>
          <Button asChild>
            <a href="/showcase">Check out the community showcase!</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ title, image, description, link, repositoryLink }: ShowcaseItem) {
  return (
    <Card className="bg-card group relative flex max-h-[400px] flex-col overflow-hidden rounded-lg">
      <Link href={link} className="flex-1">
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
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
      </Link>
      {repositoryLink && (
        <div className="p-4 pt-0">
          <Button variant="outline" className="w-full" asChild>
            <a href={repositoryLink} target="_blank" rel="noopener noreferrer">
              View Source
            </a>
          </Button>
        </div>
      )}
    </Card>
  );
}

import { getExamplesPages, getExamplesPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ExampleItem = {
  title: string;
  description?: string;
  image: string;
  link: string;
  external?: boolean;
};

const INTERNAL_EXAMPLES: ExampleItem[] = [
  {
    title: "Modal",
    image: "/screenshot/examples/modal.png",
    description: "Floating button that opens an AI assistant chat box.",
    link: "/examples/modal",
  },
  {
    title: "Form Filling Co-Pilot",
    image: "/screenshot/examples/form-demo.png",
    description: "AssistantSidebar copilot which fills forms for the user.",
    link: "/examples/form-demo",
  },
  {
    title: "ChatGPT Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a ChatGPT look and feel.",
    link: "/examples/chatgpt",
  },
  {
    title: "Claude Clone",
    image: "/screenshot/examples/claude.png",
    description: "Customized colors and styles for a Claude look and feel.",
    link: "/examples/claude",
  },
  {
    title: "Perplexity Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a Perplexity look and feel.",
    link: "/examples/perplexity",
  },
  {
    title: "AI SDK",
    image: "/screenshot/examples/ai-sdk.png",
    description: "Chat persistence with AI SDK.",
    link: "/examples/ai-sdk",
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
];

const COMMUNITY_EXAMPLES: ExampleItem[] = [
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    description: "OSS implementation of ChatGPT's Canvas.",
    link: "https://github.com/langchain-ai/open-canvas",
    external: true,
  },
  {
    title: "FastAPI + LangGraph",
    image: "/screenshot/examples/fastapi-langgraph.png",
    description:
      "Integration of a FastAPI + LangGraph server with assistant-ui.",
    link: "https://github.com/Yonom/assistant-ui-langgraph-fastapi",
    external: true,
  },
];

function ExampleCard({
  title,
  image,
  description,
  link,
  external = false,
}: ExampleItem) {
  const cardContent = (
    <Card className="group relative flex max-h-[400px] min-h-[350px] flex-col overflow-hidden rounded-lg bg-card">
      <div className="overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={600}
          height={400}
          className="aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-105 md:aspect-[16/9]"
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
    </Card>
  );

  if (external) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="not-prose no-underline"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={link} className="not-prose no-underline">
      {cardContent}
    </Link>
  );
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;

  // Handle index page (no slug)
  if (!params.slug || params.slug.length === 0) {
    return (
      <DocsPage>
        <DocsBody>
          <header className="mt-7 mb-28 text-center">
            <h1 className="mt-4 text-5xl font-bold">Examples</h1>
          </header>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INTERNAL_EXAMPLES.map((item) => (
              <ExampleCard key={item.title} {...item} />
            ))}
          </div>

          <h2 className="mt-20 mb-8 text-3xl font-bold">Community Examples</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COMMUNITY_EXAMPLES.map((item) => (
              <ExampleCard key={item.title} {...item} />
            ))}
          </div>

          <div className="my-20 flex flex-col items-center gap-6">
            <h2 className="text-4xl font-bold">Looking for more examples?</h2>
            <Button asChild>
              <a href="/showcase">Check out the community showcase!</a>
            </Button>
          </div>
        </DocsBody>
      </DocsPage>
    );
  }

  // Handle individual example pages
  const page = getExamplesPage(params.slug);
  const mdxComponents = getMDXComponents({});

  if (page == null) {
    notFound();
  }

  const path = `apps/docs/content/examples/${page.file.path}`;

  const footer = (
    <a
      href={`https://github.com/assistant-ui/assistant-ui/blob/main/${path}`}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "gap-1.5 text-xs",
        }),
      )}
    >
      <EditIcon className="size-3" />
      Edit on GitHub
    </a>
  );

  return (
    <DocsPage
      toc={page.data.toc ?? false}
      full={page.data.full ?? false}
      tableOfContent={{ footer }}
    >
      <DocsBody>
        <h1>{page.data.title}</h1>
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  // Generate params for both index and individual pages
  const pages = getExamplesPages()
    .filter((page) => page.slugs[0] === "examples")
    .map((page) => ({
      slug: page.slugs.slice(1),
    }));

  // Add the index page (empty slug)
  return [{ slug: [] }, ...pages];
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;

  // Handle index page metadata
  if (!params.slug || params.slug.length === 0) {
    return {
      title: "Examples",
      description:
        "Explore interactive examples and implementations of assistant-ui",
    } satisfies Metadata;
  }

  // Handle individual example pages
  const page = getExamplesPage(params.slug);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  } satisfies Metadata;
}

import { getExamplesPages, getExamplesPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExamplesNavbar } from "@/components/examples";
import {
  ExampleItem,
  INTERNAL_EXAMPLES,
  COMMUNITY_EXAMPLES,
} from "@/lib/examples";

function ExampleCard({
  title,
  image,
  description,
  link,
  external = false,
}: ExampleItem) {
  const cardContent = (
    <Card className="group relative flex min-h-[350px] flex-col overflow-hidden rounded-lg bg-card">
      <div className="overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={600}
          height={400}
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105 md:aspect-[16/9]"
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

  return (
    <Link
      href={link}
      className="not-prose no-underline"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
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

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {INTERNAL_EXAMPLES.map((item) => (
              <ExampleCard key={item.title} {...item} />
            ))}
          </div>

          <h2 className="mt-20 mb-8 text-3xl font-bold">Community Examples</h2>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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

  // Find the corresponding example to get its GitHub link
  const exampleSlug = params.slug?.join("/") || "";
  const example = INTERNAL_EXAMPLES.find(
    (ex) => ex.link === `/examples/${exampleSlug}`,
  );

  const footer = example?.githubLink ? (
    <Link
      href={example.githubLink}
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
      <GithubIcon className="size-4" />
      View on GitHub
    </Link>
  ) : null;

  return (
    <div className="examples-page">
      <DocsPage
        toc={page.data.toc ?? false}
        full={page.data.full ?? false}
        tableOfContent={{ footer }}
      >
        <ExamplesNavbar />
        <DocsBody>
          <header className="mt-7 mb-28 text-center">
            <h1 className="mt-4 text-5xl font-bold">{page.data.title}</h1>
          </header>
          <DocsRuntimeProvider>
            <page.data.body components={mdxComponents} />
          </DocsRuntimeProvider>
        </DocsBody>
      </DocsPage>
    </div>
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

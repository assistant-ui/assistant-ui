import type { Metadata } from "next";
import { use } from "react";
import { createOgMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blog, type BlogPage } from "@/lib/source";
import Image from "next/image";
import profilePic from "@/components/home/testimonials/profiles/Mc0m3zkD_400x400.jpg";
import { getMDXComponents } from "@/mdx-components";
import { ArrowLeft } from "lucide-react";

interface Param {
  slug: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Page(props: {
  params: Promise<Param>;
}): React.ReactElement {
  const params = use(props.params);
  const page = blog.getPage([params.slug]) as BlogPage | undefined;
  const mdxComponents = getMDXComponents({});

  if (!page) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Blog
      </Link>

      <header className="mt-8">
        {page.data.date && (
          <time className="text-muted-foreground text-sm">
            {formatDate(page.data.date)}
          </time>
        )}
        <h1 className="mt-2 font-medium text-3xl tracking-tight">
          {page.data.title}
        </h1>
        {page.data.description && (
          <p className="mt-3 text-lg text-muted-foreground">
            {page.data.description}
          </p>
        )}
        <div className="mt-6 flex items-center gap-2.5">
          <Image
            src={profilePic}
            alt="Simon Farshid"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="text-muted-foreground text-sm">Simon Farshid</span>
        </div>
      </header>

      <article className="prose mt-12 max-w-none">
        <page.data.body components={mdxComponents} />
      </article>
    </main>
  );
}

export function generateStaticParams(): Param[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}

export async function generateMetadata(props: {
  params: Promise<Param>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]) as BlogPage | undefined;

  if (!page) return { title: "Not Found" };

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}

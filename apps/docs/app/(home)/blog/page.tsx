import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { blog, type BlogPage } from "@/lib/source";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Blog";
const description = "Announcements and writing from the assistant-ui team.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function postHref(post: BlogPage): string {
  return post.data.externalUrl ?? post.url;
}

function isExternal(post: BlogPage): boolean {
  return Boolean(post.data.externalUrl);
}

export default function BlogIndex(): React.ReactElement {
  const posts = [...(blog.getPages() as BlogPage[])].sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
  );
  const [featured, ...earlier] = posts;

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>What we&apos;re shipping.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Announcements and writing from the team.
        </p>
      </header>

      <div className="mt-24 flex flex-col gap-16 md:mt-32">
        {featured ? (
          <section className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
            <h2 className="text-muted-foreground mb-4 text-sm md:mb-0 md:pt-5">
              Latest
            </h2>
            <FeaturedPost post={featured} />
          </section>
        ) : null}

        {earlier.length > 0 ? (
          <section className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
            <h2 className="text-muted-foreground mb-4 text-sm md:mb-0 md:pt-5">
              Earlier
            </h2>
            <ul className="flex flex-col gap-1">
              {earlier.map((post) => (
                <li key={post.url}>
                  <PostRow post={post} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="mt-32">
        <Link
          href="/changelog"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Every package release
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

function FeaturedPost({ post }: { post: BlogPage }) {
  const external = isExternal(post);
  const className =
    "group hover:bg-muted/40 -mx-3 block rounded-2xl px-3 py-5 transition-colors";
  const content = (
    <>
      <p className="text-muted-foreground text-sm">
        {post.data.date ? (
          <time dateTime={post.data.date.toISOString()}>
            {formatDate(post.data.date)}
          </time>
        ) : null}
        {post.data.date ? (
          <span className="text-muted-foreground/40"> · </span>
        ) : null}
        {post.data.author}
      </p>
      <h3 className={cn(typeSection, "mt-3")}>
        {post.data.title}
        <ArrowUpRight className="ms-1.5 mb-0.5 inline size-4 opacity-0 transition-opacity group-hover:opacity-50" />
      </h3>
      {post.data.description ? (
        <p className="text-muted-foreground mt-3 max-w-[52ch] text-[15px] leading-relaxed text-pretty">
          {post.data.description}
        </p>
      ) : null}
    </>
  );

  return external ? (
    <a
      href={postHref(post)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <Link href={postHref(post)} className={className}>
      {content}
    </Link>
  );
}

function PostRow({ post }: { post: BlogPage }) {
  const external = isExternal(post);
  const className =
    "group hover:bg-muted/40 -mx-3 flex flex-col gap-1 rounded-lg px-3 py-5 transition-colors md:flex-row md:items-baseline md:gap-8";
  const content = (
    <>
      {post.data.date ? (
        <time
          dateTime={post.data.date.toISOString()}
          className="text-muted-foreground/60 text-sm tabular-nums md:w-28 md:flex-shrink-0"
        >
          {formatDate(post.data.date)}
        </time>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="font-medium">
          {post.data.title}
          <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
        </span>
        {post.data.description ? (
          <span className="text-muted-foreground mt-1 block text-sm">
            {post.data.description}
          </span>
        ) : null}
      </span>
    </>
  );

  return external ? (
    <a
      href={postHref(post)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <Link href={postHref(post)} className={className}>
      {content}
    </Link>
  );
}

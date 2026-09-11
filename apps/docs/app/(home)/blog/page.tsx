import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { blog, type BlogPage } from "@/lib/source";
import { GlyphPlate } from "@/components/shared/glyph-scene";
import { sceneFor } from "@/components/pages/blog/scenes";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
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

function figNumber(fig: number): string {
  return String(fig).padStart(2, "0");
}

type SheetRow =
  | { kind: "pair"; posts: BlogPage[]; skew: 0 | 1 }
  | { kind: "triplet"; posts: BlogPage[] }
  | { kind: "strip"; post: BlogPage };

function buildRows(posts: BlogPage[]): SheetRow[] {
  const rows: SheetRow[] = [];
  let pairs = 0;
  let i = 0;
  while (i < posts.length) {
    const remaining = posts.length - i;
    if (remaining === 1) {
      rows.push({ kind: "strip", post: posts[i]! });
      i += 1;
    } else if (remaining === 2 || remaining === 4) {
      rows.push({
        kind: "pair",
        posts: posts.slice(i, i + 2),
        skew: (pairs % 2) as 0 | 1,
      });
      pairs += 1;
      i += 2;
    } else {
      rows.push({ kind: "triplet", posts: posts.slice(i, i + 3) });
      i += 3;
    }
  }
  return rows;
}

export default function BlogIndex(): React.ReactElement {
  const posts = [...(blog.getPages() as BlogPage[])].sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
  );
  const figOf = new Map(posts.map((post, i) => [post.url, posts.length - i]));
  const [featured, ...rest] = posts;
  const rows = buildRows(rest);

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>What we&apos;re shipping.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Announcements and writing from the team.
        </p>
      </header>

      {featured ? (
        <div className="border-foreground/10 mt-16 border-t md:mt-20">
          <div className="border-foreground/10 border-b">
            <FeaturedCell
              post={featured}
              fig={figOf.get(featured.url) ?? posts.length}
            />
          </div>
          {rows.map((row, index) => (
            <div
              key={index}
              className={cn(
                "border-foreground/10 divide-foreground/10 grid border-b md:divide-x",
                row.kind !== "strip" && "divide-y md:divide-y-0",
                row.kind === "pair" &&
                  (row.skew === 0
                    ? "md:grid-cols-[7fr_5fr]"
                    : "md:grid-cols-[5fr_7fr]"),
                row.kind === "triplet" && "md:grid-cols-3",
              )}
            >
              {row.kind === "strip" ? (
                <StripCell post={row.post} fig={figOf.get(row.post.url) ?? 0} />
              ) : row.kind === "pair" ? (
                row.posts.map((post, cell) =>
                  cell === row.skew ? (
                    <HorizontalCell
                      key={post.url}
                      post={post}
                      fig={figOf.get(post.url) ?? 0}
                      plateSide={row.skew === 0 ? "end" : "start"}
                    />
                  ) : (
                    <VerticalCell
                      key={post.url}
                      post={post}
                      fig={figOf.get(post.url) ?? 0}
                      flip={row.skew === 0}
                    />
                  ),
                )
              ) : (
                row.posts.map((post, cell) => (
                  <VerticalCell
                    key={post.url}
                    post={post}
                    fig={figOf.get(post.url) ?? 0}
                    flip={cell === 1}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      ) : null}

      <footer className="mt-24">
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

function PostLink({
  post,
  className,
  children,
}: {
  post: BlogPage;
  className?: string;
  children: ReactNode;
}) {
  const href = post.data.externalUrl ?? post.url;
  return post.data.externalUrl ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function PostMeta({ post, className }: { post: BlogPage; className?: string }) {
  return (
    <span className={cn("text-muted-foreground block text-xs", className)}>
      {post.data.date ? (
        <time dateTime={post.data.date.toISOString()}>
          {formatDate(post.data.date)}
        </time>
      ) : null}
      {post.data.date ? (
        <span className="text-muted-foreground/40"> · </span>
      ) : null}
      {post.data.author}
    </span>
  );
}

function PlateFigure({
  post,
  fig,
  live = false,
  className,
}: {
  post: BlogPage;
  fig: number;
  live?: boolean;
  className?: string;
}) {
  const scene = sceneFor(post.slugs[0]!);
  return (
    <span className={cn("block", className)}>
      <GlyphPlate scene={scene} live={live} />
      <span className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
        <span>fig. {figNumber(fig)}</span>
        <span>{scene.name}</span>
      </span>
    </span>
  );
}

function FeaturedCell({ post, fig }: { post: BlogPage; fig: number }) {
  return (
    <PostLink post={post} className="group block py-10 md:py-14">
      <span className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:items-center md:gap-16">
        <span className="block">
          <span className={cn(typeEyebrow, "block")}>Latest</span>
          <PostMeta post={post} className="mt-5 text-sm" />
          <span className={cn(typeSection, "mt-3 block")}>
            {post.data.title}
            <ArrowUpRight className="ms-1.5 mb-0.5 inline size-4 opacity-0 transition-opacity group-hover:opacity-50" />
          </span>
          {post.data.description ? (
            <span className="text-muted-foreground mt-3 block max-w-[52ch] text-[15px] leading-relaxed text-pretty">
              {post.data.description}
            </span>
          ) : null}
        </span>
        <PlateFigure post={post} fig={fig} live />
      </span>
    </PostLink>
  );
}

function CellText({ post }: { post: BlogPage }) {
  return (
    <span className="block">
      <PostMeta post={post} />
      <span className="mt-2 block text-lg leading-snug font-medium text-balance">
        {post.data.title}
        <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
      </span>
      {post.data.description ? (
        <span className="text-muted-foreground mt-2 line-clamp-3 block text-sm leading-relaxed">
          {post.data.description}
        </span>
      ) : null}
    </span>
  );
}

function VerticalCell({
  post,
  fig,
  flip,
}: {
  post: BlogPage;
  fig: number;
  flip: boolean;
}) {
  return (
    <PostLink
      post={post}
      className="group flex h-full flex-col py-8 md:px-8 md:py-10 md:first:ps-0 md:last:pe-0"
    >
      {flip ? null : <PlateFigure post={post} fig={fig} className="mb-6" />}
      <CellText post={post} />
      {flip ? (
        <PlateFigure
          post={post}
          fig={fig}
          className="mt-8 md:mt-auto md:pt-8"
        />
      ) : null}
    </PostLink>
  );
}

function HorizontalCell({
  post,
  fig,
  plateSide,
}: {
  post: BlogPage;
  fig: number;
  plateSide: "start" | "end";
}) {
  const plate = <PlateFigure post={post} fig={fig} />;
  return (
    <PostLink
      post={post}
      className={cn(
        "group grid content-center gap-8 py-8 md:px-8 md:py-10 md:first:ps-0 md:last:pe-0",
        plateSide === "end"
          ? "md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]"
          : "md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
      )}
    >
      {plateSide === "start" ? plate : null}
      <span className="block self-center">
        <CellText post={post} />
      </span>
      {plateSide === "end" ? plate : null}
    </PostLink>
  );
}

function StripCell({ post, fig }: { post: BlogPage; fig: number }) {
  return (
    <PostLink
      post={post}
      className="group grid gap-6 py-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-center md:gap-12 md:py-10"
    >
      <PlateFigure post={post} fig={fig} />
      <span className="block">
        <PostMeta post={post} />
        <span className="mt-2 block text-lg leading-snug font-medium">
          {post.data.title}
          <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
        </span>
        {post.data.description ? (
          <span className="text-muted-foreground mt-2 line-clamp-2 block text-sm leading-relaxed">
            {post.data.description}
          </span>
        ) : null}
      </span>
    </PostLink>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { createOgMetadata } from "@/lib/og";
import { blog, type BlogPage } from "@/lib/source";

const title = "Blog";
const description = "News and updates from assistant-ui";

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

export default function BlogIndex(): React.ReactElement {
  const posts = [...(blog.getPages() as BlogPage[])].sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-muted-foreground mb-3 text-sm">Blog</p>
        <h1 className="text-2xl font-medium tracking-tight">
          News and updates
        </h1>
        <p className="text-muted-foreground mt-2">
          The latest from assistant-ui.
        </p>
      </header>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link
            key={post.url}
            href={post.url}
            className="group block sm:flex sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 sm:flex-1">
              <h2 className="text-foreground/80 group-hover:text-foreground font-medium transition-colors">
                {post.data.title}
              </h2>
              {post.data.description && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {post.data.description}
                </p>
              )}
            </div>
            {post.data.date && (
              <time className="text-muted-foreground mt-2 block text-sm sm:mt-0 sm:shrink-0">
                {formatDate(post.data.date)}
              </time>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}

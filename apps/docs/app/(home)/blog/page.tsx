import Link from "next/link";
import { blog, BlogPage } from "@/lib/source";

export default function Page(): React.ReactElement {
  const posts = [...(blog.getPages() as BlogPage[])].sort(
    (a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0),
  );

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 py-12">
      <h1 className="mb-4 px-4 pb-2 font-bold text-4xl">assistant-ui Blog</h1>
      <div className="flex flex-col">
        {posts.map((post) => (
          <Link
            key={post.url}
            href={post.url}
            className="flex flex-col rounded-lg bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <p className="font-medium">{post.data.title}</p>
            {post.data.date && (
              <p className="mt-auto pt-2 text-muted-foreground text-xs">
                {post.data.date.toDateString()}
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}

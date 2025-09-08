import Link from "next/link";
import { blog, BlogPage } from "@/app/source";

export default function Page(): React.ReactElement {
  const posts = [...blog.getPages()].sort(
    (a: BlogPage, b: BlogPage) =>
      new Date(b.data.date ?? b.file.name).getTime() -
      new Date(a.data.date ?? a.file.name).getTime(),
  );

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4 py-12">
      <h1 className="mb-4 px-4 pb-2 text-4xl font-bold">assistant-ui Blog</h1>
      <div className="flex flex-col">
        {posts.map((post: BlogPage) => (
          <Link
            key={post.url}
            href={post.url}
            className="bg-card hover:bg-accent hover:text-accent-foreground flex flex-col rounded-lg p-4 transition-colors"
          >
            <p className="font-medium">{post.data.title}</p>
            <p className="text-muted-foreground mt-auto pt-2 text-xs">
              {new Date(post.data.date ?? post.file.name).toDateString()}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { blog, BlogPage } from "@/app/source";
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";

import profilePic from "../../../../components/testimonials/profiles/Mc0m3zkD_400x400.jpg";

interface Param {
  slug: string;
}

export default function Page({
  params,
}: {
  params: Param;
}): React.ReactElement {
  const page = blog.getPage([params.slug]) as BlogPage;

  if (!page) notFound();

  const MDX = (page.data as any).exports.default;

  return (
    <main className="px-4">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between py-4">
        <Link
          href="/blog"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          Back
        </Link>
        <p className="text-xs text-gray-500">
          {(page.data.date as Date).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </p>
      </div>
      <div
        className="mx-auto w-full max-w-screen-xl rounded-xl border py-12 md:px-8"
        style={{
          backgroundColor: "black",
          backgroundImage: [
            "linear-gradient(140deg, hsla(274,94%,54%,0.3), transparent 50%)",
            "linear-gradient(to left top, hsla(260,90%,50%,0.8), transparent 50%)",
            "radial-gradient(circle at 100% 100%, hsla(240,100%,82%,1), hsla(240,40%,40%,1) 17%, hsla(240,40%,40%,0.5) 20%, transparent)",
          ].join(", "),
          backgroundBlendMode: "difference, difference, normal",
        }}
      >
        <div className="mx-auto flex w-full max-w-screen-sm flex-col items-center justify-center px-4">
          <h1 className="text-center text-4xl font-bold text-white">
            {page.data.title}
          </h1>
          <p className="mt-4 text-balance text-center text-lg text-white/80">
            {page.data.description}
          </p>
        </div>
      </div>
      <article className="prose lg:prose-lg mx-auto w-full max-w-screen-sm py-8">
        <MDX />
      </article>
      <div className="mx-auto mb-20 flex w-full max-w-screen-sm items-start gap-3">
        <Image
          src={profilePic}
          alt="Simon Farshid"
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
        <div className="mt-1.5 flex flex-col">
          <span className="text-sm font-medium">Simon Farshid</span>
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams(): Param[] {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}

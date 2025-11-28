import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactElement } from "react";
import { careers, CareerPage } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { ApplyForm } from "@/components/careers/ApplyForm";

interface Params {
  slug: string;
}

export default function CareerRolePage({
  params,
}: {
  params: Promise<Params>;
}): ReactElement {
  const { slug } = use(params);
  const page = careers.getPage([slug]) as CareerPage | undefined;

  if (!page) {
    notFound();
  }

  const role = page;

  const mdxComponents = getMDXComponents({});

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 pt-16 pb-24 sm:px-8 lg:px-0">
      <div className="flex items-center justify-between">
        <Link
          href="/careers"
          className="text-muted-foreground text-sm transition hover:text-foreground"
        >
          ← Back to careers
        </Link>
        <div className="hidden text-muted-foreground text-xs sm:flex sm:gap-3">
          <span>{role.data.location}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{role.data.type}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{role.data.salary}</span>
        </div>
      </div>

      <header className="space-y-4">
        <p className="text-muted-foreground text-sm uppercase tracking-[0.3em]">
          Role
        </p>
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          {role.data.title}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {role.data.summary}
        </p>
        <div className="flex gap-3 text-muted-foreground text-sm sm:hidden">
          <span>{role.data.location}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{role.data.type}</span>
          <span className="text-muted-foreground/40">•</span>
          <span>{role.data.salary}</span>
        </div>
      </header>

      <div className="flex w-full flex-col border border-border/70 border-dashed bg-background/80">
        <article className="prose-neutral dark:prose-invert prose max-w-none px-6 py-8">
          <role.data.body components={mdxComponents} />
        </article>

        <section className="w-full border-border/70 border-t border-dashed px-6 py-6">
          <h2 className="font-medium text-lg">Ready to apply?</h2>
          <p className="mt-1 mb-6 text-muted-foreground text-sm">
            Send a quick introduction and a few links. We read every submission.
          </p>
          <ApplyForm roleTitle={role.data.title} />
        </section>
      </div>
    </main>
  );
}

export function generateStaticParams(): Params[] {
  return careers.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}

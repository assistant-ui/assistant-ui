import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactElement } from "react";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { careers, type CareerPage } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { ApplyForm } from "@/components/careers/apply-form";
import { ArrowLeft } from "lucide-react";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <Link
        href="/careers"
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Careers
      </Link>

      <header className="mt-8">
        <p className="text-muted-foreground text-sm">
          {role.data.location} · {role.data.type}
          {role.data.salary && ` · ${role.data.salary}`}
        </p>
        <h1 className="mt-2 font-medium text-3xl tracking-tight">
          {role.data.title}
        </h1>
        {role.data.summary && (
          <p className="mt-3 text-lg text-muted-foreground">
            {role.data.summary}
          </p>
        )}
      </header>

      <article className="prose mt-12 max-w-none">
        <role.data.body components={mdxComponents} />
      </article>

      <section className="mt-16">
        <h2 className="font-medium text-xl">Apply for this role</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Send a quick introduction and a few links. We read every submission.
        </p>
        <div className="mt-6">
          <ApplyForm roleTitle={role.data.title} />
        </div>
      </section>
    </main>
  );
}

export function generateStaticParams(): Params[] {
  return careers.getPages().map((page) => ({
    slug: page.slugs[0]!,
  }));
}

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = careers.getPage([params.slug]) as CareerPage | undefined;

  if (!page) return { title: "Not Found" };

  return {
    title: page.data.title,
    description: page.data.summary,
    ...createOgMetadata(page.data.title, page.data.summary),
  };
}

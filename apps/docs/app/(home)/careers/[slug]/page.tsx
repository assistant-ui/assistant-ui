import { use, type ReactElement } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { careers, type CareerPage } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { ApplyForm } from "@/components/pages/careers/apply-form";
import { sceneFor } from "@/components/pages/careers/scenes";
import { GlyphPlate } from "@/components/shared/glyph-scene";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface Params {
  slug: string;
}

const roleOrder = (value: unknown, fallback: number) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function sortedRoles(): CareerPage[] {
  return [...(careers.getPages() as CareerPage[])].sort((a, b) => {
    const orderA = roleOrder(a.data.order, Number.MAX_SAFE_INTEGER);
    const orderB = roleOrder(b.data.order, Number.MAX_SAFE_INTEGER);
    if (orderA === orderB) {
      return a.data.title.localeCompare(b.data.title);
    }
    return orderA - orderB;
  });
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
  const roles = sortedRoles();
  const fig = roles.findIndex((entry) => entry.slugs[0] === slug) + 1;
  const others = roles.filter((entry) => entry.slugs[0] !== slug);
  const scene = sceneFor(slug);
  const mdxComponents = getMDXComponents({});

  return (
    <PageFrame pad="sub">
      <Link
        href="/careers"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Careers
      </Link>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <header className="max-w-2xl">
          <p className="text-muted-foreground text-sm">
            {role.data.location} · {role.data.type}
            {role.data.salary && ` · ${role.data.salary}`}
          </p>
          <h1 className={cn("mt-3", typePage)}>{role.data.title}</h1>
          {role.data.summary && (
            <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
              {role.data.summary}
            </p>
          )}
        </header>
        <figure className="mt-10 lg:mt-1">
          <GlyphPlate scene={scene} />
          <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
            <span>fig. {String(fig).padStart(2, "0")}</span>
            <span>{scene.name}</span>
          </figcaption>
        </figure>
      </div>

      <div className="border-foreground/10 mt-12 border-t pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div className="min-w-0">
          <article className="prose prose-blog w-full max-w-[42rem] min-w-0">
            <role.data.body components={mdxComponents} />
          </article>
          <section
            id="apply"
            className="border-foreground/10 mt-16 max-w-[42rem] scroll-mt-24 border-t pt-10"
          >
            <h2 className={typeSection}>Apply</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Send a quick introduction and a few links. We read every
              submission.
            </p>
            <div className="mt-8">
              <ApplyForm roleTitle={role.data.title} />
            </div>
          </section>
        </div>
        <aside className="max-lg:hidden">
          <div className="lg:sticky lg:top-24">
            <p className={typeEyebrow}>Role</p>
            <dl className="border-foreground/10 mt-4 border-t">
              <RoleFact label="Location" value={role.data.location} />
              <RoleFact label="Type" value={role.data.type} />
              {role.data.salary ? (
                <RoleFact label="Compensation" value={role.data.salary} />
              ) : null}
            </dl>
            <a
              href="#apply"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-8 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors"
            >
              Apply for this role
            </a>
          </div>
        </aside>
      </div>

      {others.length > 0 ? (
        <nav className="border-foreground/10 divide-foreground/10 mt-24 grid divide-y border-t border-b md:grid-cols-2 md:divide-x md:divide-y-0">
          {others.map((other) => (
            <Link
              key={other.url}
              href={other.url}
              className="group flex items-center gap-5 py-6 md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <GlyphPlate
                scene={sceneFor(other.slugs[0]!)}
                fit
                className="w-24 shrink-0"
              />
              <span className="min-w-0">
                <span className={typeEyebrow}>Also open</span>
                <span className="mt-1.5 block truncate text-sm font-medium">
                  {other.data.title}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      ) : null}
    </PageFrame>
  );
}

function RoleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
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

import Link from "next/link";
import type { ReactElement } from "react";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { careers, type CareerPage } from "@/lib/source";
import { sceneFor } from "@/components/pages/careers/scenes";
import { GlyphPlate } from "@/components/shared/glyph-scene";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Careers";
const description =
  "Help build the future of agentic UI. Explore open roles at assistant-ui.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

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

export default function CareersPage(): ReactElement {
  const roles = sortedRoles();

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Work on the library.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          A small team making the frontend layer for AI agents. Three crafts,
          one product.
        </p>
      </header>

      <p className={cn(typeEyebrow, "mt-16 md:mt-20")}>
        Open roles · {String(roles.length).padStart(2, "0")}
      </p>
      <div className="border-foreground/10 mt-4 border-t">
        <div className="divide-foreground/10 border-foreground/10 grid divide-y border-b md:[grid-template-columns:calc((100%-8rem)/3+2rem)_calc((100%-8rem)/3+4rem)_calc((100%-8rem)/3+2rem)] md:divide-x md:divide-y-0">
          {roles.map((role, index) => (
            <RoleCell key={role.url} role={role} fig={index + 1} />
          ))}
        </div>
      </div>

      <footer className="mt-24">
        <p className="text-muted-foreground text-sm">
          Don&apos;t see the perfect fit?{" "}
          <a
            href="mailto:hello@assistant-ui.com"
            className="text-foreground group inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Reach out anyway
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </p>
      </footer>
    </PageFrame>
  );
}

function RoleCell({ role, fig }: { role: CareerPage; fig: number }) {
  const scene = sceneFor(role.slugs[0]!);
  return (
    <Link
      href={role.url}
      className="group flex h-full flex-col py-8 md:px-8 md:py-10 md:first:ps-0 md:last:pe-0"
    >
      <span className="mb-6 block">
        <GlyphPlate scene={scene} />
        <span className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
          <span>fig. {String(fig).padStart(2, "0")}</span>
          <span>{scene.name}</span>
        </span>
      </span>
      <span className="text-muted-foreground block text-xs">
        {role.data.location}
        <span className="text-muted-foreground/40"> · </span>
        {role.data.type}
      </span>
      <span className="mt-2 block text-lg leading-snug font-medium text-balance">
        {role.data.title}
        <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
      </span>
      {role.data.summary ? (
        <span className="text-muted-foreground mt-2 block text-sm leading-relaxed">
          {role.data.summary}
        </span>
      ) : null}
      {role.data.salary ? (
        <span className="text-muted-foreground/70 mt-auto block pt-5 font-mono text-[11px] tracking-wide">
          {role.data.salary}
        </span>
      ) : null}
    </Link>
  );
}

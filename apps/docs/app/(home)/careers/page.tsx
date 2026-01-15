import Link from "next/link";
import type { ReactElement } from "react";
import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { careers, type CareerPage } from "@/lib/source";

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

export default function CareersPage(): ReactElement {
  const roles = [...(careers.getPages() as CareerPage[])].sort((a, b) => {
    const orderA = roleOrder(a.data.order, Number.MAX_SAFE_INTEGER);
    const orderB = roleOrder(b.data.order, Number.MAX_SAFE_INTEGER);
    if (orderA === orderB) {
      return a.data.title.localeCompare(b.data.title);
    }
    return orderA - orderB;
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <header className="mb-12">
        <p className="mb-3 text-muted-foreground text-sm">Careers</p>
        <h1 className="font-medium text-2xl tracking-tight">
          Build the future of agentic UI
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          We&apos;re a small, product-obsessed team crafting the tools that
          power the next generation of AI-native products.
        </p>
      </header>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-medium text-sm">Open roles</h2>
          <p className="text-muted-foreground text-sm">
            {roles.length} {roles.length === 1 ? "position" : "positions"}
          </p>
        </div>

        <div className="space-y-6">
          {roles.map((role) => (
            <Link key={role.url} href={role.url} className="group block">
              <h3 className="font-medium text-foreground/80 transition-colors group-hover:text-foreground">
                {role.data.title}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
                <span>{role.data.location}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{role.data.type}</span>
                {role.data.salary && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{role.data.salary}</span>
                  </>
                )}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <p className="text-muted-foreground">
          Don&apos;t see the perfect fit?{" "}
          <a
            href="mailto:hello@assistant-ui.com"
            className="font-medium text-foreground transition-colors hover:text-foreground/70"
          >
            Reach out anyway →
          </a>
        </p>
      </section>
    </main>
  );
}

import Link from "next/link";
import type { ReactElement } from "react";
import { Metadata } from "next";
import { careers, CareerPage } from "@/app/source";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Help build the future of agentic UI. Explore open roles at assistant-ui.",
};

const roleOrder = (value: unknown, fallback: number) => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function CareersPage(): ReactElement {
  const roles = [...careers.getPages()].sort((a: CareerPage, b: CareerPage) => {
    const orderA = roleOrder(a.data.order, Number.MAX_SAFE_INTEGER);
    const orderB = roleOrder(b.data.order, Number.MAX_SAFE_INTEGER);
    if (orderA === orderB) {
      return a.data.title.localeCompare(b.data.title);
    }
    return orderA - orderB;
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-24 px-6 pt-20 pb-24 sm:px-8 lg:px-0">
      <section className="space-y-6 text-center">
        <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase">
          Careers
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Build the future of agentic UI with us
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
          We&apos;re a small, product-obsessed team crafting the tools that power the
          next generation of AI-native products. Join us if you care about
          beautiful interfaces, fast iteration, and developer velocity.
        </p>
      </section>

      <section className="grid gap-10">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Open roles</h2>
          <p className="text-sm text-muted-foreground">
            Don&apos;t see the perfect fit? We&apos;d still love to hear from you - drop
            us a note at
            <span className="px-1 font-medium text-foreground">
              <a href="mailto:hello@assistant-ui.com">hello@assistant-ui.com</a>
            </span>
            .
          </p>
        </div>

        <div className="overflow-hidden border border-dashed border-border/70 bg-background/80">
          <div className="divide-y divide-dashed divide-border/70">
            {roles.map((role) => (
              <article key={role.url} className="group">
                <div className="flex flex-col gap-4 px-6 py-8 transition-colors duration-200 group-hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-medium tracking-tight">
                      {role.data.title}
                    </h3>
                    <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{role.data.location}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span>{role.data.type}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span>{role.data.salary}</span>
                    </p>
                  </div>
                  <Link
                    href={role.url}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    Read more
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { fetchReleases } from "@/lib/releases";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { PackageFilter } from "./package-filter";
import { ChangelogList } from "./changelog-list";

const title = "Changelog";
const description = "Release notes for all assistant-ui packages.";
const PER_PAGE = 8;

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function pageHref(pkg: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (pkg) params.set("pkg", pkg);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/changelog?${query}` : "/changelog";
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string; page?: string }>;
}) {
  const { pkg, page } = await searchParams;
  const allGroups = await fetchReleases();

  const allPackages = Array.from(
    new Set(allGroups.flatMap((g) => g.releases.map((r) => r.pkg))),
  ).sort();

  const groups = pkg
    ? allGroups
        .map((group) => ({
          ...group,
          releases: group.releases.filter((r) => r.pkg === pkg),
        }))
        .filter((group) => group.releases.length > 0)
    : allGroups;

  const totalPages = Math.max(1, Math.ceil(groups.length / PER_PAGE));
  const current = Math.min(
    Math.max(1, Math.floor(Number(page)) || 1),
    totalPages,
  );
  const visible = groups.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <PageFrame pad="sub">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-6">
        <header className="max-w-2xl">
          <h1 className={typePage}>Release history.</h1>
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
            Every package release from the assistant-ui monorepo, grouped by
            day.
          </p>
        </header>
        {allPackages.length > 0 && (
          <PackageFilter packages={allPackages} value={pkg} />
        )}
      </div>

      <div className="mt-16 md:mt-20">
        {visible.length > 0 ? (
          <ChangelogList groups={visible} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {allGroups.length === 0
              ? "Unable to load releases. Please try again later."
              : "No releases found for this package."}
          </p>
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="mt-10 flex items-baseline justify-between font-mono text-[12px] tracking-wide">
          {current > 1 ? (
            <Link
              href={pageHref(pkg, current - 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground/50 tabular-nums">
            page {String(current).padStart(2, "0")} /{" "}
            {String(totalPages).padStart(2, "0")}
          </span>
          {current < totalPages ? (
            <Link
              href={pageHref(pkg, current + 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <footer className="mt-16">
        <a
          href="https://github.com/assistant-ui/assistant-ui/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          The full archive lives on GitHub
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}

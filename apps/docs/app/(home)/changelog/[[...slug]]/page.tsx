import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { fetchReleases, type ReleaseGroup } from "@/lib/releases";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { PackageFilter } from "../package-filter";
import { ChangelogList } from "../changelog-list";

const title = "Changelog";
const description = "Release notes for all assistant-ui packages.";
const PER_PAGE = 8;

export const revalidate = 3600;

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

type Params = { slug?: string[] };

function changelogHref(pkg: string | undefined, page: number): string {
  const segments = [pkg, page > 1 ? String(page) : undefined].filter(
    (s): s is string => s !== undefined,
  );
  return segments.length > 0
    ? `/changelog/${segments.join("/")}`
    : "/changelog";
}

function parseSlug(slug: string[] | undefined): {
  pkg: string | undefined;
  page: number;
} {
  const segments = slug?.map(decodeURIComponent) ?? [];
  const last = segments.at(-1);
  const explicitPage = last !== undefined && /^(?:[2-9]|[1-9]\d+)$/.test(last);
  const pkgSegments = explicitPage ? segments.slice(0, -1) : segments;
  return {
    pkg: pkgSegments.length > 0 ? pkgSegments.join("/") : undefined,
    page: explicitPage ? Number(last) : 1,
  };
}

function filterGroups(
  allGroups: ReleaseGroup[],
  pkg: string | undefined,
): ReleaseGroup[] {
  if (!pkg) return allGroups;
  return allGroups
    .map((group) => ({
      ...group,
      releases: group.releases.filter((r) => r.pkg === pkg),
    }))
    .filter((group) => group.releases.length > 0);
}

const pageCount = (groups: ReleaseGroup[]) =>
  Math.max(1, Math.ceil(groups.length / PER_PAGE));

export async function generateStaticParams(): Promise<Params[]> {
  const allGroups = await fetchReleases();
  const total = pageCount(allGroups);
  return Array.from({ length: total }, (_, i) => ({
    slug: i === 0 ? [] : [String(i + 1)],
  }));
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pkg, page } = parseSlug((await params).slug);
  const allGroups = await fetchReleases();

  const allPackages = Array.from(
    new Set(allGroups.flatMap((g) => g.releases.map((r) => r.pkg))),
  ).sort();
  const groups = filterGroups(allGroups, pkg);
  const totalPages = pageCount(groups);
  if (
    allGroups.length > 0 &&
    ((pkg !== undefined && !allPackages.includes(pkg)) || page > totalPages)
  ) {
    notFound();
  }
  const current = page;
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
              href={changelogHref(pkg, current - 1)}
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
              href={changelogHref(pkg, current + 1)}
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

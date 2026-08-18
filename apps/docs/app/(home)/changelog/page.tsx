import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { fetchReleases } from "@/lib/releases";
import { PageFrame } from "@/components/shared/page-frame";
import { PackageFilter } from "./package-filter";
import { ChangelogList } from "./changelog-list";

const title = "Changelog";
const description = "Release notes for all assistant-ui packages.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ pkg?: string }>;
}) {
  const { pkg } = await searchParams;
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

  return (
    <PageFrame pad="sub">
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <header className="max-w-xl">
          <p className="text-muted-foreground mb-3 text-sm">Changelog</p>
          <h1 className="text-2xl font-medium tracking-tight">
            Release history
          </h1>
          <p className="text-muted-foreground mt-2">
            All releases published from the assistant-ui monorepo, grouped by
            date.
          </p>
        </header>
        {allPackages.length > 0 && (
          <PackageFilter packages={allPackages} value={pkg} />
        )}
      </div>

      {groups.length > 0 ? (
        <ChangelogList groups={groups} />
      ) : (
        <p className="text-muted-foreground">
          {allGroups.length === 0
            ? "Unable to load releases. Please try again later."
            : "No releases found for this package."}
        </p>
      )}
    </PageFrame>
  );
}

import type { Metadata } from "next";
import { createOgMetadata } from "@/lib/og";
import { fetchReleases } from "@/lib/releases";
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
    <main className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <header className="mb-12">
        <p className="mb-3 text-muted-foreground text-sm">Changelog</p>
        <h1 className="font-medium text-2xl tracking-tight">Release history</h1>
        <p className="mt-2 text-muted-foreground">
          All releases published from the assistant-ui monorepo, grouped by
          date.
        </p>
      </header>

      {allPackages.length > 0 && (
        <div className="mb-8">
          <PackageFilter packages={allPackages} value={pkg} />
        </div>
      )}

      {groups.length > 0 ? (
        <ChangelogList groups={groups} />
      ) : (
        <p className="text-muted-foreground">
          {allGroups.length === 0
            ? "Unable to load releases. Please try again later."
            : "No releases found for this package."}
        </p>
      )}
    </main>
  );
}

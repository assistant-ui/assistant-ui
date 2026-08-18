import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PACKAGES,
  PACKAGE_CATEGORIES,
  fetchNpmDownloads,
  type PackageCategory,
  type PackageInfo,
} from "@/lib/traction";
import { formatNumber } from "@/lib/format";
import {
  PackageDirectory,
  type DirectoryCategory,
  type DirectoryRow,
} from "@/components/traction/package-directory";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Packages";
const description =
  "Every assistant-ui package on npm, grouped by surface area and ranked by weekly downloads.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function PackagesPage() {
  const npm = await fetchNpmDownloads();

  const ranked = PACKAGES.filter((pkg) => !pkg.deprecated)
    .map((pkg) => ({
      name: pkg.name,
      weekly: npm.perPackage[pkg.name]?.weekly ?? 0,
    }))
    .filter((row) => row.weekly > 0)
    .sort((a, b) => b.weekly - a.weekly);

  const leaders = ranked.slice(0, 4);
  const tail = ranked.slice(4);
  const tailWeekly = tail.reduce((sum, row) => sum + row.weekly, 0);
  const rankedWeekly = ranked.reduce((sum, row) => sum + row.weekly, 0);

  const grouped = groupByCategory(PACKAGES);
  const visibleCategories = (
    Object.keys(PACKAGE_CATEGORIES) as PackageCategory[]
  ).filter((c) => (grouped[c]?.length ?? 0) > 0);

  const activeCount = PACKAGES.filter((pkg) => !pkg.deprecated).length;

  const directoryCategories: DirectoryCategory[] = visibleCategories.map(
    (category) => ({
      key: category,
      label: PACKAGE_CATEGORIES[category].label,
      description: PACKAGE_CATEGORIES[category].description,
      count: grouped[category]?.length ?? 0,
    }),
  );

  const directoryRows: DirectoryRow[] = PACKAGES.map((pkg) => {
    const stats = npm.perPackage[pkg.name];
    const weekly = stats?.weekly ?? 0;
    const mom = computeMoM(stats?.monthly ?? 0, stats?.prevMonthly ?? 0);
    return {
      name: pkg.name,
      description: pkg.description,
      category: pkg.category,
      deprecated: pkg.deprecated ?? false,
      weekly: weekly > 0 && !pkg.deprecated ? formatNumber(weekly) : null,
      series: stats?.series ?? [],
      momLabel: mom?.label ?? null,
      momTone: mom?.tone ?? "flat",
    };
  });

  return (
    <PageFrame pad="sub" className="flex flex-col gap-16 md:gap-20">
      <header className="max-w-2xl">
        <h1 className={typePage}>Every distribution, in one place.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          {activeCount} packages on npm, grouped by surface.
        </p>
      </header>

      <PackageDirectory
        categories={directoryCategories}
        rows={directoryRows}
        concentration={{
          leaders,
          tailNames: tail.map((row) => row.name),
          tailCount: tail.length,
          tailWeekly,
          total: rankedWeekly,
        }}
      />

      <footer>
        <Link
          href="/traction"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          The receipts behind assistant-ui
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

type MoMBadge = {
  label: string;
  tone: "up" | "down" | "flat";
};

function computeMoM(monthly: number, prevMonthly: number): MoMBadge | null {
  if (prevMonthly < 100 || monthly === 0) return null;
  const change = ((monthly - prevMonthly) / prevMonthly) * 100;
  if (!Number.isFinite(change)) return null;
  const capped = Math.max(-99, Math.min(999, change));
  const sign = capped > 0 ? "+" : "";
  const rounded = Math.round(capped);
  let tone: MoMBadge["tone"] = "flat";
  if (rounded >= 5) tone = "up";
  else if (rounded <= -5) tone = "down";
  return { label: `${sign}${rounded}%`, tone };
}

function groupByCategory(
  packages: PackageInfo[],
): Record<PackageCategory, PackageInfo[]> {
  const result = {} as Record<PackageCategory, PackageInfo[]>;
  for (const pkg of packages) {
    const list = result[pkg.category] ?? [];
    list.push(pkg);
    result[pkg.category] = list;
  }
  return result;
}

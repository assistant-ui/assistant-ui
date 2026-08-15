import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Layers, Package } from "lucide-react";
import {
  PACKAGES,
  PACKAGE_CATEGORIES,
  fetchNpmDownloads,
  type PackageCategory,
  type PackageInfo,
} from "@/lib/traction";
import { formatCompact, formatNumber } from "@/lib/format";
import {
  PackageDirectory,
  type DirectoryCategory,
  type DirectoryRow,
} from "@/components/traction/package-directory";
import { createOgMetadata } from "@/lib/og";

const title = "Packages";
const description =
  "Every assistant-ui package on npm, grouped by surface area and ranked by weekly downloads.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const HERO_STAT_ICONS = {
  Package,
  Layers,
  Download,
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
  const surfaceCount = visibleCategories.filter(
    (c) => c !== "deprecated",
  ).length;

  const totalWeekly = Object.values(npm.perPackage).reduce(
    (sum, p) => sum + (p?.weekly ?? 0),
    0,
  );

  const heroStats = [
    {
      icon: HERO_STAT_ICONS.Package,
      value: activeCount.toString(),
      label: "Packages",
      caption: "across the ecosystem",
    },
    {
      icon: HERO_STAT_ICONS.Layers,
      value: surfaceCount.toString(),
      label: "Surfaces",
      caption: "categories shipped",
    },
    {
      icon: HERO_STAT_ICONS.Download,
      value: totalWeekly > 0 ? formatCompact(totalWeekly) : "—",
      label: "Weekly downloads",
      caption: "combined across npm",
    },
  ];

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
    <main className="mx-auto w-full max-w-7xl px-4 pt-14 pb-16 md:pb-24">
      <header className="mb-12 max-w-3xl">
        <Link
          href="/traction"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to traction
        </Link>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Every distribution, in one place.
        </h1>
        <p className="text-muted-foreground mt-3 md:text-lg">
          {activeCount} packages on npm, grouped by surface area. Pick the one
          that fits your stack.
        </p>
      </header>

      <section className="mb-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col gap-3">
                <Icon className="text-muted-foreground size-4" />
                <div className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
                  {stat.value}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">{stat.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {stat.caption}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
    </main>
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

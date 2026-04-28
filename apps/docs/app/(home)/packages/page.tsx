import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  Layers,
  Package,
} from "lucide-react";
import {
  PACKAGES,
  PACKAGE_CATEGORIES,
  fetchNpmDownloads,
  formatCompact,
  formatNumber,
  type PackageCategory,
  type PackageInfo,
} from "@/lib/traction";
import { Sparkline } from "@/components/traction/sparkline";
import { TopPackagesBar } from "@/components/traction/top-packages-bar";
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

  const topPackages = [...PACKAGES]
    .map((pkg) => ({
      name: pkg.name,
      weekly: npm.perPackage[pkg.name]?.weekly ?? 0,
    }))
    .filter((row) => row.weekly > 0)
    .sort((a, b) => b.weekly - a.weekly)
    .slice(0, 12);

  const grouped = groupByCategory(PACKAGES);
  const visibleCategories = (
    Object.keys(PACKAGE_CATEGORIES) as PackageCategory[]
  ).filter((c) => (grouped[c]?.length ?? 0) > 0);

  const totalWeekly = Object.values(npm.perPackage).reduce(
    (sum, p) => sum + (p?.weekly ?? 0),
    0,
  );

  const heroStats = [
    {
      icon: HERO_STAT_ICONS.Package,
      value: PACKAGES.length.toString(),
      label: "Packages",
      caption: "across the ecosystem",
    },
    {
      icon: HERO_STAT_ICONS.Layers,
      value: visibleCategories.length.toString(),
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

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-14 pb-16 md:pb-24">
      <header className="mb-12 max-w-3xl">
        <Link
          href="/traction"
          className="mb-3 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to traction
        </Link>
        <h1 className="font-medium text-3xl tracking-tight md:text-4xl">
          Every distribution, in one place.
        </h1>
        <p className="mt-3 text-muted-foreground md:text-lg">
          {PACKAGES.length} packages on npm, grouped by surface area. Pick the
          one that fits your stack.
        </p>
      </header>

      <section className="mb-12">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {heroStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col gap-3 bg-background p-6"
              >
                <Icon className="size-4 text-muted-foreground" />
                <div className="font-medium text-3xl tabular-nums tracking-tight md:text-4xl">
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

      {topPackages.length > 0 ? (
        <section className="mb-12 rounded-xl border border-border p-4 md:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-medium text-sm">
                Top packages by weekly downloads
              </h2>
              <p className="text-muted-foreground text-xs">
                Last 7 days, npm registry.
              </p>
            </div>
          </div>
          <TopPackagesBar rows={topPackages} />
        </section>
      ) : null}

      <nav
        aria-label="Package categories"
        className="sticky top-12 z-10 -mx-4 mb-12 border-border border-y bg-background/85 px-4 py-3 backdrop-blur"
      >
        <ul className="flex flex-wrap gap-1.5">
          {visibleCategories.map((category) => {
            const meta = PACKAGE_CATEGORIES[category];
            const count = grouped[category]?.length ?? 0;
            return (
              <li key={category}>
                <a
                  href={`#${category}`}
                  className="flex items-center gap-1.5 rounded-md border border-transparent bg-muted/40 px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                >
                  {meta.label}
                  <span className="text-muted-foreground/70 tabular-nums">
                    {count}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="flex flex-col gap-12">
        {visibleCategories.map((category) => {
          const items = grouped[category]!;
          const meta = PACKAGE_CATEGORIES[category];
          return (
            <div
              key={category}
              id={category}
              className="flex scroll-mt-28 flex-col gap-4"
            >
              <div className="flex items-end justify-between gap-4 border-border border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-medium text-sm">{meta.label}</h3>
                  <p className="text-muted-foreground text-xs">
                    {meta.description}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((pkg) => {
                  const stats = npm.perPackage[pkg.name];
                  return (
                    <PackageRow
                      key={pkg.name}
                      pkg={pkg}
                      weekly={stats?.weekly ?? 0}
                      series={stats?.series ?? []}
                      monthly={stats?.monthly ?? 0}
                      prevMonthly={stats?.prevMonthly ?? 0}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
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

const MOM_TONE: Record<MoMBadge["tone"], string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  flat: "text-muted-foreground",
};

function PackageRow({
  pkg,
  weekly,
  series,
  monthly,
  prevMonthly,
}: {
  pkg: PackageInfo;
  weekly: number;
  series: number[];
  monthly: number;
  prevMonthly: number;
}) {
  const npmHref = `https://www.npmjs.com/package/${pkg.name}`;
  const mom = computeMoM(monthly, prevMonthly);
  return (
    <a
      href={npmHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 rounded-lg border border-border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-medium font-mono text-sm">
          {pkg.name}
        </span>
        <ArrowUpRight className="size-3.5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {pkg.description}
      </p>
      {weekly > 0 ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="text-muted-foreground">
              {formatNumber(weekly)} / week
            </span>
            {mom ? (
              <span
                className={`font-medium ${MOM_TONE[mom.tone]}`}
                title="Past 30 days vs prior 30 days"
              >
                {mom.label}
              </span>
            ) : null}
          </div>
          {series.length > 1 ? (
            <Sparkline values={series} className="text-foreground/50" />
          ) : null}
        </div>
      ) : null}
    </a>
  );
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

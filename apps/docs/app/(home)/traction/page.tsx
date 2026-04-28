import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GitFork,
  GitCommit,
  Package,
  Star,
  Users,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github";
import { createOgMetadata } from "@/lib/og";
import {
  PACKAGES,
  PACKAGE_CATEGORIES,
  PROJECT_FACTS,
  TIMELINE_PACKAGES,
  daysSince,
  fetchNpmDownloads,
  fetchRepoStats,
  fetchStarHistory,
  fetchTimelineSeries,
  formatCompact,
  formatNumber,
  type PackageCategory,
  type PackageInfo,
} from "@/lib/traction";
import { DownloadsChart } from "@/components/traction/downloads-chart";
import { Sparkline } from "@/components/traction/sparkline";
import { StarHistoryChart } from "@/components/traction/star-history-chart";
import { TopPackagesBar } from "@/components/traction/top-packages-bar";

const title = "Traction";
const description =
  "GitHub momentum, package coverage, and the numbers behind assistant-ui.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const REPO_URL = "https://github.com/assistant-ui/assistant-ui";

type HeroStat = {
  label: string;
  value: string;
  caption: string;
  icon: typeof Star;
};

const FLAGSHIP_PACKAGE = "@assistant-ui/react";

export default async function TractionPage() {
  const repo = await fetchRepoStats();

  const [npm, starHistory, downloadsTimeline] = await Promise.all([
    fetchNpmDownloads(),
    fetchStarHistory(repo.stars),
    fetchTimelineSeries(TIMELINE_PACKAGES),
  ]);

  const days = daysSince(PROJECT_FACTS.firstCommitDate);
  const flagshipWeekly = npm.perPackage[FLAGSHIP_PACKAGE]?.weekly ?? 0;

  const topPackages = [...PACKAGES]
    .map((pkg) => ({
      name: pkg.name,
      weekly: npm.perPackage[pkg.name]?.weekly ?? 0,
    }))
    .filter((row) => row.weekly > 0)
    .sort((a, b) => b.weekly - a.weekly)
    .slice(0, 12);

  const heroStats: HeroStat[] = [
    {
      label: "GitHub stars",
      value: formatCompact(repo.stars),
      caption: "and counting",
      icon: Star,
    },
    {
      label: "Public packages",
      value: PROJECT_FACTS.publicPackages.toString(),
      caption: "shipped on npm",
      icon: Package,
    },
    {
      label: "Weekly downloads",
      value: flagshipWeekly > 0 ? formatCompact(flagshipWeekly) : "—",
      caption: FLAGSHIP_PACKAGE,
      icon: ArrowUpRight,
    },
    {
      label: "Contributors",
      value: `${PROJECT_FACTS.uniqueAuthors}+`,
      caption: "from the community",
      icon: Users,
    },
  ];

  const detailStats = [
    {
      label: "Forks",
      value: formatNumber(repo.forks),
      icon: GitFork,
    },
    {
      label: "Total commits",
      value: PROJECT_FACTS.totalCommits.toLocaleString(),
      icon: GitCommit,
    },
    {
      label: "Days building in the open",
      value: days.toLocaleString(),
      icon: Sparkles,
    },
    {
      label: "Production examples",
      value: PROJECT_FACTS.examples.toString(),
      icon: Package,
    },
    {
      label: "Showcased apps",
      value: PROJECT_FACTS.showcased.toString(),
      icon: Star,
    },
    {
      label: "Open issues",
      value: repo.openIssues.toString(),
      icon: GitCommit,
    },
  ];

  const grouped = groupByCategory(PACKAGES);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
      <header className="mb-16 max-w-3xl">
        <p className="mb-3 text-muted-foreground text-sm">Traction</p>
        <h1 className="font-medium text-3xl tracking-tight md:text-4xl">
          The receipts behind assistant-ui.
        </h1>
        <p className="mt-3 text-muted-foreground md:text-lg">
          assistant-ui is the open-source UX layer for AI chat. Here are the
          numbers, the packages, and the teams shipping with it today.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <GitHubIcon className="size-4" />
            Star on GitHub
          </a>
          <Button asChild>
            <Link href="/docs">
              Get started <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mb-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
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

      <section className="mb-20 grid gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-xl tracking-tight">
              Stars over time
            </h2>
            <p className="text-muted-foreground text-sm">
              Sampled directly from the GitHub stargazers API.
            </p>
          </div>
          <StarHistoryChart data={starHistory} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-xl tracking-tight">
              Ecosystem downloads
            </h2>
            <p className="text-muted-foreground text-sm">
              Monthly npm downloads, stacked across the{" "}
              {TIMELINE_PACKAGES.length} core packages.
            </p>
          </div>
          <DownloadsChart timeline={downloadsTimeline} />
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="font-medium text-xl tracking-tight">
            Repository momentum
          </h2>
          <p className="text-muted-foreground text-sm">
            Live from the assistant-ui/assistant-ui GitHub repository.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {detailStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-start gap-4 rounded-lg border border-border p-5"
              >
                <Icon className="mt-1 size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-2xl tabular-nums tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {stat.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="font-medium text-xl tracking-tight">
            {PACKAGES.length} public packages
          </h2>
          <p className="text-muted-foreground text-sm">
            One ecosystem, every distribution. Pick the surface that fits your
            stack.
          </p>
        </div>

        {topPackages.length > 0 ? (
          <div className="mb-12 rounded-xl border border-border p-4 md:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-medium text-sm">
                  Top packages by weekly downloads
                </h3>
                <p className="text-muted-foreground text-xs">
                  Last 7 days, npm registry.
                </p>
              </div>
            </div>
            <TopPackagesBar rows={topPackages} />
          </div>
        ) : null}

        <div className="flex flex-col gap-12">
          {(Object.keys(PACKAGE_CATEGORIES) as PackageCategory[]).map(
            (category) => {
              const items = grouped[category];
              if (!items || items.length === 0) return null;
              const meta = PACKAGE_CATEGORIES[category];
              return (
                <div key={category} className="flex flex-col gap-4">
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
            },
          )}
        </div>
      </section>

      <section className="mb-20 rounded-xl border border-border p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2">
            <h2 className="font-medium text-xl tracking-tight">
              Used by teams shipping AI in production.
            </h2>
            <p className="text-muted-foreground text-sm">
              From early-stage startups to LangChain, Mastra, and Y
              Combinator-backed teams. Browse public deployments in the
              showcase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              href="/showcase"
              className={buttonVariants({ variant: "outline" })}
            >
              See the showcase
            </Link>
            <Button asChild>
              <Link href="/docs">
                Read the docs <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-6 py-8 text-center">
        <p className="font-medium text-2xl tracking-tight">
          Build on a library teams already trust.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/docs">
              Get started <ArrowRight />
            </Link>
          </Button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <GitHubIcon className="size-4" />
            {formatCompact(repo.stars)} on GitHub
          </a>
        </div>
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

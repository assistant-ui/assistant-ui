import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GitFork,
  GitCommit,
  Network,
  Package,
  Star,
  Users,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github";
import { createOgMetadata } from "@/lib/og";
import {
  PROJECT_FACTS,
  TIMELINE_PACKAGES,
  daysSince,
  fetchCommitActivity,
  fetchContributors,
  fetchNpmDownloads,
  fetchReleaseActivity,
  fetchStarHistory,
  fetchTimelineSeries,
} from "@/lib/traction";
import { getDependents, getRepo } from "@/lib/github";
import { formatCompact, formatNumber } from "@/lib/format";
import { ActivityHeatmap } from "@/components/traction/activity-heatmap";
import { DownloadsChart } from "@/components/traction/downloads-chart";
import { StarHistoryChart } from "@/components/traction/star-history-chart";
import { WeeklyDownloadsStat } from "@/components/traction/weekly-downloads-stat";

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
  const repo = await getRepo();

  const [
    npm,
    starHistory,
    downloadsTimeline,
    contributors,
    dependents,
    commitActivity,
    releaseActivity,
  ] = await Promise.all([
    fetchNpmDownloads(),
    fetchStarHistory(repo.stars),
    fetchTimelineSeries(TIMELINE_PACKAGES),
    fetchContributors(),
    getDependents(),
    fetchCommitActivity(),
    fetchReleaseActivity(),
  ]);

  const days = daysSince(PROJECT_FACTS.firstCommitDate);
  const flagshipWeekly = npm.perPackage[FLAGSHIP_PACKAGE]?.weekly ?? 0;

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
      value:
        contributors.length > 0
          ? contributors.length.toString()
          : `${PROJECT_FACTS.uniqueAuthors}+`,
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
    ...(dependents && dependents.repos > 0
      ? [
          {
            label: "Public dependents",
            value: formatNumber(dependents.repos),
            icon: Network,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-14 pb-16 md:pb-24">
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
            if (stat.label === "Weekly downloads") {
              return (
                <WeeklyDownloadsStat
                  key={stat.label}
                  flagship={{
                    value: flagshipWeekly,
                    caption: FLAGSHIP_PACKAGE,
                  }}
                  total={{
                    value: npm.totalWeekly,
                    caption: "across all packages",
                  }}
                />
              );
            }
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
        <div className="mt-6 flex justify-center">
          <Link
            href="/packages"
            className={buttonVariants({ variant: "outline" })}
          >
            See packages detail
            <ArrowRight />
          </Link>
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
              Monthly npm downloads for the {TIMELINE_PACKAGES.length} core
              packages.
            </p>
          </div>
          <DownloadsChart timeline={downloadsTimeline} />
        </div>
      </section>

      <section className="mb-20 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-xl tracking-tight">
            Shipping cadence
          </h2>
          <p className="text-muted-foreground text-sm">
            Daily commits over the last year. Cells with a ring mark the days we
            shipped a release.
          </p>
        </div>
        <ActivityHeatmap commits={commitActivity} releases={releaseActivity} />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {contributors.length > 0 ? (
        <section className="mb-20">
          <div className="mb-8 flex flex-col gap-1">
            <h2 className="font-medium text-xl tracking-tight">
              Built by {contributors.length} contributors
            </h2>
            <p className="text-muted-foreground text-sm">
              Thanks to everyone who has shipped code to assistant-ui.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contributors.map((c) => (
              <a
                key={c.login}
                href={c.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`${c.login} · ${c.contributions.toLocaleString()} commit${c.contributions === 1 ? "" : "s"}`}
                className="block transition-transform hover:scale-110"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatarUrl}
                  alt={c.login}
                  width={32}
                  height={32}
                  loading="lazy"
                  className="size-8 rounded-full border border-border"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

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

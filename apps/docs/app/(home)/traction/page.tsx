import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import {
  PACKAGES,
  TIMELINE_PACKAGES,
  daysSince,
  fetchBotCoAuthors,
  fetchCommitActivity,
  fetchContributors,
  fetchNpmDownloads,
  fetchReleaseActivity,
  fetchStarHistory,
  fetchTimelineSeries,
} from "@/lib/traction";
import { getCommitStats, getDependents, getRepo } from "@/lib/github";
import { FLAGSHIP_PACKAGE } from "@/lib/npm";
import { formatCompact, formatNumber } from "@/lib/format";
import { ActivityHeatmap } from "@/components/pages/traction/activity-heatmap";
import { DownloadsChart } from "@/components/pages/traction/downloads-chart";
import { StarHistoryChart } from "@/components/pages/traction/star-history-chart";
import { WeeklyDownloadsStat } from "@/components/pages/traction/weekly-downloads-stat";

const title = "Traction";
const description =
  "Stars, downloads, and shipping cadence behind assistant-ui. Live from GitHub and npm.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function TractionPage() {
  const repo = await getRepo();

  const [
    npm,
    starHistory,
    downloadsTimeline,
    contributors,
    botCoAuthors,
    dependents,
    commitActivity,
    releaseActivity,
    commitStats,
  ] = await Promise.all([
    fetchNpmDownloads(),
    fetchStarHistory(repo?.stars ?? 0),
    fetchTimelineSeries(TIMELINE_PACKAGES),
    fetchContributors(),
    fetchBotCoAuthors(),
    getDependents(),
    fetchCommitActivity(),
    fetchReleaseActivity(),
    getCommitStats(),
  ]);

  const flagshipWeekly = npm.perPackage[FLAGSHIP_PACKAGE]?.weekly ?? 0;
  const publicPackages = PACKAGES.filter((pkg) => !pkg.deprecated).length;

  const extraStats = [
    {
      value: publicPackages.toString(),
      label: "Public packages",
      caption: "shipped on npm",
    },
    ...(repo
      ? [
          {
            value: formatNumber(repo.forks),
            label: "Forks",
            caption: "of the main repo",
          },
        ]
      : []),
    ...(commitStats.total != null
      ? [
          {
            value: commitStats.total.toLocaleString(),
            label: "Commits",
            caption: "on assistant-ui/assistant-ui",
          },
        ]
      : []),
    ...(commitStats.firstCommitDate
      ? [
          {
            value: daysSince(commitStats.firstCommitDate).toLocaleString(),
            label: "Days in the open",
            caption: "since the first commit",
          },
        ]
      : []),
    ...(dependents && dependents.repos > 0
      ? [
          {
            value: formatNumber(dependents.repos),
            label: "Public dependents",
            caption: "repos on GitHub",
          },
        ]
      : []),
  ];

  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={typePage}>The receipts behind assistant-ui.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Stars, downloads, and shipping cadence. Live from GitHub and npm.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 md:gap-x-12">
        <Stat
          value={repo ? formatCompact(repo.stars) : "—"}
          label="GitHub stars"
          caption="and counting"
        />
        <WeeklyDownloadsStat
          flagship={{
            value: flagshipWeekly,
            caption: FLAGSHIP_PACKAGE,
          }}
          total={{
            value: npm.totalWeekly,
            caption: "across all packages",
          }}
        />
        <Stat
          value={contributors ? contributors.length.toString() : "—"}
          label="Contributors"
          caption="from the community"
        />
        {extraStats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-16 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-medium">Stars over time</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Sampled from the GitHub stargazers API.
            </p>
          </div>
          <StarHistoryChart data={starHistory} />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-medium">Ecosystem downloads</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Monthly npm downloads for the {TIMELINE_PACKAGES.length} core
              packages.
            </p>
          </div>
          <DownloadsChart timeline={downloadsTimeline} />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-medium">Shipping cadence</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Daily commits over the last year. A dot marks a release day.
          </p>
        </div>
        <ActivityHeatmap commits={commitActivity} releases={releaseActivity} />
      </section>

      {contributors && contributors.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-medium">
              Built by {contributors.length} contributors
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Everyone who has shipped code to assistant-ui.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contributors.map((c) => (
              <a
                key={c.login}
                href={c.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`${c.login} · ${c.contributions.toLocaleString()} commit${c.contributions === 1 ? "" : "s"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatarUrl}
                  alt={c.login}
                  width={32}
                  height={32}
                  loading="lazy"
                  className="size-8 rounded-full"
                />
              </a>
            ))}
          </div>
          {botCoAuthors.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                Also co-authored by
              </p>
              <div className="flex flex-wrap gap-1.5">
                {botCoAuthors.map((c) => (
                  <a
                    key={c.login}
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${c.login} · co-authored ${c.contributions.toLocaleString()} commit${c.contributions === 1 ? "" : "s"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.avatarUrl}
                      alt={c.login}
                      width={32}
                      height={32}
                      loading="lazy"
                      className="size-8 rounded-full"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Link
          href="/packages"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Every package on npm
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <Link
          href="/showcase"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Shipped in production
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

function Stat({
  value,
  label,
  caption,
}: {
  value: string;
  label: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-3xl font-medium tracking-tight tabular-nums md:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-sm">{label}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">{caption}</div>
    </div>
  );
}

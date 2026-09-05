import type { Metadata } from "next";
import { LiveDot } from "@/components/shared/live-dot";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
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

// A cold render fans out across every package on npm and a year of commits.
export const maxDuration = 60;

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
    fetchStarHistory(),
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
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>The numbers.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Stars, downloads, and shipping cadence, pulled straight from GitHub
          and npm.
        </p>
        <p className="text-muted-foreground mt-6 flex items-center gap-2 font-mono text-[11px] tracking-wide">
          <LiveDot />
          live · refreshes through the day
        </p>
      </header>

      <section className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 md:mt-16 md:grid-cols-4 md:gap-x-12">
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

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The curves</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Plate
              fig="01"
              caption="stars over time · weekly, from the star history api"
            >
              <StarHistoryChart data={starHistory} />
            </Plate>
            <Plate
              fig="02"
              caption={`monthly npm downloads · ${TIMELINE_PACKAGES.length} core packages`}
            >
              <DownloadsChart timeline={downloadsTimeline} />
            </Plate>
          </div>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The cadence</p>
          <div className="mt-6">
            <Plate
              fig="03"
              caption="a year of commits · a dot marks a release day"
            >
              <ActivityHeatmap
                commits={commitActivity}
                releases={releaseActivity}
              />
            </Plate>
          </div>
        </section>

        {contributors && contributors.length > 0 ? (
          <section className="border-foreground/10 border-b py-10 md:py-12">
            <div className="flex items-baseline justify-between">
              <p className={typeEyebrow}>The people</p>
              <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
                {contributors.length}
              </span>
            </div>
            <p className="text-muted-foreground mt-6 text-sm">
              Everyone who has shipped code to assistant-ui.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
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
                    className="size-8"
                  />
                </a>
              ))}
            </div>
            {botCoAuthors.length > 0 ? (
              <div className="mt-8 flex flex-col gap-3">
                <p className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
                  also co-authored by
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
                        className="size-8"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3">
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
      <div className="text-muted-foreground/70 mt-1 font-mono text-[11px] tracking-wide">
        {caption}
      </div>
    </div>
  );
}

function Plate({
  fig,
  caption,
  children,
}: {
  fig: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="border-foreground/10 border p-4 md:p-5">{children}</div>
      <figcaption className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
        fig. {fig} · {caption}
      </figcaption>
    </figure>
  );
}

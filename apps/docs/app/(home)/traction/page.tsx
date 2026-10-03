import type { Metadata } from "next";
import { connection } from "next/server";
import { LiveDot } from "@/components/shared/live-dot";
import { Suspense, cache, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function TractionPage() {
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

      <Suspense fallback={<StatsFallback />}>
        <Stats />
      </Suspense>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <h2 className="text-sm font-medium">The curves</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Plate
              fig="01"
              caption="stars over time · weekly, from the star history api"
            >
              <Suspense fallback={<ChartFallback />}>
                <StarHistory />
              </Suspense>
            </Plate>
            <Plate
              fig="02"
              caption={`monthly npm downloads · ${TIMELINE_PACKAGES.length} core packages`}
            >
              <Suspense fallback={<ChartFallback />}>
                <Downloads />
              </Suspense>
            </Plate>
          </div>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <h2 className="text-sm font-medium">The cadence</h2>
          <div className="mt-6">
            <Plate
              fig="03"
              caption="a year of commits · a dot marks a release day"
            >
              <Suspense fallback={<HeatmapFallback />}>
                <Cadence />
              </Suspense>
            </Plate>
          </div>
        </section>

        <Suspense fallback={<PeopleFallback />}>
          <People />
        </Suspense>
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

// api.npmjs.org limits requests per IP, so every npm and GitHub read waits for a request and renders behind Suspense.
const loadTimeline = cache(() => fetchTimelineSeries(TIMELINE_PACKAGES));
// The chart's five packages are read before the rest of the catalogue competes for npm's window.
const loadNpm = cache(async () => {
  await loadTimeline();
  return fetchNpmDownloads();
});
const loadContributors = cache(() => fetchContributors());

async function Stats() {
  await connection();
  const [npm, repo, contributors, dependents, commitStats] = await Promise.all([
    loadNpm(),
    getRepo(),
    loadContributors(),
    getDependents(),
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
    {
      value: repo ? formatNumber(repo.forks) : "—",
      label: "Forks",
      caption: "of the main repo",
    },
    {
      value:
        commitStats.total != null ? commitStats.total.toLocaleString() : "—",
      label: "Commits",
      caption: "on assistant-ui/assistant-ui",
    },
    {
      value: commitStats.firstCommitDate
        ? daysSince(commitStats.firstCommitDate).toLocaleString()
        : "—",
      label: "Days in the open",
      caption: "since the first commit",
    },
    {
      value:
        dependents && dependents.repos > 0
          ? formatNumber(dependents.repos)
          : "—",
      label: "Public dependents",
      caption: "repos on GitHub",
    },
  ];

  return (
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
  );
}

async function StarHistory() {
  await connection();
  return <StarHistoryChart data={await fetchStarHistory()} />;
}

async function Downloads() {
  await connection();
  return <DownloadsChart timeline={await loadTimeline()} />;
}

async function Cadence() {
  await connection();
  const [commits, releases] = await Promise.all([
    fetchCommitActivity(),
    fetchReleaseActivity(),
  ]);
  return <ActivityHeatmap commits={commits} releases={releases} />;
}

async function People() {
  await connection();
  const [contributors, botCoAuthors] = await Promise.all([
    loadContributors(),
    fetchBotCoAuthors(),
  ]);
  if (!contributors || contributors.length === 0) return null;
  return (
    <section className="border-foreground/10 border-b py-10 md:py-12">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">The people</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
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
  );
}

const STAT_LABELS = [
  ["GitHub stars", "and counting"],
  ["Weekly downloads", "across all packages"],
  ["Contributors", "from the community"],
  ["Public packages", "shipped on npm"],
  ["Forks", "of the main repo"],
  ["Commits", "on assistant-ui/assistant-ui"],
  ["Days in the open", "since the first commit"],
  ["Public dependents", "repos on GitHub"],
] as const;

function StatsFallback() {
  const publicPackages = PACKAGES.filter((pkg) => !pkg.deprecated).length;
  return (
    <section
      aria-busy="true"
      className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 md:mt-16 md:grid-cols-4 md:gap-x-12"
    >
      {STAT_LABELS.map(([label, caption]) =>
        label === "Public packages" ? (
          <Stat
            key={label}
            value={publicPackages.toString()}
            label={label}
            caption={caption}
          />
        ) : (
          <div key={label} className="flex flex-col">
            <Skeleton className="h-9 w-20 motion-reduce:animate-none md:h-10" />
            <div className="mt-2 text-sm">{label}</div>
            <div className="text-muted-foreground/70 mt-1 font-mono text-[11px] tracking-wide">
              {caption}
            </div>
          </div>
        ),
      )}
    </section>
  );
}

function ChartFallback() {
  return (
    <Skeleton className="h-[260px] w-full motion-reduce:animate-none md:h-[360px]" />
  );
}

function HeatmapFallback() {
  return <Skeleton className="h-[220px] w-full motion-reduce:animate-none" />;
}

function PeopleFallback() {
  return (
    <section
      aria-busy="true"
      className="border-foreground/10 border-b py-10 md:py-12"
    >
      <h2 className="text-sm font-medium">The people</h2>
      <Skeleton className="mt-6 h-4 w-64 max-w-full motion-reduce:animate-none" />
      <Skeleton className="mt-5 h-8 w-full motion-reduce:animate-none" />
    </section>
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

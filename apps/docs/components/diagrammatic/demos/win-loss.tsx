import { WinLoss } from "diagrammatic";
import type { DemoExample } from "./types";

function Rows({
  rows,
}: {
  rows: { label: string; data: number[]; title: string }[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-56 flex-col gap-4 font-[family-name:var(--font-mono)] text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="text-foreground/55 w-10">{row.label}</span>
          <WinLoss data={row.data} title={row.title} />
        </div>
      ))}
    </div>
  );
}

export const examples: DemoExample[] = [
  {
    title: "Two seasons of results",
    setup:
      "A club's season page compresses every match into a tick above or below the line — no scores, just outcomes in order, because streaks are what fans actually remember.",
    read: "Above or below; the streaks read before the record does. s24 opens with a title-charge run and s25 opens with a slump — same club, and the eye knows which season had the sacked manager before counting a single tick.",
    chart: (
      <Rows
        rows={[
          {
            label: "s24",
            data: [1, 1, -1, 1, -1, 1, 1, 1, -1, 1, 1, -1],
            title: "season s24",
          },
          {
            label: "s25",
            data: [-1, 1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1],
            title: "season s25",
          },
        ]}
      />
    ),
  },
  {
    title: "Quota hit or missed, twelve months",
    setup:
      "A sales dashboard shows each rep's year as twelve ticks: quota made or missed, month by month, order preserved because trajectory is the conversation.",
    read: "Two reps, one year, different stories: priya misses twice all year; sam's second half goes two-up-seven-down. Same annual attainment percentage would hide that these need opposite conversations — one about a promotion, one about a territory.",
    chart: (
      <Rows
        rows={[
          {
            label: "priya",
            data: [1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, 1],
            title: "priya quota",
          },
          {
            label: "sam",
            data: [1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, -1],
            title: "sam quota",
          },
        ]}
      />
    ),
  },
  {
    title: "Two habits, two weeks",
    setup:
      "A habit tracker renders each habit as kept-or-broken ticks, day by day, because 'mostly' is a lie the streak view refuses to tell.",
    read: "The workout survives weekends; the diet does not — its breaks land on Fridays and Saturdays with calendar precision. The pattern, not the totals, is the coaching: this is a weekend problem wearing a willpower costume.",
    chart: (
      <Rows
        rows={[
          {
            label: "gym",
            data: [1, 1, -1, 1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 1],
            title: "gym days",
          },
          {
            label: "no sugar",
            data: [1, 1, 1, 1, -1, -1, 1, 1, 1, 1, -1, -1, 1, -1],
            title: "no-sugar days",
          },
        ]}
      />
    ),
  },
];

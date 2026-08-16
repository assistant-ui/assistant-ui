import { Pie } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Paper, Report, Slide } from "./scenes";

export const glyph = (
  <Pie
    title="Browser share of sessions"
    items={[
      { label: "chrome", value: 42 },
      { label: "safari", value: 27 },
      { label: "edge", value: 19 },
      { label: "other", value: 12 },
    ]}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Browser share of sessions",
    setup:
      "A frontend team is deciding how long to keep supporting a legacy rendering path, and the answer starts with one question: who actually visits? A month of sessions, four slices.",
    read: "Chrome and Safari together are seven sessions in ten, and 'other' — where the legacy browsers live — is 12%. Whether 12% is a lot is a business question, but the pie makes sure nobody argues about the number itself. Four slices is the ceiling; past that, angles stop being comparable.",
    chart: (
      <Report title="Browser share" chip="sessions">
        <Pie
          title="Browser share of sessions"
          items={[
            { label: "chrome", value: 42 },
            { label: "safari", value: 27 },
            { label: "edge", value: 19 },
            { label: "other", value: 12 },
          ]}
        />
      </Report>
    ),
  },
  {
    title: "Where a concert ticket goes",
    setup:
      "After the fees double the checkout total, a music blog breaks one $85 ticket into who keeps what. A pie works because the whole is exact: every dollar lands in one slice.",
    read: "The artist's slice is real but not the biggest, and the fees slice is within a rounding error of it. The chart explains the anger better than the comment section does: a quarter of the price buys nothing anyone can hear.",
    chart: (
      <Paper
        kicker="Music"
        title="Where the ticket goes"
        source="Source: promoter settlement sheets"
      >
        <Pie
          title="Ticket price breakdown"
          items={[
            { label: "venue", value: 34 },
            { label: "artist", value: 30 },
            { label: "fees", value: 24 },
            { label: "tax", value: 12 },
          ]}
          format={(v) => `${v}%`}
        />
      </Paper>
    ),
  },
  {
    title: "An average weekday, in hours",
    setup:
      "A time-tracking app closes each day by rolling the log into four buckets. The whole is fixed at 24 hours, which is exactly the condition under which a pie is honest.",
    read: "Sleep and work split two-thirds of the disc between them, and 'everything else' — the part that feels like life — is the thinnest slice. Seeing a day as a disc makes the trade visible: screens are wide because something else is narrow.",
    chart: (
      <AppCard title="A weekday, in hours" meta="tracked">
        <Pie
          title="A weekday in hours"
          items={[
            { label: "sleep", value: 8 },
            { label: "work", value: 8 },
            { label: "screens", value: 5 },
            { label: "everything else", value: 3 },
          ]}
          format={(v) => `${v}h`}
        />
      </AppCard>
    ),
  },
  {
    title: "The donut variant: storage by content type",
    setup:
      "Passing `inner` opens the middle of the pie, and the hole is not wasted space: it is where the total lives. A phone's storage screen, redrawn with the headline number in the center.",
    read: "Photos and video are two-thirds of the ring, and the 128 in the middle is the number the user actually came for. Ring plus center answers both questions at once: how much, and made of what.",
    chart: (
      <AppCard title="Storage" meta="128 GB">
        <Pie
          inner={0.62}
          title="Storage by content type"
          items={[
            { label: "photos", value: 49 },
            { label: "video", value: 36 },
            { label: "docs", value: 27 },
            { label: "other", value: 16 },
          ]}
          center="128"
          centerLabel="GB used"
          format={(v) => `${v} GB`}
        />
      </AppCard>
    ),
  },
  {
    title: "The donut variant: a month of spending",
    setup:
      "A budgeting app's month-end screen: four categories around the ring, the total in the hole. The donut earns its place over the pie exactly when a single number deserves the center stage.",
    read: "Rent takes the widest arc by far, and the center's $3.2k makes the scale concrete. The ring answers 'where did it go'; the hole answers 'how much was it'; neither number has to fight the other for space.",
    chart: (
      <Slide title="A month of spending" footer="budget review">
        <Pie
          inner={0.62}
          title="Monthly spend"
          items={[
            { label: "rent", value: 1650 },
            { label: "food", value: 720 },
            { label: "transport", value: 260 },
            { label: "other", value: 570 },
          ]}
          center="$3.2k"
          centerLabel="per month"
          format={(v) => `$${v}`}
        />
      </Slide>
    ),
  },
];

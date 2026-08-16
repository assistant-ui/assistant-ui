import { Pie } from "diagrammatic";
import type { DemoExample } from "./types";
import { AppCard, Report } from "./scenes";

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
];

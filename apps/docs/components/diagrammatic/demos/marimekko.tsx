import { Marimekko } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Market by region and vendor",
    setup:
      "A strategy deck sizes the market two ways at once: column width is each region's share of global revenue, segment height is vendor share within it. Area is therefore actual dollars.",
    read: "Acme leads EMEA and LATAM by share, but the mekko shows why the board still worries: those are the narrow columns. North's fat AMER segment alone out-areas acme's two regional wins combined.",
    chart: (
      <Marimekko
        title="Market by region and vendor"
        columns={[
          {
            label: "AMER",
            width: 62,
            shares: [
              { label: "north", value: 50 },
              { label: "acme", value: 30 },
              { label: "other", value: 20 },
            ],
          },
          {
            label: "EMEA",
            width: 48,
            shares: [
              { label: "north", value: 35 },
              { label: "acme", value: 42 },
              { label: "other", value: 23 },
            ],
          },
          {
            label: "APAC",
            width: 40,
            shares: [
              { label: "north", value: 55 },
              { label: "acme", value: 20 },
              { label: "other", value: 25 },
            ],
          },
          {
            label: "LATAM",
            width: 28,
            shares: [
              { label: "north", value: 28 },
              { label: "acme", value: 50 },
              { label: "other", value: 22 },
            ],
          },
        ]}
      />
    ),
  },
  {
    title: "Streaming hours by platform and content",
    setup:
      "A media analyst maps the streaming war on one rectangle: platform width is total watch-hours, segment height is content mix, so catalog strategy and audience size share a single frame.",
    read: "The widest platform watches the fewest originals — flick is still a licensed-series machine — while mouse, the narrowest, is a third originals. Width times height is the real catalog fight, and no simple bar chart can hold both dimensions.",
    chart: (
      <Marimekko
        title="Hours by platform and content"
        columns={[
          {
            label: "flick",
            width: 58,
            shares: [
              { label: "series", value: 52 },
              { label: "film", value: 30 },
              { label: "originals", value: 18 },
            ],
          },
          {
            label: "prime+",
            width: 40,
            shares: [
              { label: "series", value: 38 },
              { label: "film", value: 42 },
              { label: "originals", value: 20 },
            ],
          },
          {
            label: "mouse",
            width: 34,
            shares: [
              { label: "series", value: 30 },
              { label: "film", value: 34 },
              { label: "originals", value: 36 },
            ],
          },
        ]}
      />
    ),
  },
  {
    title: "Ad spend by channel and format",
    setup:
      "A media buyer defends next year's plan with a mekko: channel width is budget share, format height is the mix inside each channel.",
    read: "Video's slice of social is bigger than all of print — the area comparison the client kept refusing to believe in table form. Search stays a text machine at 72%, and print's zero-video column explains itself.",
    chart: (
      <Marimekko
        title="Ad spend by channel and format"
        columns={[
          {
            label: "social",
            width: 54,
            shares: [
              { label: "video", value: 58 },
              { label: "image", value: 30 },
              { label: "text", value: 12 },
            ],
          },
          {
            label: "search",
            width: 46,
            shares: [
              { label: "video", value: 6 },
              { label: "image", value: 22 },
              { label: "text", value: 72 },
            ],
          },
          {
            label: "print",
            width: 18,
            shares: [
              { label: "video", value: 0 },
              { label: "image", value: 64 },
              { label: "text", value: 36 },
            ],
          },
        ]}
      />
    ),
  },
];

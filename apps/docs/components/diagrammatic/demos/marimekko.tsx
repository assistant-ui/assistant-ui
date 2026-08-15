import { Marimekko } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Market by region and vendor",
    note: "Column width is the region's size, segment height is share; area is revenue.",
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
    note: "The widest platform watches the least originals; width times height is the catalog fight.",
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
    note: "Video's share of social is bigger than all of print; the areas say so directly.",
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

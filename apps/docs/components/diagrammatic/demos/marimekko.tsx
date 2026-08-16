import { Marimekko } from "diagrammatic";
import type { DemoExample } from "./types";
import { Report } from "./scenes";

export const glyph = (
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
);

export const examples: DemoExample[] = [
  {
    title: "Market by region and vendor",
    setup:
      "A strategy deck sizes the market two ways at once: column width is each region's share of global revenue, segment height is vendor share within it. Area is therefore actual dollars.",
    read: "Acme leads EMEA and LATAM by share, but the mekko shows why the board still worries: those are the narrow columns. North's fat AMER segment alone out-areas acme's two regional wins combined, and zephyr — invisible in every regional ranking — quietly holds real area in APAC and JP, the challenger the share tables keep missing.",
    chart: (
      <Report
        title="Market by region and vendor"
        chip="revenue"
        note="Column width is regional share of revenue; height is vendor share within the region."
      >
        <Marimekko
          title="Market by region and vendor"
          columns={[
            {
              label: "AMER",
              width: 62,
              shares: [
                { label: "north", value: 46 },
                { label: "acme", value: 28 },
                { label: "zephyr", value: 14 },
                { label: "other", value: 12 },
              ],
            },
            {
              label: "EMEA",
              width: 48,
              shares: [
                { label: "north", value: 32 },
                { label: "acme", value: 40 },
                { label: "zephyr", value: 16 },
                { label: "other", value: 12 },
              ],
            },
            {
              label: "APAC",
              width: 40,
              shares: [
                { label: "north", value: 48 },
                { label: "acme", value: 18 },
                { label: "zephyr", value: 22 },
                { label: "other", value: 12 },
              ],
            },
            {
              label: "LATAM",
              width: 28,
              shares: [
                { label: "north", value: 26 },
                { label: "acme", value: 48 },
                { label: "zephyr", value: 12 },
                { label: "other", value: 14 },
              ],
            },
            {
              label: "JP",
              width: 22,
              shares: [
                { label: "north", value: 38 },
                { label: "acme", value: 22 },
                { label: "zephyr", value: 30 },
                { label: "other", value: 10 },
              ],
            },
          ]}
        />
      </Report>
    ),
  },
];

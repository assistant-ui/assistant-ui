export type GalleryWidgetCategory =
  | "Data"
  | "Commerce"
  | "Scheduling"
  | "Interaction"
  | "Media"
  | "Content"
  | "Travel";

export type GalleryWidgetProp = {
  name: string;
  type: string;
  description: string;
  default?: string;
};

export type GalleryWidget = {
  slug: string;
  title: string;
  description: string;
  category: GalleryWidgetCategory;
  api: "defineToolkit";
  usage: string;
  props: GalleryWidgetProp[];
};

export const GALLERY_WIDGETS: GalleryWidget[] = [
  {
    slug: "weather",
    title: "Weather",
    description:
      "Live conditions with an animated sky and a five day forecast.",
    category: "Data",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { fetchWeather } from "@/lib/weather";
import { WeatherToolUI } from "@/components/gallery/widgets/weather";

export default defineToolkit({
  get_weather: {
    description: "Show the current weather for a city.",
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }) => ({
      location,
      widget: await fetchWeather(location),
    }),
    render: WeatherToolUI,
  },
});`,
    props: [
      {
        name: "location",
        type: "string",
        description: "City or place to show the weather for.",
      },
    ],
  },
  {
    slug: "chart",
    title: "Chart",
    description: "Plot model generated data as a clean bar chart.",
    category: "Data",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { ChartToolUI } from "@/components/gallery/widgets/chart";

export default defineToolkit({
  render_chart: {
    description: "Plot a series of values as a bar chart.",
    parameters: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      data: z.array(z.object({ label: z.string(), value: z.number() })),
    }),
    execute: async (args) => args,
    render: ChartToolUI,
  },
});`,
    props: [
      {
        name: "title",
        type: "string",
        description: "Heading shown above the chart.",
      },
      {
        name: "subtitle",
        type: "string",
        description: "Optional caption under the title.",
        default: "-",
      },
      {
        name: "data",
        type: "{ label: string; value: number }[]",
        description: "Bars to plot, one entry per data point.",
      },
    ],
  },
  {
    slug: "stock",
    title: "Stock quote",
    description: "Quote card with price, daily change, and a sparkline.",
    category: "Data",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { StockToolUI } from "@/components/gallery/widgets/stock";

export default defineToolkit({
  show_stock_quote: {
    description: "Show a stock quote with price, daily change, and a sparkline.",
    parameters: z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.number(),
      change: z.number(),
      changePercent: z.number(),
      currency: z.string().optional(),
      series: z.array(z.number()),
    }),
    execute: async (args) => args,
    render: StockToolUI,
  },
});`,
    props: [
      { name: "symbol", type: "string", description: "Ticker symbol." },
      { name: "name", type: "string", description: "Full company name." },
      { name: "price", type: "number", description: "Latest price." },
      {
        name: "change",
        type: "number",
        description: "Absolute change vs the previous close.",
      },
      {
        name: "changePercent",
        type: "number",
        description: "Percent change vs the previous close.",
      },
      {
        name: "currency",
        type: "string",
        description: "ISO currency code.",
        default: "USD",
      },
      {
        name: "series",
        type: "number[]",
        description: "Recent prices, plotted as the sparkline.",
      },
    ],
  },
  {
    slug: "event",
    title: "Calendar event",
    description: "Propose a calendar event the user can add or dismiss.",
    category: "Scheduling",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit, hitl } from "@assistant-ui/react";
import { EventToolUI } from "@/components/gallery/widgets/event";

export default defineToolkit({
  propose_event: {
    description: "Propose a calendar event for the user to add or discard.",
    parameters: z.object({
      title: z.string(),
      date: z.string(),
      time: z.string(),
      location: z.string().optional(),
    }),
    execute: hitl(),
    render: EventToolUI,
  },
});`,
    props: [
      { name: "title", type: "string", description: "Event title." },
      {
        name: "date",
        type: "string",
        description: "Human readable date, e.g. Friday, Dec 28.",
      },
      {
        name: "time",
        type: "string",
        description: "Human readable time range.",
      },
      {
        name: "location",
        type: "string",
        description: "Optional venue or address.",
        default: "-",
      },
    ],
  },
  {
    slug: "confirm",
    title: "Confirmation",
    description: "Human in the loop approval before a sensitive action.",
    category: "Interaction",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit, hitl } from "@assistant-ui/react";
import { ConfirmToolUI } from "@/components/gallery/widgets/confirm";

export default defineToolkit({
  confirm_action: {
    description: "Ask the user to approve or decline a sensitive action.",
    parameters: z.object({
      title: z.string(),
      description: z.string().optional(),
    }),
    execute: hitl(),
    render: ConfirmToolUI,
  },
});`,
    props: [
      {
        name: "title",
        type: "string",
        description: "The action to confirm.",
      },
      {
        name: "description",
        type: "string",
        description: "Optional detail shown under the title.",
        default: "-",
      },
      {
        name: "confirmLabel",
        type: "string",
        description: "Label for the approve button.",
        default: "Approve",
      },
      {
        name: "cancelLabel",
        type: "string",
        description: "Label for the decline button.",
        default: "Decline",
      },
    ],
  },
  {
    slug: "order",
    title: "Order summary",
    description: "Itemized order summary with subtotal, tax, and total.",
    category: "Commerce",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { OrderToolUI } from "@/components/gallery/widgets/order";

export default defineToolkit({
  show_order_summary: {
    description: "Show an itemized order summary with subtotal, tax, and total.",
    parameters: z.object({
      merchant: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          detail: z.string().optional(),
          quantity: z.number().optional(),
          price: z.number(),
        }),
      ),
      currency: z.string().optional(),
      taxRate: z.number().optional(),
    }),
    execute: async (args) => args,
    render: OrderToolUI,
  },
});`,
    props: [
      {
        name: "merchant",
        type: "string",
        description: "Store or seller name.",
      },
      {
        name: "items",
        type: "{ name: string; detail?: string; quantity?: number; price: number }[]",
        description: "Line items in the order.",
      },
      {
        name: "currency",
        type: "string",
        description: "ISO currency code.",
        default: "USD",
      },
      {
        name: "taxRate",
        type: "number",
        description: "Tax rate as a fraction, e.g. 0.0875.",
        default: "0",
      },
    ],
  },
  {
    slug: "revenue",
    title: "Revenue trend",
    description: "A headline metric with a supporting line chart.",
    category: "Data",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { RevenueToolUI } from "@/components/gallery/widgets/revenue";

export default defineToolkit({
  show_revenue: {
    description: "Show a revenue metric with a supporting line chart.",
    parameters: z.object({
      label: z.string(),
      value: z.string(),
      change: z.string(),
      caption: z.string().optional(),
      data: z.array(z.object({ label: z.string(), value: z.number() })),
    }),
    execute: async (args) => args,
    render: RevenueToolUI,
  },
});`,
    props: [
      {
        name: "label",
        type: "string",
        description: "Metric name shown above the value.",
      },
      {
        name: "value",
        type: "string",
        description: "Formatted headline value.",
      },
      {
        name: "change",
        type: "string",
        description: "Change indicator shown as a badge.",
      },
      {
        name: "caption",
        type: "string",
        description: "Text shown beside the change.",
        default: "-",
      },
      {
        name: "data",
        type: "{ label: string; value: number }[]",
        description: "Points plotted on the line chart.",
      },
    ],
  },
  {
    slug: "playlist",
    title: "Playlist",
    description: "A ranked track list with inline play controls.",
    category: "Media",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { PlaylistToolUI } from "@/components/gallery/widgets/playlist";

export default defineToolkit({
  show_playlist: {
    description: "Show a playlist as a ranked track list.",
    parameters: z.object({
      title: z.string(),
      tracks: z.array(z.object({ name: z.string(), artist: z.string() })),
    }),
    execute: async (args) => args,
    render: PlaylistToolUI,
  },
});`,
    props: [
      { name: "title", type: "string", description: "Playlist name." },
      {
        name: "tracks",
        type: "{ name: string; artist: string }[]",
        description: "Tracks in play order.",
      },
    ],
  },
  {
    slug: "contacts",
    title: "Contact list",
    description: "People with roles and a per row action.",
    category: "Interaction",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { ContactsToolUI } from "@/components/gallery/widgets/contacts";

export default defineToolkit({
  show_contacts: {
    description: "Show a list of people with their roles.",
    parameters: z.object({
      title: z.string(),
      people: z.array(z.object({ name: z.string(), role: z.string() })),
    }),
    execute: async (args) => args,
    render: ContactsToolUI,
  },
});`,
    props: [
      { name: "title", type: "string", description: "Section label." },
      {
        name: "people",
        type: "{ name: string; role: string }[]",
        description: "People with their roles.",
      },
    ],
  },
  {
    slug: "article",
    title: "Article card",
    description: "An announcement with an eyebrow, body, and actions.",
    category: "Content",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { ArticleToolUI } from "@/components/gallery/widgets/article";

export default defineToolkit({
  show_article: {
    description: "Show an announcement card with a title and body.",
    parameters: z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      body: z.string(),
    }),
    execute: async (args) => args,
    render: ArticleToolUI,
  },
});`,
    props: [
      {
        name: "eyebrow",
        type: "string",
        description: "Small label above the title.",
        default: "-",
      },
      { name: "title", type: "string", description: "Headline." },
      { name: "body", type: "string", description: "Supporting text." },
    ],
  },
  {
    slug: "flight",
    title: "Flight status",
    description: "An origin to destination itinerary with live status.",
    category: "Travel",
    api: "defineToolkit",
    usage: `"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { FlightToolUI } from "@/components/gallery/widgets/flight";

export default defineToolkit({
  show_flight_status: {
    description: "Show a flight's origin, destination, and live status.",
    parameters: z.object({
      number: z.string(),
      date: z.string(),
      origin: z.string(),
      destination: z.string(),
      departTime: z.string(),
      arriveTime: z.string(),
      status: z.string(),
      progress: z.number(),
    }),
    execute: async (args) => args,
    render: FlightToolUI,
  },
});`,
    props: [
      { name: "number", type: "string", description: "Flight number." },
      { name: "date", type: "string", description: "Departure date." },
      { name: "origin", type: "string", description: "Origin city." },
      { name: "destination", type: "string", description: "Destination city." },
      { name: "departTime", type: "string", description: "Departure time." },
      { name: "arriveTime", type: "string", description: "Arrival time." },
      {
        name: "status",
        type: "string",
        description: "Status label, e.g. On time.",
      },
      {
        name: "progress",
        type: "number",
        description: "Journey completion, from 0 to 1.",
      },
    ],
  },
];

export function getWidget(slug: string): GalleryWidget | undefined {
  return GALLERY_WIDGETS.find((widget) => widget.slug === slug);
}

import { Funnel, formatCompact } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Signup funnel, visit to retained",
    setup:
      "A PM traces one cohort of eight thousand visitors through five product stages, because 'conversion is 22%' hides which stage is doing the losing.",
    read: "Every stage keeps roughly seventy percent, and that innocent-looking rate compounds to 8000-becomes-1760 by the end. No single stage is broken, which is the uncomfortable finding: fixing this funnel means nudging four steps, not rescuing one.",
    chart: (
      <Funnel
        title="Signup funnel"
        items={[
          { label: "visited", value: 8000 },
          { label: "signed up", value: 5760 },
          { label: "activated", value: 4000 },
          { label: "subscribed", value: 2720 },
          { label: "retained", value: 1760 },
        ]}
      />
    ),
  },
  {
    title: "A job search, applications to offers",
    setup:
      "After three months, a job seeker turns the spreadsheet of two hundred applications into a funnel to see where the process actually filters.",
    read: "The widest drop is the first one — applied to screened loses three in four before any human reads a word. Past the screen, odds improve at every stage; the lesson is not 'interview better', it is 'get past the parser'.",
    chart: (
      <Funnel
        title="Job search"
        items={[
          { label: "applied", value: 200 },
          { label: "screened", value: 48 },
          { label: "interviewed", value: 16 },
          { label: "onsite", value: 6 },
          { label: "offers", value: 2 },
        ]}
      />
    ),
  },
  {
    title: "Checkout, cart to purchase",
    setup:
      "An ecommerce team instruments the checkout's four steps for one week, hunting for the stage that eats carts.",
    read: "The address form loses more buyers than the payment form — 3.5k against 600 — and the shipping-cost reveal takes another thousand. People will type card numbers; it is the surprise fees and the form friction upstream that kill the sale.",
    chart: (
      <Funnel
        title="Checkout funnel"
        items={[
          { label: "cart", value: 12_400 },
          { label: "address", value: 8_900 },
          { label: "shipping", value: 7_800 },
          { label: "payment", value: 5_200 },
          { label: "purchased", value: 4_600 },
        ]}
        format={(v) => formatCompact(v)}
      />
    ),
  },
];

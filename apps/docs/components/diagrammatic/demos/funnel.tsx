import { Funnel } from "diagrammatic";
import type { DemoExample } from "./types";

export const examples: DemoExample[] = [
  {
    title: "Signup funnel, visit to retained",
    note: "Every stage keeps roughly seventy percent; the compounding is the lesson.",
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
    note: "Two hundred applications become two offers; the widest drop is before any human reads it.",
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
    note: "The shipping-cost step loses more buyers than the payment form does.",
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
      />
    ),
  },
];

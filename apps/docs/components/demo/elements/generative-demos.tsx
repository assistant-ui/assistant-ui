"use client";

import { TemplatePreview } from "@/components/gallery/template-preview";
import { getGenerativeElement } from "@/lib/generative-elements";

const TALL_TEMPLATES = new Set(["generative-portfolio", "generative-playlist"]);

function GenerativeDemo({ slug }: { slug: string }) {
  const entry = getGenerativeElement(slug);
  if (!entry) return null;

  return (
    <div
      data-aui-theme="elements"
      className={
        TALL_TEMPLATES.has(slug)
          ? "aui-gallery [&_[data-aui='card']]:bg-background w-full max-w-sm origin-center scale-[0.68]"
          : "aui-gallery [&_[data-aui='card']]:bg-background w-full max-w-sm origin-center scale-[0.85]"
      }
    >
      <TemplatePreview tree={entry.template.tree} />
    </div>
  );
}

export function GenerativeBookingDemo() {
  return <GenerativeDemo slug="generative-booking" />;
}

export function GenerativeOrderStatusDemo() {
  return <GenerativeDemo slug="generative-order-status" />;
}

export function GenerativePortfolioDemo() {
  return <GenerativeDemo slug="generative-portfolio" />;
}

export function GenerativeStaysDemo() {
  return <GenerativeDemo slug="generative-stays" />;
}

export function GenerativeFlightTrackerDemo() {
  return <GenerativeDemo slug="generative-flight-tracker" />;
}

export function GenerativeCreateEventDemo() {
  return <GenerativeDemo slug="generative-create-event" />;
}

export function GenerativeViewEventDemo() {
  return <GenerativeDemo slug="generative-view-event" />;
}

export function GenerativePlaylistDemo() {
  return <GenerativeDemo slug="generative-playlist" />;
}

export function GenerativeRideStatusDemo() {
  return <GenerativeDemo slug="generative-ride-status" />;
}

export function GenerativeDraftEmailDemo() {
  return <GenerativeDemo slug="generative-draft-email" />;
}

export function GenerativeCartDemo() {
  return <GenerativeDemo slug="generative-cart" />;
}

export function GenerativeChannelMessageDemo() {
  return <GenerativeDemo slug="generative-channel-message" />;
}

export function GenerativeReceiptDemo() {
  return <GenerativeDemo slug="generative-receipt" />;
}

export function GenerativePlayerCardDemo() {
  return <GenerativeDemo slug="generative-player-card" />;
}

export function GenerativeEventSessionDemo() {
  return <GenerativeDemo slug="generative-event-session" />;
}

export function GenerativeNotifyConfirmDemo() {
  return <GenerativeDemo slug="generative-notify-confirm" />;
}

export function GenerativeCreateTaskDemo() {
  return <GenerativeDemo slug="generative-create-task" />;
}

export function GenerativeWeatherCurrentDemo() {
  return <GenerativeDemo slug="generative-weather-current" />;
}

export function GenerativeSoftwarePurchaseDemo() {
  return <GenerativeDemo slug="generative-software-purchase" />;
}

export function GenerativeChartAreaDemo() {
  return <GenerativeDemo slug="generative-chart-area" />;
}

export function GenerativeChartLineDemo() {
  return <GenerativeDemo slug="generative-chart-line" />;
}

export function GenerativeChartBarsDemo() {
  return <GenerativeDemo slug="generative-chart-bars" />;
}

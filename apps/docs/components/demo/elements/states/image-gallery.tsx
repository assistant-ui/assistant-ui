"use client";

import {
  ImageGallery,
  type GalleryImage,
} from "@/components/assistant-ui/elements/image-gallery";
import { defineStates } from "./types";

const IMAGES: readonly GalleryImage[] = [
  {
    id: "inconvo",
    src: "/screenshot/inconvo.png",
    alt: "Inconvo answering a question from a database",
    caption: "Build AI agents that answer questions from your databases.",
    source: { label: "Inconvo", url: "https://inconvo.com/" },
  },
  {
    id: "helicone",
    src: "/screenshot/helicone.png",
    alt: "Helicone's observability dashboard",
    caption: "Open-source LLM observability and gateway platform.",
    source: { label: "Helicone", url: "https://www.helicone.ai/" },
  },
  {
    id: "open-canvas",
    src: "/screenshot/open-canvas.png",
    alt: "Open Canvas editing a document beside its chat",
    caption: "Open-source collaborative writing interface with AI.",
    source: { label: "Open Canvas", url: "https://opencanvas.langchain.com/" },
  },
  {
    id: "stockbroker",
    src: "/screenshot/stockbroker.png",
    alt: "LangGraph Stockbroker confirming a trade",
    caption: "AI assistant for researching public company financials.",
    source: {
      label: "LangGraph Stockbroker",
      url: "https://assistant-ui-stockbroker.vercel.app/",
    },
  },
  {
    id: "coreviz",
    src: "/screenshot/coreviz.png",
    alt: "CoreViz searching a photo library",
    caption: "Search and analyze photos and videos with natural language.",
    source: { label: "CoreViz", url: "https://coreviz.io/" },
  },
  {
    id: "komodo",
    src: "/screenshot/komodo.png",
    alt: "Komodo's assistant inside a health data workspace",
    caption: "Healthcare insights from a chat interface.",
    source: { label: "Komodo Health", url: "https://www.komodohealth.com/" },
  },
  {
    id: "portal",
    src: "/screenshot/portal.png",
    alt: "Portal's agent workspace",
    caption: "An agent workspace built on assistant-ui.",
    source: { label: "Portal" },
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single",
    label: "Single image",
    note: "Only one image came back, so the grid holds a single tile.",
    Component: () => <ImageGallery images={IMAGES.slice(0, 1)} />,
  },
  {
    key: "full-grid",
    label: "Full grid",
    note: "Six images fill the grid with no overflow tile.",
    Component: () => <ImageGallery images={IMAGES.slice(0, 6)} />,
  },
  {
    key: "overflow",
    label: "Overflow",
    note: "More images than fit, so the last tile counts the rest.",
    Component: () => <ImageGallery images={IMAGES} maxVisible={4} />,
  },
  {
    key: "error",
    label: "Broken image",
    note: "An image that fails to load shows a placeholder in its tile.",
    Component: () => (
      <ImageGallery
        images={[
          IMAGES[0]!,
          {
            id: "removed",
            src: "/screenshot/removed-listing.png",
            alt: "A product screenshot that was taken down",
            caption: "This image is no longer available.",
          },
          IMAGES[2]!,
        ]}
      />
    ),
  },
]);

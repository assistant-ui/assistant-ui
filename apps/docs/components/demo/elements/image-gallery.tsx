"use client";

import {
  ImageGallery,
  type GalleryImage,
} from "@/components/assistant-ui/elements/image-gallery";

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
];

export function ImageGalleryDemo() {
  return <ImageGallery images={IMAGES} maxVisible={3} />;
}

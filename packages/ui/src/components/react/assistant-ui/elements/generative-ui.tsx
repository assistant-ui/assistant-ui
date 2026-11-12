"use client";

import { lazy, Suspense } from "react";
import type { GenerativeUILibrary } from "@assistant-ui/generative-ui/react";
import { defaultGenerativeUILibrary } from "@assistant-ui/generative-ui/react";
import { GenerativeMarkdown } from "./generative-markdown";
import { GeoMap, type GeoMapPlace } from "./geo-map";

// The diagram engine (beautiful-mermaid and elkjs) is large, so in the browser
// it loads only when a Diagram actually renders. The fallback matches the
// diagram's own rendering skeleton, so nothing shifts when the chunk arrives.
// On the server the module loads up front and renders synchronously, so
// server rendering and static generation output the finished diagram, and
// hydration keeps that HTML until the browser chunk arrives.
type MermaidDiagramComponent =
  typeof import("./mermaid-diagram").MermaidDiagram;

const loadMermaidDiagram = () =>
  import("./mermaid-diagram").then((mod) => mod.MermaidDiagram);

let serverMermaidDiagram: MermaidDiagramComponent | undefined;
if (typeof window === "undefined") {
  void loadMermaidDiagram().then((component) => {
    serverMermaidDiagram = component;
  });
}

const LazyMermaidDiagram = lazy(() =>
  loadMermaidDiagram().then((component) => ({ default: component })),
);

const MermaidDiagram = (props: { code: string }) => {
  const Diagram = serverMermaidDiagram ?? LazyMermaidDiagram;
  return <Diagram {...props} />;
};

const DiagramSkeleton = () => (
  <div
    data-slot="mermaid-skeleton"
    aria-label="Rendering diagram"
    className="aui-mermaid-skeleton bg-muted flex h-32 animate-pulse items-center justify-center gap-3 rounded-b-lg p-4"
  >
    <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
    <div className="bg-muted-foreground/20 h-px w-10" />
    <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
    <div className="bg-muted-foreground/20 h-px w-10" />
    <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
  </div>
);

const markdownBase = defaultGenerativeUILibrary.Markdown!;

const pinsOf = (places: unknown): GeoMapPlace[] =>
  (Array.isArray(places) ? places : []).flatMap((place: unknown, index) => {
    if (place === null || typeof place !== "object") return [];
    const { label, lat, lng, detail } = place as Record<string, unknown>;
    return typeof label === "string" &&
      typeof lat === "number" &&
      typeof lng === "number"
      ? [
          {
            id: String(index),
            label,
            lat,
            lng,
            description: typeof detail === "string" ? detail : undefined,
          },
        ]
      : [];
  });

/** `MarkdownTextPrimitive` cannot be reused here: it reads from message-part context, not a prop string. */
export const styledGenerativeUILibrary: GenerativeUILibrary = {
  ...defaultGenerativeUILibrary,
  Markdown: {
    properties: markdownBase.properties,
    streamProperties: markdownBase.streamProperties,
    description: "A markdown string, rendered with GitHub-flavored markdown.",
    render: GenerativeMarkdown,
  },
  Diagram: {
    ...defaultGenerativeUILibrary.Diagram!,
    render: ({ code, title }) => (
      <figure data-aui="diagram">
        <Suspense fallback={<DiagramSkeleton />}>
          <MermaidDiagram code={typeof code === "string" ? code : ""} />
        </Suspense>
        {typeof title === "string" || typeof title === "number" ? (
          <figcaption data-aui="diagram-title">{title}</figcaption>
        ) : null}
      </figure>
    ),
  },
  Map: {
    ...defaultGenerativeUILibrary.Map!,
    render: ({ places, route }) => {
      const pins = pinsOf(places);
      return (
        <GeoMap
          data-aui="map"
          className="max-w-none [&_[data-slot=geo-map-coordinates]]:hidden"
          places={pins}
          routes={
            route && pins.length > 1
              ? [
                  {
                    id: "route",
                    points: pins.map(({ lat, lng }) => [lat, lng] as const),
                  },
                ]
              : undefined
          }
        />
      );
    },
  },
};

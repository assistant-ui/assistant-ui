import type { ReactNode } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

const MAX_CARDS = 10;

export const alertVocabulary = {
  Alert: {
    description:
      "A highlighted message conveying urgency. `tone` drives the severity.",
    properties: z.object({
      title: z.string().optional().describe("Alert title."),
      description: z
        .string()
        .optional()
        .describe("Supporting description text."),
      tone: z
        .enum(["info", "success", "warning", "danger"])
        .optional()
        .describe("Severity tone; defaults to `info`."),
    }),
    render: ({ title, description, tone, children }) => (
      <div data-aui="alert" data-aui-tone={tone ?? "info"} role="alert">
        {title ? <header data-aui="alert-title">{title}</header> : null}
        {description ? <p data-aui="alert-desc">{description}</p> : null}
        {children}
      </div>
    ),
  },
  Carousel: {
    description: "A horizontally scrollable group of `Card` children (max 10).",
    properties: z.object({}),
    render: ({ children }) => {
      const cards: ReactNode[] = Array.isArray(children)
        ? children.slice(0, MAX_CARDS)
        : children == null || children === false
          ? []
          : [children];
      return (
        <div data-aui="carousel">
          {cards.map((card, i) => (
            <div key={i} data-aui="carousel-slide">
              {card}
            </div>
          ))}
        </div>
      );
    },
  },
} satisfies GenerativeUILibrary;

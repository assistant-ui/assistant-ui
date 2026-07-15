import { Children } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { ALERT_TONES } from "../ir";

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
        .enum(ALERT_TONES)
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
    description:
      "A horizontally scrollable group of `Card` children (max 10). Set `label` for an accessible name.",
    properties: z.object({
      label: z
        .string()
        .optional()
        .describe("Accessible label for the carousel."),
    }),
    render: ({ label, children }) => {
      const cards = Children.toArray(children).slice(0, MAX_CARDS);
      const n = cards.length;
      return (
        <div
          data-aui="carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label={label}
          tabIndex={0}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              data-aui="carousel-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
            >
              {card}
            </div>
          ))}
        </div>
      );
    },
  },
} satisfies GenerativeUILibrary;

import * as React from "react";
import type { GenerativeUILibrary } from "../types";
import { alertDefinitions } from "./definitions/alert";
import { toTextContent } from "./toTextContent";
import { MAX_CARDS } from "./carouselValues";

type CarouselRenderProps = {
  label?: string;
  children?: React.ReactNode;
};

type CarouselMeasurement = {
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
};

function CarouselRender({ label, children }: CarouselRenderProps) {
  const carouselId = React.useId();
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = React.useState<
    CarouselMeasurement | undefined
  >(undefined);
  const cards = React.Children.toArray(children).slice(0, MAX_CARDS);
  const n = cards.length;

  React.useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const measure = () => {
      const maxScrollLeft = Math.max(
        carousel.scrollWidth - carousel.clientWidth,
        0,
      );
      const position = Math.abs(carousel.scrollLeft);
      const next = {
        overflows: maxScrollLeft > 0,
        atStart: position <= 1,
        atEnd: position >= maxScrollLeft - 1,
      };
      setMeasurement((current) =>
        current?.overflows === next.overflows &&
        current.atStart === next.atStart &&
        current.atEnd === next.atEnd
          ? current
          : next,
      );
    };

    measure();
    carousel.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    resizeObserver?.observe(carousel);
    carousel
      .querySelectorAll(':scope > [data-aui="carousel-slide"]')
      .forEach((slide) => resizeObserver?.observe(slide));

    return () => {
      carousel.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      resizeObserver?.disconnect();
    };
  }, [n]);

  const move = (direction: "previous" | "next") => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const rtl = getComputedStyle(carousel).direction === "rtl";
    const startOf = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rtl ? -rect.right : rect.left;
    };
    const edge = startOf(carousel);
    const starts = Array.from(
      carousel.querySelectorAll(':scope > [data-aui="carousel-slide"]'),
      startOf,
    );
    let current = 0;
    starts.forEach((start, index) => {
      if (
        Math.abs(start - edge) < Math.abs((starts[current] ?? start) - edge)
      ) {
        current = index;
      }
    });
    const origin = starts[current];
    const target = starts[current + (direction === "next" ? 1 : -1)];
    if (origin === undefined || target === undefined) return;
    const left = rtl ? origin - target : target - origin;
    if (typeof carousel.scrollBy === "function") carousel.scrollBy({ left });
    else carousel.scrollLeft += left;
  };

  return (
    <div data-aui="carousel-frame">
      <div
        ref={carouselRef}
        id={carouselId}
        data-aui="carousel"
        role={label ? "region" : "group"}
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
      {measurement?.overflows ? (
        <div data-aui="carousel-controls">
          <button
            type="button"
            data-aui="carousel-prev"
            aria-label="Previous slide"
            aria-controls={carouselId}
            disabled={measurement.atStart}
            onClick={() => move("previous")}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5l7 7-7 7" transform="translate(24 0) scale(-1 1)" />
            </svg>
          </button>
          <button
            type="button"
            data-aui="carousel-next"
            aria-label="Next slide"
            aria-controls={carouselId}
            disabled={measurement.atEnd}
            onClick={() => move("next")}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const alertVocabulary = {
  Alert: {
    ...alertDefinitions.Alert,
    render: ({ title, description, tone, children }) => {
      const alertTitle = toTextContent(title);
      const alertDescription = toTextContent(description);
      return (
        <div data-aui="alert" data-aui-tone={tone ?? "info"} role="alert">
          {alertTitle !== null && alertTitle !== "" ? (
            <header data-aui="alert-title">{alertTitle}</header>
          ) : null}
          {alertDescription !== null && alertDescription !== "" ? (
            <p data-aui="alert-desc">{alertDescription}</p>
          ) : null}
          {children}
        </div>
      );
    },
  },
  Carousel: {
    ...alertDefinitions.Carousel,
    render: CarouselRender,
  },
} satisfies GenerativeUILibrary;

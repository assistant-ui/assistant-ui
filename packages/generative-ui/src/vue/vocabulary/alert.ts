import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  useId,
} from "vue";
import { alertDefinitions } from "../../vocabulary/definitions/alert";
import { MAX_CARDS } from "../../vocabulary/carouselValues";
import { toTextContent } from "../../vocabulary/toTextContent";

type Measurement = {
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
};

export const alertVocabulary = {
  Alert: {
    ...alertDefinitions.Alert,
    component: defineComponent({
      name: "GenerativeUIAlert",
      props: ["title", "description", "tone"],
      setup(props, { slots }) {
        return () => {
          const title = toTextContent(props.title);
          const description = toTextContent(props.description);
          return h(
            "div",
            {
              "data-aui": "alert",
              "data-aui-tone": props.tone ?? "info",
              role: "alert",
            },
            [
              ...(title
                ? [h("header", { "data-aui": "alert-title" }, String(title))]
                : []),
              ...(description
                ? [h("p", { "data-aui": "alert-desc" }, String(description))]
                : []),
              ...(slots.default?.() ?? []),
            ],
          );
        };
      },
    }),
  },
  Carousel: {
    ...alertDefinitions.Carousel,
    component: defineComponent({
      name: "GenerativeUICarousel",
      props: ["label"],
      setup: function GenerativeUICarousel(props, { slots }) {
        const track = ref<HTMLDivElement>();
        const measurement = ref<Measurement>();
        const carouselId = useId();
        let observer: ResizeObserver | undefined;
        let slideCount = -1;

        const slides = () =>
          track.value?.querySelectorAll<HTMLElement>(
            ':scope > [data-aui="carousel-slide"]',
          ) ?? [];

        const measure = () => {
          const carousel = track.value;
          if (!carousel) return;
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
          if (
            measurement.value?.overflows !== next.overflows ||
            measurement.value.atStart !== next.atStart ||
            measurement.value.atEnd !== next.atEnd
          ) {
            measurement.value = next;
          }
        };

        const observeSlides = () => {
          const carousel = track.value;
          if (!carousel) return;
          const children = slides();
          if (slideCount === children.length) return;
          slideCount = children.length;
          observer?.disconnect();
          if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(measure);
            observer.observe(carousel);
            children.forEach((slide) => observer?.observe(slide));
          }
          measure();
        };

        onMounted(() => {
          observeSlides();
          track.value?.addEventListener("scroll", measure, { passive: true });
          window.addEventListener("resize", measure);
        });
        onUpdated(() => {
          void nextTick(observeSlides);
        });
        onUnmounted(() => {
          track.value?.removeEventListener("scroll", measure);
          window.removeEventListener("resize", measure);
          observer?.disconnect();
        });

        const move = (direction: "previous" | "next") => {
          const carousel = track.value;
          if (!carousel) return;
          const rtl = getComputedStyle(carousel).direction === "rtl";
          const startOf = (element: Element) => {
            const rect = element.getBoundingClientRect();
            return rtl ? -rect.right : rect.left;
          };
          const edge = startOf(carousel);
          const starts = Array.from(slides(), startOf);
          let current = 0;
          starts.forEach((start, index) => {
            if (
              Math.abs(start - edge) <
              Math.abs((starts[current] ?? start) - edge)
            ) {
              current = index;
            }
          });
          const origin = starts[current];
          const target = starts[current + (direction === "next" ? 1 : -1)];
          if (origin === undefined || target === undefined) return;
          const left = rtl ? origin - target : target - origin;
          if (typeof carousel.scrollBy === "function")
            carousel.scrollBy({ left });
          else carousel.scrollLeft += left;
        };

        const arrow = (previous: boolean) =>
          h(
            "svg",
            {
              "aria-hidden": "true",
              viewBox: "0 0 24 24",
              width: "16",
              height: "16",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
            },
            [
              h("path", {
                d: "M9 5l7 7-7 7",
                ...(previous
                  ? { transform: "translate(24 0) scale(-1 1)" }
                  : {}),
              }),
            ],
          );

        return () => {
          const cards = (slots.default?.() ?? []).slice(0, MAX_CARDS);
          const count = cards.length;
          return h("div", { "data-aui": "carousel-frame" }, [
            h(
              "div",
              {
                ref: track,
                id: carouselId,
                "data-aui": "carousel",
                role: props.label ? "region" : "group",
                "aria-roledescription": "carousel",
                "aria-label": props.label,
                tabindex: 0,
              },
              cards.map((card, index) =>
                h(
                  "div",
                  {
                    "data-aui": "carousel-slide",
                    role: "group",
                    "aria-roledescription": "slide",
                    "aria-label": `${index + 1} of ${count}`,
                  },
                  [card],
                ),
              ),
            ),
            ...(measurement.value?.overflows
              ? [
                  h("div", { "data-aui": "carousel-controls" }, [
                    h(
                      "button",
                      {
                        type: "button",
                        "data-aui": "carousel-prev",
                        "aria-label": "Previous slide",
                        "aria-controls": carouselId,
                        disabled: measurement.value.atStart,
                        onClick: () => move("previous"),
                      },
                      [arrow(true)],
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        "data-aui": "carousel-next",
                        "aria-label": "Next slide",
                        "aria-controls": carouselId,
                        disabled: measurement.value.atEnd,
                        onClick: () => move("next"),
                      },
                      [arrow(false)],
                    ),
                  ]),
                ]
              : []),
          ]);
        };
      },
    }),
  },
};

import { defineComponent, h, useId } from "vue";
import { useSpecElement } from "generative-frame/spec/vue";
import { listDefinitions } from "../../vocabulary/definitions/list";
import { INTERACTIVE_DESCENDANT_SELECTOR } from "../../vocabulary/listItemValues";
import { sequenceItems } from "../../vocabulary/structureValues";

export const listVocabulary = {
  ListView: {
    ...listDefinitions.ListView,
    component: defineComponent({
      name: "GenerativeUIListView",
      props: [],
      setup(_props, { slots }) {
        return () =>
          h("ul", { "data-aui": "listview" }, slots.default?.() ?? []);
      },
    }),
  },
  ListViewItem: {
    ...listDefinitions.ListViewItem,
    component: defineComponent({
      name: "GenerativeUIListViewItem",
      props: [],
      emits: ["press"],
      setup: function GenerativeUIListViewItem(_props, { emit, slots }) {
        const context = useSpecElement();
        const contentId = useId();
        const isNested = (event: Event) => {
          const hit = (event.target as Element).closest(
            INTERACTIVE_DESCENDANT_SELECTOR,
          );
          return hit !== null && hit !== event.currentTarget;
        };
        return () =>
          h(
            "li",
            { "data-aui": "listview-item" },
            Object.hasOwn(context.element.on ?? {}, "press")
              ? [
                  h(
                    "div",
                    {
                      "data-aui": "listview-item-trigger",
                      style: { position: "relative" },
                      onClick: (event: MouseEvent) => {
                        if (!isNested(event)) emit("press", undefined);
                      },
                    },
                    [
                      h("button", {
                        type: "button",
                        "aria-labelledby": contentId,
                        style: {
                          position: "absolute",
                          inset: "0",
                          width: "100%",
                          height: "100%",
                          padding: "0",
                          border: "0",
                          background: "transparent",
                          cursor: "pointer",
                        },
                        onClick: () => emit("press", undefined),
                      }),
                      h(
                        "div",
                        {
                          "data-aui": "listview-item-content",
                          id: contentId,
                          style: { position: "relative" },
                        },
                        slots.default?.() ?? [],
                      ),
                    ],
                  ),
                ]
              : (slots.default?.() ?? []),
          );
      },
    }),
  },
  Steps: {
    ...listDefinitions.Steps,
    component: defineComponent({
      name: "GenerativeUISteps",
      props: ["steps"],
      setup(props) {
        return () =>
          h(
            "ol",
            { "data-aui": "steps" },
            sequenceItems(props.steps).map((step, index) =>
              h("li", { key: index, "data-aui": "steps-item" }, [
                h("div", { "data-aui": "steps-title" }, step.title),
                step.detail !== undefined
                  ? h("div", { "data-aui": "steps-detail" }, step.detail)
                  : null,
              ]),
            ),
          );
      },
    }),
  },
  Timeline: {
    ...listDefinitions.Timeline,
    component: defineComponent({
      name: "GenerativeUITimeline",
      props: ["items"],
      setup(props) {
        return () =>
          h(
            "ol",
            { "data-aui": "timeline" },
            sequenceItems(props.items).map((item, index) =>
              h("li", { key: index, "data-aui": "timeline-item" }, [
                item.time !== undefined
                  ? h("div", { "data-aui": "timeline-time" }, item.time)
                  : null,
                h("div", { "data-aui": "timeline-title" }, item.title),
                item.detail !== undefined
                  ? h("div", { "data-aui": "timeline-detail" }, item.detail)
                  : null,
              ]),
            ),
          );
      },
    }),
  },
};

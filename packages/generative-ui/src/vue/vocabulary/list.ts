import { defineComponent, h } from "vue";
import { useSpecElement } from "generative-frame/spec/vue";
import { listDefinitions } from "../../vocabulary/definitions/list";
import { INTERACTIVE_DESCENDANT_SELECTOR } from "../../vocabulary/listItemValues";

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
                      role: "button",
                      tabindex: 0,
                      "data-aui": "listview-item-trigger",
                      onClick: (event: MouseEvent) => {
                        if (!isNested(event)) emit("press", undefined);
                      },
                      onKeydown: (event: KeyboardEvent) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        if (isNested(event)) return;
                        if (event.key === " ") event.preventDefault();
                        emit("press", undefined);
                      },
                    },
                    slots.default?.() ?? [],
                  ),
                ]
              : (slots.default?.() ?? []),
          );
      },
    }),
  },
};

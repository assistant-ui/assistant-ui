import { defineComponent, h, ref, useId } from "vue";
import { useSpecElement } from "generative-frame/spec/vue";
import { layoutDefinitions } from "../../vocabulary/definitions/layout";
import { collectFormValuesFromEvent } from "../../vocabulary/collectFormValues";
import { boxStyle } from "../../vocabulary/layoutValues";
import { tabLabels } from "../../vocabulary/structureValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import { textChildren } from "./textChildren";

export const layoutVocabulary = {
  Card: {
    ...layoutDefinitions.Card,
    component: defineComponent({
      name: "GenerativeUICard",
      props: ["title", "padding", "background", "asForm", "confirm", "cancel"],
      emits: ["confirm", "cancel"],
      setup: function GenerativeUICard(props, { slots, emit }) {
        const context = useSpecElement();
        const live = (event: "confirm" | "cancel") =>
          Object.hasOwn(context.element.on ?? {}, event);
        return () => {
          const confirm = props.confirm as { label?: unknown } | undefined;
          const cancel = props.cancel as { label?: unknown } | undefined;
          const asForm = props.asForm === true;
          const background = props.background as string | undefined;
          const title = toTextContent(props.title);
          const footer =
            confirm || cancel
              ? h("footer", { "data-aui": "card-footer" }, [
                  confirm
                    ? h(
                        "button",
                        {
                          type: asForm ? "submit" : "button",
                          "data-aui": "card-confirm",
                          onClick: asForm
                            ? undefined
                            : () => {
                                if (live("confirm")) emit("confirm", undefined);
                              },
                        },
                        textChildren(confirm.label),
                      )
                    : null,
                  cancel
                    ? h(
                        "button",
                        {
                          type: "button",
                          "data-aui": "card-cancel",
                          onClick: () => {
                            if (live("cancel")) emit("cancel", undefined);
                          },
                        },
                        textChildren(cancel.label),
                      )
                    : null,
                ])
              : null;
          return h(
            asForm ? "form" : "section",
            {
              "data-aui": "card",
              "data-aui-padding": props.padding,
              "data-aui-background": background,
              "data-aui-surface":
                background !== undefined || footer ? "" : undefined,
              style:
                background !== undefined
                  ? { background, color: "white" }
                  : undefined,
              "data-aui-asform": props.asForm || undefined,
              onSubmit: asForm
                ? (event: Event) => {
                    event.preventDefault();
                    if (live("confirm")) {
                      emit(
                        "confirm",
                        collectFormValuesFromEvent(
                          event as Event & { currentTarget: HTMLFormElement },
                        ),
                      );
                    }
                  }
                : undefined,
            },
            [
              title
                ? h("header", { "data-aui": "card-title" }, String(title))
                : null,
              ...(slots.default?.() ?? []),
              footer,
            ],
          );
        };
      },
    }),
  },
  Col: {
    ...layoutDefinitions.Col,
    component: defineComponent({
      name: "GenerativeUICol",
      props: ["gap", "align"],
      setup(props, { slots }) {
        return () =>
          h(
            "div",
            {
              "data-aui": "col",
              "data-aui-gap": props.gap,
              "data-aui-align": props.align,
            },
            slots.default?.() ?? [],
          );
      },
    }),
  },
  Row: {
    ...layoutDefinitions.Row,
    component: defineComponent({
      name: "GenerativeUIRow",
      props: ["gap", "align", "justify"],
      setup(props, { slots }) {
        return () =>
          h(
            "div",
            {
              "data-aui": "row",
              "data-aui-gap": props.gap,
              "data-aui-align": props.align,
              "data-aui-justify": props.justify,
            },
            slots.default?.() ?? [],
          );
      },
    }),
  },
  Spacer: {
    ...layoutDefinitions.Spacer,
    component: defineComponent({
      name: "GenerativeUISpacer",
      props: [],
      setup() {
        return () => h("div", { "data-aui": "spacer" });
      },
    }),
  },
  Badge: {
    ...layoutDefinitions.Badge,
    component: defineComponent({
      name: "GenerativeUIBadge",
      props: ["value", "variant"],
      setup(props, { slots }) {
        return () =>
          h(
            "span",
            { "data-aui": "badge", "data-aui-variant": props.variant },
            [...textChildren(props.value), ...(slots.default?.() ?? [])],
          );
      },
    }),
  },
  Box: {
    ...layoutDefinitions.Box,
    component: defineComponent({
      name: "GenerativeUIBox",
      props: ["width", "height", "radius", "background"],
      setup(props, { slots }) {
        return () =>
          h(
            "div",
            {
              "data-aui": "box",
              "data-aui-radius": props.radius === "full" ? "full" : undefined,
              style: boxStyle(
                props.width as string | number | undefined,
                props.height as string | number | undefined,
                props.radius as "full" | number | undefined,
                props.background as string | undefined,
              ),
            },
            slots.default?.() ?? [],
          );
      },
    }),
  },
  Tabs: {
    ...layoutDefinitions.Tabs,
    component: defineComponent({
      name: "GenerativeUITabs",
      props: ["tabs"],
      setup: function useTabs(props, { slots }) {
        const selected = ref(0);
        const id = useId();
        return () => {
          const panels = slots.default?.() ?? [];
          const labels = tabLabels(props.tabs, panels.length);
          if (labels.length === 0) return null;
          const current = Math.min(selected.value, labels.length - 1);
          const last = labels.length - 1;
          return h("div", { "data-aui": "tabs" }, [
            h(
              "div",
              {
                role: "tablist",
                "data-aui": "tabs-list",
                onKeydown: (event: KeyboardEvent) => {
                  const next =
                    event.key === "ArrowRight"
                      ? current === last
                        ? 0
                        : current + 1
                      : event.key === "ArrowLeft"
                        ? current === 0
                          ? last
                          : current - 1
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? last
                            : undefined;
                  if (next === undefined) return;
                  event.preventDefault();
                  selected.value = next;
                  (event.currentTarget as HTMLElement)
                    .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [next]?.focus();
                },
              },
              labels.map((label, index) =>
                h(
                  "button",
                  {
                    key: index,
                    type: "button",
                    role: "tab",
                    id: `${id}-tab-${index}`,
                    "aria-selected": index === current,
                    "aria-controls": `${id}-panel-${index}`,
                    tabindex: index === current ? 0 : -1,
                    "data-aui": "tabs-tab",
                    onClick: () => (selected.value = index),
                  },
                  label,
                ),
              ),
            ),
            ...labels.map((_, index) =>
              h(
                "div",
                {
                  key: index,
                  role: "tabpanel",
                  id: `${id}-panel-${index}`,
                  "aria-labelledby": `${id}-tab-${index}`,
                  hidden: index !== current,
                  tabindex: 0,
                  "data-aui": "tabs-panel",
                },
                panels[index],
              ),
            ),
          ]);
        };
      },
    }),
  },
};

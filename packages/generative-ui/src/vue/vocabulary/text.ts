import { defineComponent, h } from "vue";
import { textDefinitions } from "../../vocabulary/definitions/text";
import { textChildren } from "./textChildren";

export const textVocabulary = {
  Header: {
    ...textDefinitions.Header,
    component: defineComponent({
      name: "GenerativeUIHeader",
      props: ["text", "size"],
      setup(props, { slots }) {
        return () =>
          h(
            "h2",
            { "data-aui": "header", "data-aui-size": props.size ?? "lg" },
            [...textChildren(props.text), ...(slots.default?.() ?? [])],
          );
      },
    }),
  },
  Text: {
    ...textDefinitions.Text,
    component: defineComponent({
      name: "GenerativeUIText",
      props: ["value", "size", "weight", "color"],
      setup(props, { slots }) {
        return () =>
          h(
            "span",
            {
              "data-aui": "text",
              "data-aui-size": props.size ?? "md",
              "data-aui-weight": props.weight,
              "data-aui-color": props.color,
            },
            [...textChildren(props.value), ...(slots.default?.() ?? [])],
          );
      },
    }),
  },
  Caption: {
    ...textDefinitions.Caption,
    component: defineComponent({
      name: "GenerativeUICaption",
      props: ["value"],
      setup(props, { slots }) {
        return () =>
          h("p", { "data-aui": "caption" }, [
            ...textChildren(props.value),
            ...(slots.default?.() ?? []),
          ]);
      },
    }),
  },
};

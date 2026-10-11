import { defineComponent, h } from "vue";
import { mediaDefinitions } from "../../vocabulary/definitions/media";
import { imageStyle } from "../../vocabulary/imageStyle";

export const mediaVocabulary = {
  Image: {
    ...mediaDefinitions.Image,
    component: defineComponent({
      name: "GenerativeUIImage",
      props: ["src", "alt", "size", "round"],
      setup(props) {
        return () => {
          const { numericSize, style } = imageStyle(
            props.size as string | number | undefined,
            props.round as boolean | undefined,
          );
          return h("img", {
            "data-aui": "image",
            "data-aui-size": numericSize === undefined ? props.size : undefined,
            "data-aui-round": props.round || undefined,
            src: props.src,
            alt: props.alt,
            style,
          });
        };
      },
    }),
  },
  Divider: {
    ...mediaDefinitions.Divider,
    component: defineComponent({
      name: "GenerativeUIDivider",
      props: ["flush"],
      setup(props) {
        return () =>
          h("hr", {
            "data-aui": "divider",
            "data-aui-flush": props.flush || undefined,
          });
      },
    }),
  },
};

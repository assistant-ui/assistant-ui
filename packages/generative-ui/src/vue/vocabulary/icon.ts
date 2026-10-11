import { defineComponent, h } from "vue";
import { iconDefinitions } from "../../vocabulary/definitions/icon";
import { ICON_GLYPHS, ICON_SIZE_PX } from "../../vocabulary/iconGlyphs";

export const iconVocabulary = {
  Icon: {
    ...iconDefinitions.Icon,
    component: defineComponent({
      name: "GenerativeUIIcon",
      props: ["name", "size"],
      setup(props) {
        return () => {
          const glyph = ICON_GLYPHS[props.name as keyof typeof ICON_GLYPHS];
          if (!glyph) return null;
          const px =
            ICON_SIZE_PX[(props.size as keyof typeof ICON_SIZE_PX) ?? "md"];
          return h(
            "svg",
            {
              "data-aui": "icon",
              "data-aui-name": props.name,
              "data-aui-size": props.size,
              viewBox: "0 0 24 24",
              width: px,
              height: px,
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true",
            },
            glyph.map(([tag, attributes]) => h(tag, attributes)),
          );
        };
      },
    }),
  },
};

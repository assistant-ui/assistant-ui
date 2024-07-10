import { type Declaration, Plugin } from "postcss";
import valueParser, { type ParsedValue } from "postcss-value-parser";

const tailwindcssAui = (): Plugin => ({
  postcssPlugin: "@assistant-ui/tailwindcss-transformer",
  AtRule: {
    keyframes: (atRule) => {
      if (!atRule.params.startsWith("aui-")) {
        atRule.params = `aui-${atRule.params}`;
      }
    },
  },
  Declaration(decl: Declaration) {
    if (decl.prop.startsWith("--tw-")) {
      decl.prop = decl.prop.replace("--tw-", "--aui-");
    }
    const value: ParsedValue = valueParser(decl.value);
    value.walk((node) => {
      if (node.type === "function" && node.value === "var") {
        node.nodes.forEach((n) => {
          if (n.type === "word" && n.value.startsWith("--tw-")) {
            n.value = n.value.replace("--tw-", "--aui-");
          }
        });
      }
    });
    decl.value = value.toString();

    if (
      (decl.prop === "animation" || decl.prop === "animation-name") &&
      !decl.value.startsWith("aui-")
    ) {
      decl.value = `aui-${decl.value}`;
    }
  },
});

tailwindcssAui.postcss = true;

export = tailwindcssAui;

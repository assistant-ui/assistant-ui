import { type Declaration, type Plugin } from "postcss";
import valueParser, { type ParsedValue } from "postcss-value-parser";

export const replaceVariableScope: Plugin = {
  postcssPlugin: "Replace variable scope",
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
  },
};

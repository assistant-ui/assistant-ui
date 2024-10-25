import plugin from "tailwindcss/plugin.js";
import markdownCSS from "../../generated/markdown.css.json";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents(markdownCSS);
});

export default auiPlugin;

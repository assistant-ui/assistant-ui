import plugin from "tailwindcss/plugin.js";
import markdownCSS from "./data/markdown.css.json";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents(markdownCSS);
});

export default auiPlugin;

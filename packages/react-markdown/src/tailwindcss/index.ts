import plugin from "tailwindcss/plugin.js";
import markdownCSS from "../../dist/styles/tailwindcss/markdown.css.json";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents(markdownCSS);
});

export default auiPlugin;

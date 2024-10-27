import plugin from "tailwindcss/plugin.js";
import trieveCSS from "../../dist/styles/tailwindcss/trieve.css.json";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents(trieveCSS);
});

export default auiPlugin;

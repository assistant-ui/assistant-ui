import plugin from "tailwindcss/plugin.js";
import trieveCSS from "./data/trieve.css.json";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents(trieveCSS);
});

export default auiPlugin;

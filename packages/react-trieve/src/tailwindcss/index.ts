import plugin from "tailwindcss/plugin.js";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents({
    '@import "@assistant-ui/react-trieve/styles/tailwindcss/trieve.css"': "",
  });
});

export default auiPlugin;

import plugin from "tailwindcss/plugin.js";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents({
    '@import "@assistant-ui/react-markdown/styles/tailwindcss/markdown.css"':
      "",
  });
});

export default auiPlugin;

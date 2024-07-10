import plugin from "tailwindcss/plugin";

const auiPlugin = plugin.withOptions<{}>(() => ({ addComponents }) => {
  addComponents({
    '@import "@assistant-ui/react-markdown/styles/tailwindcss/markdown.css"':
      "",
  });
});

export default auiPlugin;

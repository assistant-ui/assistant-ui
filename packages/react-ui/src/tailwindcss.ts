import plugin from "tailwindcss/plugin";

type AssisstantTailwindPluginOptions = {
  components?: ("markdown" | "thread" | "assistant-modal")[];
  shadcn?: boolean;
};

const auiPlugin = plugin.withOptions<AssisstantTailwindPluginOptions>(
  ({ components = [], shadcn = false } = {}) =>
    ({ addComponents }) => {
      const markdown = components.includes("markdown");
      const assistantModal = components.includes("assistant-modal");
      const thread =
        markdown || assistantModal || components.includes("thread");

      if (thread) {
        addComponents({
          '@import "@assistant-ui/react-ui/tailwindcss/styles/base-components.css"':
            "",
        });
        addComponents({
          '@import "@assistant-ui/react-ui/tailwindcss/styles/thread.css"': "",
        });

        if (!shadcn) {
          addComponents({
            '@import "@assistant-ui/react-ui/tailwindcss/themes/default.css"':
              "",
          });
        }
      }

      if (assistantModal) {
        addComponents({
          '@import "@assistant-ui/react-ui/tailwindcss/styles/modal.css"': "",
        });
      }

      if (markdown) {
        addComponents({
          '@import "@assistant-ui/react-ui/tailwindcss/styles/markdown.css"':
            "",
        });
      }
    },
  ({ shadcn = false } = {}) => {
    const prefix = shadcn ? "--aui-" : "--";
    return {
      theme: {
        extend: {
          colors: {
            aui: {
              border: `hsl(var(${prefix}border))`,
              input: `hsl(var(${prefix}input))`,
              ring: `hsl(var(${prefix}ring))`,
              background: `hsl(var(${prefix}background))`,
              foreground: `hsl(var(${prefix}foreground))`,
              primary: {
                DEFAULT: `hsl(var(${prefix}primary))`,
                foreground: `hsl(var(${prefix}primary-foreground))`,
              },
              //   secondary: {
              //     DEFAULT: "hsl(var(--aui-secondary))",
              //     foreground: "hsl(var(--aui-secondary-foreground))",
              //   },
              //   destructive: {
              //     DEFAULT: "hsl(var(--aui-destructive))",
              //     foreground: "hsl(var(--aui-destructive-foreground))",
              //   },
              muted: {
                DEFAULT: `hsl(var(${prefix}muted))`,
                foreground: `hsl(var(${prefix}muted-foreground))`,
              },
              accent: {
                DEFAULT: `hsl(var(${prefix}accent))`,
                foreground: `hsl(var(${prefix}accent-foreground))`,
              },
              popover: {
                DEFAULT: `hsl(var(${prefix}popover))`,
                foreground: `hsl(var(${prefix}popover-foreground))`,
              },
              card: {
                DEFAULT: `hsl(var(${prefix}card))`,
                foreground: `hsl(var(${prefix}card-foreground))`,
              },
            },
          },
        },
      },
    };
  },
);

export default auiPlugin;

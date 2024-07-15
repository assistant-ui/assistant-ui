import plugin from "tailwindcss/plugin";

type AssisstantTailwindPluginOptions = {
  components?: ("default-theme" | "base" | "thread" | "assistant-modal")[];
  shadcn?: boolean;
};

const auiPlugin = plugin.withOptions<AssisstantTailwindPluginOptions>(
  ({ components = ["assistant-modal", "thread"], shadcn = false } = {}) =>
    ({ addComponents }) => {
      const assistantModal = components.includes("assistant-modal");
      const thread = assistantModal || components.includes("thread");
      const base = thread || components.includes("base");
      const defaultTheme = components.includes("default-theme");

      if (defaultTheme && shadcn)
        throw new Error("default-theme cannot be used with shadcn");

      if (defaultTheme || (base && !shadcn)) {
        addComponents({
          '@import "@assistant-ui/react/styles/themes/default.css"': "",
        });
      }

      if (base) {
        addComponents({
          '@import "@assistant-ui/react/styles/tailwindcss/base-components.css"':
            "",
        });
      }

      if (thread) {
        addComponents({
          '@import "@assistant-ui/react/styles/tailwindcss/thread.css"': "",
        });
      }

      if (assistantModal) {
        addComponents({
          '@import "@assistant-ui/react/styles/tailwindcss/modal.css"': "",
        });
      }
    },
  ({ shadcn = false } = {}) => {
    const prefix = !shadcn ? "--aui-" : "--";
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
              secondary: {
                DEFAULT: `hsl(var(${prefix}secondary))`,
                foreground: `hsl(var(${prefix}secondary-foreground))`,
              },
              destructive: {
                DEFAULT: `hsl(var(${prefix}destructive))`,
                foreground: `hsl(var(${prefix}destructive-foreground))`,
              },
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

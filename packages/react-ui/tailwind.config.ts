import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--aui-border))",
        input: "hsl(var(--aui-input))",
        ring: "hsl(var(--aui-ring))",
        background: "hsl(var(--aui-background))",
        foreground: "hsl(var(--aui-foreground))",
        primary: {
          DEFAULT: "hsl(var(--aui-primary))",
          foreground: "hsl(var(--aui-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--aui-secondary))",
          foreground: "hsl(var(--aui-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--aui-destructive))",
          foreground: "hsl(var(--aui-destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--aui-muted))",
          foreground: "hsl(var(--aui-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--aui-accent))",
          foreground: "hsl(var(--aui-accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--aui-popover))",
          foreground: "hsl(var(--aui-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--aui-card))",
          foreground: "hsl(var(--aui-card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--aui-radius)",
        md: "calc(var(--aui-radius) - 2px)",
        sm: "calc(var(--aui-radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--aui-radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--aui-radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;

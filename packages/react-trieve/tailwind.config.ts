import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config = {
  content: ["./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: {
    backgroundOpacity: false,
    touchAction: false,
    scrollSnapType: false,
    gradientColorStops: false,
    fontVariantNumeric: false,
    ringOffsetWidth: false,
    ringOffsetColor: false,
    ringOpacity: false,
    boxShadowColor: false,
    blur: false,
    brightness: false,
    contrast: false,
    grayscale: false,
    hueRotate: false,
    invert: false,
    saturate: false,
    sepia: false,
    dropShadow: false,
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    container: false,
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
      borderRadius: {
        lg: "var(--aui-radius)",
        md: "calc(var(--aui-radius) - 2px)",
        sm: "calc(var(--aui-radius) - 4px)",
      },
    },
  },
  plugins: [
    animatePlugin,
    require("@assistant-ui/react/tailwindcss")({ components: [] }),
  ],
} satisfies Config;

export default config;

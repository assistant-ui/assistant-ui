import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@assistant-ui/react-playground/{dist,src}/**/*.{js,ts,tsx}",
  ],
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@assistant-ui/react/tailwindcss")({
      components: ["default-theme"],
    }),
  ],
} satisfies Config;

export default config;

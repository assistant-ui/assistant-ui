import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  plugins: [
    require("tailwindcss-animate"),
    require("@assistant-ui/react/tailwindcss"),
  ],
} satisfies Config;

export default config;

import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // The assistant-ui packages route their internal React usage through
      // @assistant-ui/tap. Aliasing react to the tap standalone shim lets this
      // app run without React installed.
      alias: {
        "react/compiler-runtime":
          "@assistant-ui/tap/standalone-shim/compiler-runtime",
        react: "@assistant-ui/tap/standalone-shim",
      },
    },
  },
});

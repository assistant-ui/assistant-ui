import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-07",
  css: ["~/assets/css/main.css"],
  components: [
    "./components",
    {
      path: "../../../packages/ui/src/components/vue/assistant-ui",
      pathPrefix: false,
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

import { Build } from "@assistant-ui/tsbuildutils";

await Build.start().transpileCSS({
  jsonEntrypoints: [
    "src/styles/tailwindcss/modal.css",
    "src/styles/tailwindcss/thread.css",
    "src/styles/tailwindcss/markdown.css",
  ],
  cssEntrypoints: [
    "src/styles/index.css",
    "src/styles/modal.css",
    "src/styles/markdown.css",
  ],
});

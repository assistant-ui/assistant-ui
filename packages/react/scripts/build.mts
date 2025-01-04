import { Build } from "@assistant-ui/tsbuildutils";

await Build.start()
  .transpileCSS({
    tailwindEntrypoints: [
      "src/styles/tailwindcss/base-components.css",
      "src/styles/tailwindcss/modal.css",
      "src/styles/tailwindcss/thread.css",
      "src/styles/themes/default.css",
      "src/styles/themes/shadcn-extras.css",
    ],
    cssEntrypoints: ["src/styles/index.css", "src/styles/modal.css"],
  })
  .transpileTypescript();

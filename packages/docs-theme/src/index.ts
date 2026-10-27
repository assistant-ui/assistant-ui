import { createTheme, type DocsTheme } from "@farming-labs/docs";
import { shadcn } from "@farming-labs/theme/shadcn";

const createAssistantTheme = createTheme({
  ...shadcn({
    ui: {
      layout: {
        contentWidth: 848,
        sidebarWidth: 260,
        tocWidth: 224,
        header: { height: 48 },
      },
      typography: {
        font: {
          style: {
            sans: "var(--font-public-sans, ui-sans-serif), system-ui, sans-serif",
            mono: "var(--font-jetbrains-mono, ui-monospace), monospace",
          },
          h1: { size: "1.5rem", weight: 500, letterSpacing: "-0.025em" },
          h2: { size: "1.25rem", weight: 500, letterSpacing: "-0.02em" },
          h3: { size: "1rem", weight: 500, letterSpacing: "-0.01em" },
          body: { size: "0.875rem", lineHeight: "1.7" },
        },
      },
      codeBlock: { showCopyButton: true, showLineNumbers: false },
    },
  }),
  name: "assistant-ui",
});

export const assistantUi = (overrides: assistantUi.Options = {}): DocsTheme =>
  createAssistantTheme(overrides);

export namespace assistantUi {
  export interface Options extends Partial<DocsTheme> {}
}

export { DocsBrand } from "./brand";

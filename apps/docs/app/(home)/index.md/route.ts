import { SETUP_SNIPPETS } from "@/lib/home-setup";
import { createMarkdownResponse } from "@/lib/markdown-response";

export function GET() {
  return createMarkdownResponse(
    [
      "# assistant-ui · The frontend library for AI agents",
      "Open-source components and a runtime for production chat. Connect a backend through an adapter and compose the thread, messages, tools, and composer in your application.",
      "## @assistant-ui/react",
      "The runtime owns the thread, the stream, and the tools. Choose the adapter that matches your backend.",
      ...SETUP_SNIPPETS.map(({ label, caption, code, docs }) =>
        [
          `### ${label}`,
          caption,
          ["```tsx", code, "```"].join("\n"),
          `[Read the ${label} guide](${docs})`,
        ].join("\n\n"),
      ),
      "[Examples](/examples) · [Components](/components) · [Contact sales](/contact-sales) · [Privacy](/privacy-policy) · [Documentation index](/llms.txt)",
      "",
    ].join("\n\n"),
  );
}

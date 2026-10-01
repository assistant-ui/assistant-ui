import { LinkPreview } from "@assistant-ui/ui/components/assistant-ui/elements/link-preview.tsx";
import { defineSections } from "../types";
import { FAVICON, IMAGES } from "./_assets";

export default defineSections([
  {
    id: "link-preview",
    title: "Link preview",
    category: "content",
    notes: "Card and compact layouts with data: images and favicon.",
    render: () => (
      <div className="flex flex-col gap-3">
        <LinkPreview
          href="https://github.com/assistant-ui/assistant-ui"
          title="assistant-ui"
          description="Typescript/React library for AI chat, now running inside a VS Code webview."
          image={IMAGES.noon}
          imageAlt="A green valley"
          siteName="GitHub"
        />
        <LinkPreview
          href="https://www.assistant-ui.com/docs/guides/vscode"
          title="VS Code extension guide"
          description="Tunnel fetch over postMessage and theme the kit with --vscode-* tokens."
          image={IMAGES.night}
          imageAlt="Hills at night"
          siteName="assistant-ui"
          favicon={FAVICON}
          layout="compact"
        />
      </div>
    ),
  },
]);

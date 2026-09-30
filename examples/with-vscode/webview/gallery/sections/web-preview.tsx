import { WebPreview } from "@assistant-ui/ui/components/assistant-ui/elements/web-preview.tsx";
import { defineSections } from "../types";

const BARS = ["h-6", "h-4", "h-8", "h-5"];

function Content() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <span className="text-[15px] font-medium tracking-tight">
        Quarterly summary
      </span>
      <span className="text-foreground/55 text-xs leading-relaxed">
        Stand-in content. The element draws the chrome only; a real app passes a
        sandboxed frame, which the webview's frame-src 'none' would block.
      </span>
      <div className="flex items-end gap-1.5">
        {BARS.map((height, i) => (
          <span
            key={i}
            className={`w-6 rounded-t bg-blue-500/70 dark:bg-blue-400/70 ${height}`}
          />
        ))}
      </div>
    </div>
  );
}

export default defineSections([
  {
    id: "web-preview",
    title: "Web preview",
    category: "content",
    notes: "Browser chrome around stand-in content, loaded and loading.",
    render: () => (
      <div className="flex flex-col gap-3">
        <WebPreview origin="scf.auiusercontent.com" loading={false}>
          <Content />
        </WebPreview>
        <WebPreview origin="scf.auiusercontent.com" loading>
          <Content />
        </WebPreview>
      </div>
    ),
  },
]);

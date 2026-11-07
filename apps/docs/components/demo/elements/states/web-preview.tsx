"use client";

import { WebPreview } from "@/components/assistant-ui/elements/web-preview";
import { defineStates } from "./types";

const noop = () => {};

function SummaryPage() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <span className="text-[15px] font-medium tracking-tight">
        Quarterly summary
      </span>
      <span className="text-foreground/55 text-xs leading-relaxed">
        Revenue grew 18% over the last quarter, led by self-serve plans.
      </span>
      <div className="flex gap-1.5">
        {[62, 38, 84, 51].map((height, i) => (
          <span
            key={i}
            className="w-6 rounded-t bg-blue-500/70 dark:bg-blue-400/70"
            style={{ height: `${height * 0.4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

const FRAME_DOC = `<!doctype html><html><body style="margin:0;font:13px system-ui;padding:20px;color:#444">
<h1 style="font-size:15px;margin:0 0 8px">Signup form</h1>
<label style="display:block;margin-bottom:6px">Email</label>
<input style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px" placeholder="you@company.com">
</body></html>`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "loading",
    label: "Loading",
    note: "The frame is still loading, so the content is hidden behind a placeholder.",
    Component: () => (
      <WebPreview
        origin="scf.auiusercontent.com"
        loading
        onReload={noop}
        onOpenExternal={noop}
      >
        <SummaryPage />
      </WebPreview>
    ),
  },
  {
    key: "loaded",
    label: "Loaded",
    note: "The preview finished loading and shows its content.",
    Component: () => (
      <WebPreview
        origin="scf.auiusercontent.com"
        loading={false}
        onReload={noop}
        onOpenExternal={noop}
      >
        <SummaryPage />
      </WebPreview>
    ),
  },
  {
    key: "sandboxed-frame",
    label: "Sandboxed frame",
    note: "The child is a sandboxed iframe holding model-written markup.",
    Component: () => (
      <WebPreview
        origin="k3f9a2.auiusercontent.com"
        loading={false}
        onReload={noop}
        onOpenExternal={noop}
      >
        <iframe
          title="Signup form preview"
          sandbox=""
          srcDoc={FRAME_DOC}
          className="block h-36 w-full border-0"
        />
      </WebPreview>
    ),
  },
  {
    key: "long-content",
    label: "Long URL",
    note: "A long origin and path truncate inside the URL bar.",
    Component: () => (
      <WebPreview
        origin="preview-7f3c91d2-feat-persist-composer-drafts.auiusercontent.com/dashboard/settings/billing?tab=invoices"
        loading={false}
        onReload={noop}
        onOpenExternal={noop}
      >
        <SummaryPage />
      </WebPreview>
    ),
  },
]);

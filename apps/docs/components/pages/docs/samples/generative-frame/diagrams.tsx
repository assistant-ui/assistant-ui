import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* How a widget is wired, as implemented in packages/generative-frame:
   - createWidget renders the bootstrap document once through
     SafeContentFrame.renderHtml (src/widget.ts, src/bootstrap.ts).
   - The runtime posts genframe:ready to the parent; the host answers with
     genframe:init and transfers a MessageChannel port (DESIGN.md, "In-frame
     runtime").
   - JSON-RPC methods on the port are listed in src/protocol.ts (METHODS).
   - The runtime morphs #gf-root on each animation frame and holds scripts
     until genframe/end (src/runtime). */

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

const TO_FRAME = ["genframe/write", "genframe/end", "genframe/screenshot"];
const TO_HOST = ["ui/message", "tools/call", "genframe/error"];

export function BridgeDiagram() {
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1.35fr]">
      <div className={cn(field, "flex flex-col p-6")}>
        <p className="font-medium">Your page</p>
        <p className={cn(mono, "text-muted-foreground mt-1 text-xs")}>
          https://your.app
        </p>
        <ul className={cn(mono, "mt-5 flex flex-col gap-2 text-xs sm:text-sm")}>
          <li>createWidget()</li>
          <li>widget.write(chunk)</li>
          <li>widget.end()</li>
          <li>onPrompt, onError</li>
        </ul>
      </div>

      <div className="flex flex-col justify-center gap-5 px-2 py-2 md:py-0">
        <p className="text-muted-foreground text-center text-xs">
          MessagePort, JSON-RPC
        </p>
        <ul className={cn(mono, "flex flex-col gap-1.5 text-xs")}>
          {TO_FRAME.map((method) => (
            <li key={method} className="flex items-center gap-2">
              <span className="flex-1 truncate">{method}</span>
              <ArrowRight
                aria-label="to the frame"
                className="text-muted-foreground size-3.5 shrink-0"
              />
            </li>
          ))}
        </ul>
        <ul className={cn(mono, "flex flex-col gap-1.5 text-xs")}>
          {TO_HOST.map((method) => (
            <li key={method} className="flex items-center gap-2">
              <ArrowLeft
                aria-label="to your page"
                className="text-muted-foreground size-3.5 shrink-0"
              />
              <span className="flex-1 truncate">{method}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-foreground/30 rounded-document min-w-0 border border-dashed p-4 sm:p-5">
        <p className={cn(mono, "text-muted-foreground truncate text-xs")}>
          &lt;hash&gt;.scf.auiusercontent.com
        </p>
        <div className={cn(field, "mt-3 p-5")}>
          <p className="font-medium">Runtime</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Parses the partial markup on each animation frame and morphs it into
            the page. Scripts wait for the end.
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-xs">
            <MorphRow label="kept" width="w-[70%]" tone="bg-foreground/25" />
            <MorphRow label="patched" width="w-[55%]" tone="bg-foreground/40" />
            <MorphRow
              label="new, fades in"
              width="w-[35%]"
              tone="bg-foreground/15"
            />
            <MorphRow label="held script" width="w-[45%]" dashed />
          </ul>
        </div>
      </div>
    </div>
  );
}

function MorphRow({
  label,
  width,
  tone,
  dashed,
}: {
  label: string;
  width: string;
  tone?: string;
  dashed?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-2 flex-1 items-center">
        <span
          className={cn(
            "h-2 rounded-[2px]",
            width,
            dashed ? "border-foreground/30 border border-dashed" : tone,
          )}
        />
      </span>
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
    </li>
  );
}

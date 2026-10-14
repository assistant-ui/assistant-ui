import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Diagrams for Safe Content Frame, shared by the /safe-content-frame landing page and
   the "How Safe Content Frame works" docs page.

   Facts they encode, and where each was checked:
   - The Public Suffix List entry is "*.auiusercontent.com", which makes
     scf.auiusercontent.com a public suffix (publicsuffix.org list).
   - Frame URL: https://<hash>-h184756.scf.auiusercontent.com/<product>/
     shim.html?origin=<parent origin>, with hash = SHA-256 over product,
     salt, and parent origin (packages/safe-content-frame/src/index.ts).
     "-h184756" is the shim version in the shim's hostname pattern.
   - The shim rejects messages whose event.origin is not the ?origin=
     value, recomputes the hash and compares it with its own hostname, then
     renders from a Blob URL (live shim at *.scf.auiusercontent.com).
   - Chromium isolates null-origin sandboxed iframes per origin by default
     (kIsolateSandboxedIframes, grouping "per-origin"); verified in Chrome
     152 that two such frames share a process.
   Hashes shown are placeholders. */

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

const EXAMPLE_HOSTS = [
  "docs.example.com",
  "app.example.com",
  "cdn.example.com",
];
const SCF_HOSTS = [
  "k3f9…-h184756.scf.auiusercontent.com",
  "0qzm…-h184756.scf.auiusercontent.com",
  "x81d…-h184756.scf.auiusercontent.com",
];
const domainOf = (host: string) => `${host.split("-")[0]}…`;

function Frame({
  children,
  caption,
  className,
}: {
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("not-prose my-8", className)}>
      {children}
      {caption ? (
        <figcaption className="text-muted-foreground/70 mt-3 text-xs">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ---------- Public Suffix List ---------- */

export function PslDiagram() {
  const chip = cn(mono, "rounded-[4px] px-3 py-2 text-xs sm:text-sm");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border-foreground/10 rounded-document border p-6">
        <div className="border-foreground/30 rounded-document border border-dashed p-4">
          <p className={cn(mono, "text-muted-foreground text-xs")}>
            domain: example.com
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {EXAMPLE_HOSTS.map((host) => (
              <li key={host} className={cn(field, chip)}>
                {host}
              </li>
            ))}
          </ul>
          <p className="border-foreground/15 mt-3 rounded-[4px] border px-3 py-2 text-center text-xs">
            shared cookies and storage
          </p>
        </div>
      </div>
      <div className={cn(field, "min-w-0 p-6")}>
        <ul className="flex flex-col gap-3">
          {SCF_HOSTS.map((host) => (
            <li
              key={host}
              className="border-foreground/30 rounded-document border border-dashed p-3"
            >
              <p className={cn(mono, "text-muted-foreground text-[11px]")}>
                domain: {domainOf(host)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={cn(mono, "truncate text-xs sm:text-sm")}>
                  {host}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  own storage
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PslFigure({ n = "01" }: { n?: string }) {
  return (
    <Frame
      caption={`fig. ${n} · subdomains of example.com share a domain; each subdomain of scf.auiusercontent.com is its own`}
    >
      <PslDiagram />
    </Frame>
  );
}

/* ---------- URL anatomy ---------- */

const URL_PARTS = [
  { text: "https://", label: null },
  { text: "<hash>", label: "hash" },
  { text: "-h184756", label: "shim version" },
  { text: ".scf.auiusercontent.com", label: "public suffix" },
  { text: "/<product>", label: "product" },
  { text: "/shim.html?origin=", label: null },
  { text: "<your origin>", label: "parent origin" },
] as const;

export function UrlAnatomyFigure({ n = "02" }: { n?: string }) {
  return (
    <Frame caption={`fig. ${n} · the frame’s URL`}>
      <div className={cn(field, "overflow-x-auto px-6 py-8 sm:px-8")}>
        <div className="mx-auto flex w-max items-start">
          {URL_PARTS.map((part) => (
            <div key={part.text} className="flex flex-col items-center">
              <span
                className={cn(
                  mono,
                  "border-b-2 pb-1.5 text-[13px] sm:text-[15px]",
                  part.label
                    ? "border-foreground/40"
                    : "text-muted-foreground border-transparent",
                )}
              >
                {part.text}
              </span>
              {part.label ? (
                <span className="text-muted-foreground mt-2 px-1 text-xs whitespace-nowrap">
                  {part.label}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p
          className={cn(mono, "text-muted-foreground mt-6 text-center text-sm")}
        >
          hash = SHA-256(product + salt + parent_origin)
        </p>
      </div>
    </Frame>
  );
}

/* ---------- Render sequence ---------- */

const LANES = [
  { name: "Your app", sub: "https://your.app" },
  { name: "safe-content-frame", sub: "npm package" },
  { name: "Shim", sub: "<hash>-h184756.scf.auiusercontent.com" },
] as const;

type SeqStep =
  | { kind: "msg"; from: number; to: number; label: string; dashed?: boolean }
  | { kind: "note"; at: number; label: string }
  | { kind: "branch"; label: string };

const SEQUENCE: SeqStep[] = [
  { kind: "msg", from: 0, to: 1, label: "renderHtml(html)" },
  { kind: "note", at: 1, label: "Hash product, salt, origin" },
  { kind: "msg", from: 1, to: 2, label: "load shim.html" },
  { kind: "msg", from: 1, to: 2, label: "postMessage(html, salt)" },
  { kind: "note", at: 2, label: "Verify origin and hash" },
  { kind: "branch", label: "Checks pass" },
  { kind: "note", at: 2, label: "Render from a Blob URL" },
  { kind: "msg", from: 2, to: 1, label: "loaded", dashed: true },
  { kind: "branch", label: "Checks fail" },
  { kind: "msg", from: 2, to: 1, label: "error", dashed: true },
];

export function SequenceFigure({ n = "03" }: { n?: string }) {
  const col = (lane: number) => `${(lane * 2 + 1) * (100 / 6)}%`;
  return (
    <Frame
      caption={`fig. ${n} · one render, from renderHtml() to a loaded frame`}
    >
      <div className={cn(field, "overflow-x-auto p-6")}>
        <div className="relative min-w-[36rem]">
          <div className="grid grid-cols-3">
            {LANES.map((lane) => (
              <div key={lane.name} className="px-2 text-center">
                <p className="text-sm font-medium">{lane.name}</p>
                <p
                  className={cn(
                    mono,
                    "text-muted-foreground mt-0.5 truncate text-[11px]",
                  )}
                  title={lane.sub}
                >
                  {lane.sub}
                </p>
              </div>
            ))}
          </div>
          <div className="relative mt-4 pb-2">
            {LANES.map((lane, i) => (
              <span
                key={lane.name}
                aria-hidden
                className="bg-foreground/10 absolute top-0 bottom-0 w-px"
                style={{ left: col(i) }}
              />
            ))}
            <ol className="relative flex flex-col gap-1 py-2">
              {SEQUENCE.map((step, i) => {
                if (step.kind === "branch") {
                  return (
                    <li
                      key={i}
                      className="text-muted-foreground relative mt-3 flex items-center gap-3 text-xs"
                      style={{
                        marginLeft: col(1),
                        width: `calc(${col(2)} - ${col(1)} + 3rem)`,
                      }}
                    >
                      <span className="px-1.5">{step.label}</span>
                      <span className="border-foreground/15 flex-1 border-t border-dashed" />
                    </li>
                  );
                }
                if (step.kind === "note") {
                  return (
                    <li key={i} className="relative h-10">
                      <span
                        className="bg-foreground/[0.06] rounded-document absolute top-1 -translate-x-1/2 px-3 py-1.5 text-xs whitespace-nowrap"
                        style={{ left: col(step.at) }}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                }
                const left = Math.min(step.from, step.to);
                const right = Math.max(step.from, step.to);
                const rtl = step.to < step.from;
                return (
                  <li key={i} className="relative h-11">
                    <div
                      className="absolute top-0 flex h-full flex-col justify-center"
                      style={{
                        left: col(left),
                        width: `calc(${col(right)} - ${col(left)})`,
                      }}
                    >
                      <span
                        className={cn(
                          mono,
                          "text-muted-foreground mb-1 truncate px-3 text-center text-xs",
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="flex items-center">
                        {rtl ? (
                          <span
                            aria-hidden
                            className="text-foreground/50 -me-1 text-[10px]"
                          >
                            ◀
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "border-foreground/40 flex-1 border-t",
                            step.dashed && "border-dashed",
                          )}
                        />
                        {!rtl ? (
                          <span
                            aria-hidden
                            className="text-foreground/50 -ms-1 text-[10px]"
                          >
                            ▶
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- Process grouping ---------- */

export function ProcessFigure({ n = "04" }: { n?: string }) {
  const box =
    "border-foreground/15 rounded-[4px] border px-3 py-2 text-center text-xs";
  return (
    <Frame
      caption={`fig. ${n} · renderer processes on desktop Chrome with site isolation`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-foreground/10 rounded-document min-w-0 border p-6">
          <p className="text-muted-foreground text-sm font-medium">
            iframe sandbox
          </p>
          <div className="border-foreground/30 rounded-document mt-4 border border-dashed p-4">
            <p className="text-muted-foreground text-xs">one process</p>
            <ul className="mt-3 flex flex-col gap-2">
              {["frame 1", "frame 2", "frame 3"].map((frame) => (
                <li key={frame} className={cn(field, mono, box, "border-0")}>
                  origin null · {frame}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Sandboxed frames from your app share a process, separate from your
            app.
          </p>
        </div>
        <div className={cn(field, "min-w-0 p-6")}>
          <p className="text-sm font-medium">Safe Content Frame</p>
          <ul className="mt-4 flex flex-col gap-3">
            {SCF_HOSTS.map((host) => (
              <li
                key={host}
                className="border-foreground/30 rounded-document border border-dashed p-3"
              >
                <p className="text-muted-foreground text-xs">own process</p>
                <p className={cn(mono, "mt-1.5 truncate text-xs sm:text-sm")}>
                  {host}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-4 text-sm">
            Each render is its own site, so site isolation gives it its own
            process.
          </p>
        </div>
      </div>
    </Frame>
  );
}

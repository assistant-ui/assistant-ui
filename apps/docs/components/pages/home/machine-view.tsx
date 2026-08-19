"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import { typeEyebrow } from "@/components/shared/type";

const SURFACES: { path: string; href: string; note: string }[] = [
  { path: "/llms.txt", href: "/llms.txt", note: "Docs index. Start here." },
  {
    path: "/llms-full.txt",
    href: "/llms-full.txt",
    note: "Every docs page rendered into one file.",
  },
  {
    path: "/docs/*.md",
    href: "/docs/architecture.md",
    note: "Canonical markdown per page. Accept: text/markdown works too.",
  },
  { path: "/mcp", href: "/mcp", note: "Documentation MCP endpoint." },
  {
    path: "/AGENTS.md",
    href: "/AGENTS.md",
    note: "Instructions for coding agents.",
  },
  { path: "/skill.md", href: "/skill.md", note: "The site skill." },
  {
    path: "/.well-known/api-catalog",
    href: "/.well-known/api-catalog",
    note: "API catalog.",
  },
  {
    path: "/.well-known/agent-skills/index.json",
    href: "/.well-known/agent-skills/index.json",
    note: "Agent skills index.",
  },
  {
    path: "/sitemap.md",
    href: "/sitemap.md",
    note: "Markdown sitemap.",
  },
];

export function MachineView() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || text !== null || failed) return;
    let cancelled = false;
    fetch("/llms.txt")
      .then((res) =>
        res.ok ? res.text() : Promise.reject(new Error(String(res.status))),
      )
      .then((body) => {
        if (!cancelled) setText(body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, text, failed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View this site as AI-readable text"
        className="text-muted-foreground hover:text-foreground hidden h-7 items-center gap-1.5 rounded-(--radius-control) px-2 font-mono text-[11px] font-medium tracking-wide transition-colors md:flex"
      >
        <span className="grid grid-cols-3 gap-[2px]" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="bg-foreground/40 size-[2px]" />
          ))}
        </span>
        llms.txt
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AI-readable version of this site"
          className="bg-background fixed inset-0 z-[80] flex flex-col"
        >
          <header className="border-foreground/10 flex h-12 shrink-0 items-center justify-between border-b px-4 md:px-6">
            <span className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] font-medium tracking-wide uppercase">
              <span className="grid grid-cols-3 gap-[2px]" aria-hidden>
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} className="bg-foreground/40 size-[2px]" />
                ))}
              </span>
              assistant-ui · machine readable
            </span>
            <div className="flex items-center gap-2">
              {text !== null ? <CopyButton text={text} /> : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground flex h-7 items-center gap-1.5 rounded-(--radius-control) px-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors"
              >
                exit
                <XIcon className="size-3.5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-10">
              <div className="flex flex-col gap-2">
                <p className={typeEyebrow}>For machines</p>
                <p className="text-[15px] font-medium">
                  The same site, as agents read it.
                </p>
                <p className="text-muted-foreground max-w-[56ch] text-[13px] leading-relaxed">
                  Everything below is live. Fetch any of it; no key, no
                  handshake.
                </p>
              </div>

              <div className="flex flex-col">
                <p className={typeEyebrow}>The surfaces</p>
                {SURFACES.map((surface) => (
                  <a
                    key={surface.path}
                    href={surface.href}
                    className="group border-foreground/10 grid gap-x-6 border-b py-2 md:grid-cols-[minmax(0,17rem)_1fr]"
                  >
                    <span className="group-hover:text-foreground font-mono text-[12.5px] break-all transition-colors">
                      {surface.path}
                    </span>
                    <span className="text-muted-foreground text-[12.5px]">
                      {surface.note}
                    </span>
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <p className={typeEyebrow}>/llms.txt</p>
                {failed ? (
                  <p className="text-muted-foreground font-mono text-[12.5px]">
                    llms.txt is unavailable right now. Open{" "}
                    <a
                      href="/llms.txt"
                      className="underline underline-offset-2"
                    >
                      /llms.txt
                    </a>{" "}
                    directly.
                  </p>
                ) : text === null ? (
                  <p className="font-mono text-[12.5px]">
                    <span className="text-blue-500">{">"}</span> reading
                    llms.txt
                    <span className="ml-1 inline-block h-[0.9em] w-[2px] animate-pulse bg-blue-500 align-middle" />
                  </p>
                ) : (
                  <pre className="animate-in fade-in-0 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap duration-500 [font-variant-ligatures:none]">
                    {text}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

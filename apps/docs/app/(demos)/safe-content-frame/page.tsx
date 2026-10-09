import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleX,
  Database,
  Feather,
  Files,
  Globe,
  Hourglass,
  Layers,
  MessageSquareLock,
  Minus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { AddToCartButton } from "@/components/shared/shop-entry";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { PslDiagram } from "@/components/pages/docs/samples/safe-content-frame/diagrams";

const ANALYTICS_PAGE = "safe-content-frame" as const;
const REFERENCE_URL =
  "https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame";

const USE_CASES = [
  {
    name: "MCP Apps",
    copy: "Securely render third-party HTML in your app.",
    href: "/safe-content-frame/docs/mcp-apps",
  },
  {
    name: "Generative UI",
    copy: "Securely render LLM-generated HTML in your app.",
    href: "/safe-content-frame/docs/generative-ui",
  },
] as const;

/* Each feature maps to public API in packages/safe-content-frame/src/index.ts
   (or, for the shim checks, to the live shim). The package has no
   dependencies. */
const FEATURES = [
  {
    title: "A domain per render",
    icon: Globe,
    body: "Each render gets a hashed hostname on a public suffix.",
    api: "renderHtml()",
  },
  {
    title: "Verified hand-off",
    icon: ShieldCheck,
    body: "The frame only accepts content from your page’s origin.",
    api: "?origin=",
  },
  {
    title: "Scoped messaging",
    icon: MessageSquareLock,
    body: "Send messages addressed to the frame’s exact origin.",
    api: "sendMessage()",
  },
  {
    title: "HTML, PDFs, and more",
    icon: Files,
    body: "Render HTML strings, PDFs, or any MIME type.",
    api: "renderPdf(), renderRaw()",
  },
  {
    title: "Load and error states",
    icon: Hourglass,
    body: "Wait for the frame to load, with typed errors when it doesn’t.",
    api: "fullyLoadedPromiseWithTimeout()",
  },
  {
    title: "Cancel and clean up",
    icon: CircleX,
    body: "Abort a pending render, or remove the frame when you’re done.",
    api: "signal, dispose()",
  },
  {
    title: "Shadow DOM",
    icon: Layers,
    body: "Mount the iframe inside a closed shadow root.",
    api: "useShadowDom",
  },
  {
    title: "Opt-in caching",
    icon: Database,
    body: "Reuse a domain and its HTTP cache for identical content.",
    api: "enableBrowserCaching",
  },
  {
    title: "No dependencies",
    icon: Feather,
    body: "Plain JavaScript that works with any framework.",
    api: "safe-content-frame",
  },
] satisfies {
  title: string;
  icon: LucideIcon;
  body: string;
  api: string;
}[];

/* "iframe sandbox" means sandbox="allow-scripts" without allow-same-origin,
   which gives the document a null origin. Every API below throws or rejects
   there (checked in Chromium).
   - A null-origin frame's messages arrive with event.origin "null", and the
     host cannot target it (postMessage(msg, "null") throws), so both
     directions fall back to "*".
   - Requests from a null origin send "Origin: null", the same value every
     sandboxed iframe sends, so the only safe CORS response is "*" (no
     credentials). A real origin can be allowlisted. */

type Side = { ok: boolean; note?: ReactNode };
type Row = {
  id: string;
  group: string;
  /** Code identifier, rendered in mono. */
  code?: string;
  /** Plain-language label, rendered in sans. */
  label?: string;
  iframe: Side;
  scf: Side;
};

const STAR = <span className="font-mono">*</span>;

const ROWS: Row[] = [
  {
    id: "exec",
    group: "Runs",
    label: "Sandboxed HTML, CSS, and JS",
    iframe: { ok: true },
    scf: { ok: true },
  },
  ...(
    [
      ["document.cookie", "Storage"],
      ["window.localStorage", "Storage"],
      ["window.sessionStorage", "Storage"],
      ["window.indexedDB", "Storage"],
      ["window.caches", "Storage"],
      ["navigator.storage", "Storage"],
      ["window.SharedWorker", "Workers and locks"],
      ["navigator.serviceWorker", "Workers and locks"],
      ["navigator.locks", "Workers and locks"],
    ] as const
  ).map(([code, group]) => ({
    id: code,
    group,
    code,
    iframe: { ok: false },
    scf: { ok: true },
  })),
  {
    id: "postMessage",
    group: "Messaging and network",
    code: "window.postMessage",
    iframe: { ok: false, note: <>only {STAR} allowed</> },
    scf: { ok: true, note: "scoped to its origin" },
  },
  {
    id: "cors",
    group: "Messaging and network",
    label: "CORS",
    iframe: { ok: false, note: <>only {STAR} allowed</> },
    scf: { ok: true, note: "allowlist its origin" },
  },
];

const GROUPS = [...new Set(ROWS.map((row) => row.group))];

const COLUMNS = [
  { key: "iframe", name: "iframe sandbox", origin: "null", strong: false },
  {
    key: "scf",
    name: "Safe Content Frame",
    origin: "https://<hash>.scf.auiusercontent.com",
    strong: true,
  },
] as const;

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

export default function SandboxPage() {
  return (
    <PageFrame pad="sub" className="pt-32 md:pt-52">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className={typePage}>Sandboxes for HTML</h1>
        <p className={cn(typeDeck, "mx-auto mt-4 max-w-[52ch]")}>
          Every render gets its own iframe and origin, so the HTML inside can’t
          reach your app’s DOM, cookies, or storage.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install safe-content-frame"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <AddToCartButton
            slug="safe-content-frame"
            name="Safe Content Frame"
            size="default"
            variant="outline"
          />
          <Link
            href="/safe-content-frame/docs"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the reference
          </Link>
        </div>
      </header>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>Use cases</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-2">
          {USE_CASES.map((useCase) => (
            <Link
              key={useCase.name}
              href={useCase.href}
              className={cn(
                field,
                "group hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-10",
              )}
            >
              <h3 className={typeSection}>{useCase.name}</h3>
              <div className="mt-3 flex items-end justify-between gap-6">
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  {useCase.copy}
                </p>
                <ArrowUpRight
                  aria-hidden
                  className="text-muted-foreground mb-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>
          Compared with iframe sandbox
        </h2>
        <p className={cn(typeDeck, "mx-auto mt-3 max-w-[60ch] text-center")}>
          Both sandbox your HTML. What differs is the origin it runs on.
        </p>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              className={cn(
                "rounded-document min-w-0 p-6 sm:p-8",
                column.strong ? field : "border-foreground/10 border",
              )}
            >
              <h3
                className={cn(
                  "text-lg font-medium",
                  !column.strong && "text-muted-foreground",
                )}
              >
                {column.name}
              </h3>
              <p
                className={cn(mono, "mt-2 truncate text-sm")}
                title={column.origin}
              >
                <span className="text-muted-foreground">origin: </span>
                {column.origin}
              </p>
              <div className="mt-8 flex flex-col gap-7">
                {GROUPS.map((group) => (
                  <div key={group}>
                    <p className="text-muted-foreground text-xs">{group}</p>
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {ROWS.filter((row) => row.group === group).map((row) => (
                        <RowItem key={row.id} row={row} side={column.key} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>How it works</h2>
        <p className={cn(typeDeck, "mx-auto mt-3 max-w-[60ch] text-center")}>
          <span className={mono}>scf.auiusercontent.com</span> is on the{" "}
          <a
            href="https://publicsuffix.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-baseline gap-0.5 underline underline-offset-4"
          >
            Public Suffix List
            <ArrowUpRight aria-hidden className="size-3 shrink-0 self-center" />
          </a>
          , so every subdomain is treated as its own domain.
        </p>
        <figure className="mx-auto mt-10 max-w-5xl">
          <PslDiagram />
          <figcaption className="text-muted-foreground mt-4 text-center text-xs">
            Based on the design Google published for{" "}
            <a
              href="https://bughunters.google.com/blog/beyond-sandbox-domains-rendering-untrusted-web-content-with-safecontentframe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground inline-flex items-baseline gap-0.5 underline underline-offset-4 transition-colors"
            >
              SafeContentFrame
              <ArrowUpRight
                aria-hidden
                className="size-3 shrink-0 self-center"
              />
            </a>
            .
          </figcaption>
        </figure>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>Features</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, ...feature }) => (
            <div key={feature.title} className={cn(field, "flex flex-col p-6")}>
              <Icon
                aria-hidden
                className="text-muted-foreground size-[18px] shrink-0"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="text-muted-foreground mt-1 flex-1 text-sm leading-relaxed">
                {feature.body}
              </p>
              <p
                className={cn(
                  mono,
                  "text-muted-foreground/80 mt-5 truncate text-xs",
                )}
              >
                {feature.api}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex justify-center">
        <a
          href={REFERENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          View reference
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}

function Mark({ value }: { value: boolean }) {
  return value ? (
    <Check
      aria-label="Yes"
      className="text-foreground size-4 shrink-0"
      strokeWidth={2.25}
    />
  ) : (
    <Minus
      aria-label="No"
      className="text-muted-foreground/50 size-4 shrink-0"
    />
  );
}

function RowItem({ row, side }: { row: Row; side: "iframe" | "scf" }) {
  const { ok, note } = row[side];
  return (
    <li
      className={cn("flex items-center gap-3", !ok && "text-muted-foreground")}
    >
      <Mark value={ok} />
      <span>
        {row.code ? (
          <span className={cn(mono, "text-sm")}>{row.code}</span>
        ) : (
          <span className="text-[15px]">{row.label}</span>
        )}
        {note ? <span className="text-[15px]">: {note}</span> : null}
      </span>
    </li>
  );
}

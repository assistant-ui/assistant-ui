import type { Metadata } from "next";
import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Brand";
const description =
  "The assistant-ui name, mark, ink, and voice, and the files to use them.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const HEADLINE_WORDS = ["Paper,", "ink,", "one", "blue."];

const markMask =
  "[mask-image:url(/favicon/icon.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]";

const SWATCHES = [
  { name: "paper", value: "oklch(0.992 0.002 106)" },
  { name: "ink", value: "oklch(0.145 0.006 106)" },
  { name: "sand", value: "oklch(0.97 0.004 106)" },
  { name: "paper, dark", value: "oklch(0.17 0.003 106)" },
  { name: "ink, dark", value: "oklch(0.985 0.002 106)" },
  { name: "live", value: "oklch(0.623 0.214 259.8)", note: "blue means live" },
  {
    name: "glint",
    value: "oklch(0.82 0.14 82)",
    note: "specular, never an accent",
  },
];

const RULES = [
  "The name is always lowercase: assistant-ui.",
  "Use the original files. Do not redraw, recolor, stretch, or rotate the mark.",
  "The mark carries one color: ink on paper, or paper on ink.",
  "Give the mark room. Do not crowd it with other elements.",
  "Do not use the mark to imply endorsement or affiliation without permission.",
];

const ASSETS = [
  {
    name: "Brand kit",
    href: "/assistant-ui-brand.zip",
    file: "assistant-ui-brand.zip",
    size: "67 KB",
  },
  {
    name: "Logomark",
    href: "/favicon/icon.svg",
    file: "icon.svg",
    size: "379 B",
  },
  {
    name: "Logotype",
    href: "/brand/logotype.svg",
    file: "logotype.svg",
    size: "9 KB",
  },
];

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-foreground/10 border-b py-10 md:py-12">
      <p className={typeEyebrow}>{eyebrow}</p>
      {children}
    </section>
  );
}

export default function BrandPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>
          {HEADLINE_WORDS.map((word, index) => (
            <Fragment key={index}>
              <span
                className="hero-word"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span
                  className="hero-word-ink"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  {word}
                </span>
              </span>{" "}
            </Fragment>
          ))}
          <span
            aria-hidden
            className="hero-caret ml-1 inline-block h-[0.72em] w-[3px] bg-blue-500 align-baseline"
          />
        </h1>
        <p
          className={cn(typeDeck, "hero-rise mt-4 max-w-[52ch]")}
          style={{ animationDelay: "500ms" }}
        >
          The assistant-ui name, mark, ink, and voice, and the files to use
          them.
        </p>
      </header>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <Section eyebrow="The name">
          <span className="bg-foreground mt-8 block h-10 w-60 [mask-image:url(/brand/logotype.svg)] [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat] md:h-14 md:w-[21rem]" />
          <p className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 font-mono text-[13px]">
            <span>assistant-ui</span>
            <span className="text-muted-foreground/60 line-through">
              Assistant UI
            </span>
            <span className="text-muted-foreground/60 line-through">
              AssistantUI
            </span>
            <span className="text-muted-foreground/60 line-through">
              Assistant-Ui
            </span>
          </p>
        </Section>

        <Section eyebrow="The mark">
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-center lg:gap-20">
            <div>
              <div className="bg-foreground/75 relative aspect-square w-full max-w-[20rem] overflow-hidden [mask-image:url(/favicon/icon.svg),radial-gradient(circle,#000_40%,transparent_44%)] [mask-composite:intersect] [mask-size:contain,5px_5px] [mask-position:center,0_0] [mask-repeat:no-repeat,repeat]">
                <span
                  aria-hidden
                  className="hero-glint absolute inset-0 block"
                />
              </div>
              <p className="text-muted-foreground/70 mt-3 max-w-[20rem] font-mono text-[11px] tracking-wide">
                halftone, with the glint
              </p>
            </div>
            <div>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
                {[144, 96, 48, 24, 16].map((size) => (
                  <span
                    key={size}
                    className={cn("bg-foreground block shrink-0", markMask)}
                    style={{ width: size, height: size }}
                  />
                ))}
              </div>
              <p className="text-muted-foreground/70 mt-3 font-mono text-[11px] tracking-wide">
                144 · 96 · 48 · 24 · 16. The mark holds at favicon size
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="border-foreground/10 flex items-center gap-2 border px-5 py-4">
                    <span
                      className={cn("bg-foreground block", markMask)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span className="font-medium tracking-tight">
                      assistant-ui
                    </span>
                  </div>
                  <p className="text-muted-foreground/70 mt-2 font-mono text-[11px] tracking-wide">
                    ink on paper
                  </p>
                </div>
                <div>
                  <div className="bg-foreground flex items-center gap-2 px-5 py-4">
                    <span
                      className={cn("bg-background block", markMask)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span className="text-background font-medium tracking-tight">
                      assistant-ui
                    </span>
                  </div>
                  <p className="text-muted-foreground/70 mt-2 font-mono text-[11px] tracking-wide">
                    paper on ink
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mt-10 text-xs leading-relaxed">
            The mark is based on the{" "}
            <a
              href="https://lucide.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Lucide
            </a>{" "}
            icon set, licensed under the{" "}
            <a
              href="https://github.com/lucide-icons/lucide/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              ISC License
            </a>
            .
          </p>
        </Section>

        <Section eyebrow="The ink">
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map((swatch) => (
              <div key={swatch.name}>
                <span
                  className="border-foreground/10 block aspect-square border"
                  style={{ backgroundColor: swatch.value }}
                />
                <p className="mt-2.5 text-[13px] font-medium">{swatch.name}</p>
                <p className="text-muted-foreground mt-0.5 font-mono text-[10px] tracking-wide">
                  {swatch.value}
                </p>
                {swatch.note ? (
                  <p className="text-muted-foreground/60 mt-0.5 font-mono text-[10px] tracking-wide">
                    {swatch.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-8 max-w-[60ch] text-sm leading-relaxed">
            One knob turns the paper:{" "}
            <span className="font-mono text-[12px]">--tint: 106</span>. Blue
            always means something is live. Gold is light catching the print,
            never a second accent.
          </p>
        </Section>

        <Section eyebrow="The voice">
          <div className="divide-foreground/10 mt-4 flex flex-col divide-y">
            <VoiceRow name="Display" face="System sans · 500–550">
              <p className={typeSection}>The frontend library for AI agents.</p>
            </VoiceRow>
            <VoiceRow name="Text" face="Public Sans · 400–500">
              <p className="text-[15px] leading-relaxed">
                Any backend, through adapters. Production chat, shipped as code
                you own.
              </p>
            </VoiceRow>
            <VoiceRow name="Machine" face="JetBrains Mono · 400–500">
              <p className="font-mono text-[13px]">npx assistant-ui init</p>
            </VoiceRow>
          </div>
        </Section>

        <Section eyebrow="Rules">
          <ol className="mt-4 flex flex-col">
            {RULES.map((rule, index) => (
              <li
                key={index}
                className="border-foreground/10 flex items-baseline gap-6 border-b py-3 last:border-b-0"
              >
                <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm">{rule}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section eyebrow="Assets">
          <div className="divide-foreground/10 mt-4 grid gap-2 md:grid-cols-3 md:gap-0 md:divide-x">
            {ASSETS.map((asset) => (
              <a
                key={asset.href}
                href={asset.href}
                download
                className="group flex flex-col py-4 md:px-8 md:py-2 md:first:ps-0 md:last:pe-0"
              >
                <span className="text-sm font-medium">
                  {asset.name}
                  <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                </span>
                <span className="text-muted-foreground mt-1 font-mono text-[11px] tracking-wide">
                  {asset.file}
                  <span className="text-muted-foreground/50">
                    {" "}
                    · {asset.size}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </Section>
      </div>

      <footer className="mt-24">
        <p className="text-muted-foreground text-sm">
          Questions about usage?{" "}
          <a
            href="mailto:hello@assistant-ui.com"
            className="text-foreground font-medium"
          >
            hello@assistant-ui.com
          </a>
        </p>
      </footer>
    </PageFrame>
  );
}

function VoiceRow({
  name,
  face,
  children,
}: {
  name: string;
  face: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-muted-foreground mt-0.5 font-mono text-[11px] tracking-wide">
          {face}
        </p>
      </div>
      <div className="self-center">{children}</div>
    </div>
  );
}

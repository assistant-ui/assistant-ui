import type { Metadata } from "next";
import { Download, FileArchive } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Brand";
const description =
  "How to use the assistant-ui name, logo, colors, and typography, with files to download.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const markMask =
  "[mask-image:url(/favicon/icon.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]";

const RULES = [
  "The name is always lowercase: assistant-ui.",
  "Use the original files. Do not redraw, recolor, stretch, or rotate the logo.",
  "Use the logo in one color: dark on light backgrounds, light on dark backgrounds.",
  "Leave space around the logo. Do not crowd it with other elements.",
  "Do not use the logo to imply endorsement or affiliation without permission.",
];

const ASSETS = [
  {
    name: "Brand kit",
    href: "/assistant-ui-brand.zip",
    file: "assistant-ui-brand.zip",
    size: "36.6 KB",
  },
  {
    name: "Logomark",
    href: "/favicon/icon.svg",
    file: "icon.svg",
    size: "1.4 KB",
  },
  {
    name: "Logotype",
    href: "/brand/logotype.svg",
    file: "logotype.svg",
    size: "9.8 KB",
  },
];

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-foreground/10 border-b py-10 md:py-12">
      <h2 className="text-sm font-medium">{label}</h2>
      {children}
    </section>
  );
}

export default function BrandPage() {
  return (
    <PageFrame pad="sub">
      <BrandHero />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <Section label="Name">
          <span className="bg-foreground mt-8 block h-10 w-60 [mask-image:url(/brand/logotype.svg)] [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat] md:h-14 md:w-[21rem]" />
          <p className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-[13px]">
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

        <Section label="Logo">
          <div className="mt-10">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
              {[144, 96, 48, 24, 16].map((size) => (
                <span
                  key={size}
                  className={cn("bg-foreground block shrink-0", markMask)}
                  style={{ width: size, height: size }}
                />
              ))}
            </div>
            <p className="text-muted-foreground/70 mt-3 text-xs">
              The logo at 144, 96, 48, 24, and 16 px.
            </p>
            <div className="mt-10 grid max-w-2xl gap-6 sm:grid-cols-2">
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
                <p className="text-muted-foreground/70 mt-2 text-xs">
                  On light
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
                <p className="text-muted-foreground/70 mt-2 text-xs">On dark</p>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mt-10 text-xs leading-relaxed">
            The logo is based on the{" "}
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

        <Section label="Colors">
          <ColorTable />
          <p className="text-muted-foreground mt-8 max-w-[60ch] text-sm leading-relaxed">
            Blue is the only accent color. Neutrals share one warm hue, set by{" "}
            <span className="font-mono text-[12px]">--tint: 106</span>.
          </p>
        </Section>

        <Section label="Typography">
          <div className="divide-foreground/10 mt-4 flex flex-col divide-y">
            <TypeRow name="Headings" face="Public Sans · 500–550">
              <p className={typeSection}>The frontend library for AI agents.</p>
            </TypeRow>
            <TypeRow name="Body" face="Public Sans · 400–500">
              <p className="text-[15px] leading-relaxed">
                Any backend, through adapters. Production chat, shipped as code
                you own.
              </p>
            </TypeRow>
            <TypeRow name="Code" face="JetBrains Mono · 400–500">
              <p className="font-mono text-[13px]">npx assistant-ui init</p>
            </TypeRow>
          </div>
        </Section>

        <Section label="Rules">
          <ol className="mt-4 flex flex-col">
            {RULES.map((rule, index) => (
              <li
                key={index}
                className="border-foreground/10 flex items-baseline gap-6 border-b py-3 last:border-b-0"
              >
                <span className="text-muted-foreground/70 text-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm">{rule}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section label="Assets">
          <AssetCards />
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

function TypeRow({
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
        <p className="text-muted-foreground mt-0.5 text-xs">{face}</p>
      </div>
      <div className="self-center">{children}</div>
    </div>
  );
}

const kitButtonClass =
  "bg-foreground text-background hover:bg-foreground/85 rounded-control inline-flex h-9 items-center gap-2 px-4 text-sm font-medium transition-colors";

function BrandHero() {
  return (
    <header className="max-w-2xl">
      <h1 className={typePage}>Brand guidelines</h1>
      <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>{description}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href="/assistant-ui-brand.zip" download className={kitButtonClass}>
          <Download className="size-4" />
          Download brand kit
        </a>
        <span className="text-muted-foreground text-xs">
          ZIP · 36.6 KB · logo and logotype, SVG and PNG
        </span>
      </div>
    </header>
  );
}

const COLOR_ROWS = [
  {
    name: "Background",
    light: "oklch(0.992 0.002 106)",
    dark: "oklch(0.17 0.003 106)",
  },
  {
    name: "Muted",
    light: "oklch(0.97 0.004 106)",
    dark: "oklch(0.275 0.004 106)",
  },
  {
    name: "Foreground",
    light: "oklch(0.145 0.006 106)",
    dark: "oklch(0.985 0.002 106)",
  },
  {
    name: "Accent",
    light: "oklch(0.623 0.214 259.8)",
    dark: "oklch(0.623 0.214 259.8)",
  },
];

function Chip({ value }: { value: string }) {
  return (
    <span
      className="border-foreground/10 rounded-document block size-8 shrink-0 border"
      style={{ backgroundColor: value }}
    />
  );
}

function ColorTable() {
  return (
    <div className="mt-6 max-w-3xl">
      <div className="text-muted-foreground grid grid-cols-[8rem_1fr_1fr] gap-4 pb-2 text-xs">
        <span />
        <span>Light</span>
        <span>Dark</span>
      </div>
      {COLOR_ROWS.map((row) => (
        <div
          key={row.name}
          className="border-foreground/10 grid grid-cols-[8rem_1fr_1fr] items-center gap-4 border-t py-3"
        >
          <span className="text-[13px] font-medium">{row.name}</span>
          {[row.light, row.dark].map((value, index) => (
            <span key={index} className="flex min-w-0 items-center gap-3">
              <Chip value={value} />
              <span className="text-muted-foreground truncate font-mono text-xs">
                {value}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const ASSET_PREVIEWS: Record<string, string> = {
  "/favicon/icon.svg": "size-12 [mask-image:url(/favicon/icon.svg)]",
  "/brand/logotype.svg": "h-8 w-40 [mask-image:url(/brand/logotype.svg)]",
};

function AssetCards() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {ASSETS.map((asset) => {
        const preview = ASSET_PREVIEWS[asset.href];
        return (
          <a
            key={asset.href}
            href={asset.href}
            download
            className="group border-foreground/10 hover:border-foreground/25 rounded-document flex flex-col border transition-colors"
          >
            <span className="bg-muted/50 flex h-36 items-center justify-center">
              {preview ? (
                <span
                  className={cn(
                    "bg-foreground block [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]",
                    preview,
                  )}
                />
              ) : (
                <FileArchive
                  className="text-muted-foreground size-10"
                  strokeWidth={1.25}
                />
              )}
            </span>
            <span className="border-foreground/10 flex items-center justify-between border-t px-4 py-3">
              <span>
                <span className="block text-sm font-medium">{asset.name}</span>
                <span className="text-muted-foreground mt-0.5 block font-mono text-xs">
                  {asset.file} · {asset.size}
                </span>
              </span>
              <Download className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
            </span>
          </a>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionSample, TintKnob } from "@/components/pages/design/instruments";
import { createOgMetadata } from "@/lib/og";
import {
  Corner,
  Ledger,
  Plate,
  Register,
  Row,
  Swatch,
} from "@/components/pages/design/language";
import { DESIGN_COMPONENTS } from "@/components/pages/design/registry-meta";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Design";
const description =
  "How assistant-ui is drawn: the printed page it is built on, the radius, ink, type, and line registers every surface shares, and the component kit they produce.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const LINE_ROWS = [
  "Streaming",
  "Reasoning",
  "Tools",
  "Approval",
  "Sources",
  "Attachments",
];

export default function DesignPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-xl">
        <p className={typeEyebrow}>Extend</p>
        <h1 className={cn("mt-4", typePage)}>
          Every surface is a printed page.
        </h1>
        <p className={cn("mt-4", typeDeck)}>
          assistant-ui is drawn as a printed document, not as an application
          skin. Four registers follow from that one sentence, and every
          component in the kit is what they produce.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/design/components" />}
          >
            Browse the components
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="/design.md" />}
          >
            <span className="font-mono">design.md</span>
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="mt-20 flex flex-col gap-20">
        <Register
          index={1}
          label="Shape"
          claim="Every shape question is answered by asking what the thing is. Ask it in order, and only the third answer reaches for a radius."
        >
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Plate caption="fig. 01 · the page itself">
              <span className="border-foreground/15 bg-background flex h-16 w-24 flex-col border">
                <span className="border-foreground/15 h-3.5 shrink-0 border-b" />
              </span>
            </Plate>
            <Plate caption="fig. 02 · matter printed on it">
              <span className="bg-foreground/[0.04] flex h-16 w-24 flex-col justify-center gap-1.5 px-4">
                <span className="bg-foreground/30 block h-px w-14" />
                <span className="bg-foreground/30 block h-px w-9" />
                <span className="bg-foreground/30 block h-px w-12" />
              </span>
            </Plate>
            <Plate caption="fig. 03 · an object you press or lift">
              <Button size="sm">Press</Button>
            </Plate>
          </div>
          <Ledger>
            <Row
              sample={<Corner radius="0" />}
              name="--radius-page"
              value="0"
              note="The page itself, and every full-bleed band on it: header, footer, section rules."
            />
            <Row
              sample={<Corner radius="0" />}
              name="--radius-document"
              value="0"
              note="Anything printed on the page: a code sheet, a table, a figure plate, a specimen frame. Declared so a parent radius cannot leak in."
            />
            <Row
              sample={<Corner radius="0.375rem" />}
              name="--radius-sm"
              value="6px"
              note="Kbd, inline code, the smallest icon button."
            />
            <Row
              sample={<Corner radius="0.5rem" />}
              name="--radius-control"
              value="8px"
              note="Button, input, header CTA. Marketing calls to action are 8px rectangles, never pills."
            />
            <Row
              sample={<Corner radius="0.625rem" />}
              name="--radius-surface"
              value="10px"
              note="Menu, popover, tooltip."
            />
            <Row
              sample={<Corner radius="0.75rem" />}
              name="--radius-xl"
              value="12px"
              note="Dialog, toast, any floating card. Never square a surface that lifts: the shadow reads as a crescent at each corner."
            />
            <Row
              sample={<Corner radius="1rem" />}
              name="--radius-thread"
              value="16px"
              note="Composer and user bubble. Product vocabulary; it never appears on marketing chrome."
            />
            <Row
              sample={<Corner radius="9999px" />}
              name="--radius-capsule"
              value="9999px"
              note="Switch, avatar, status dot."
            />
          </Ledger>
        </Register>

        <Register
          index={2}
          label="Ink"
          claim="One knob sets the whole palette. --tint: 106 puts every neutral on a single low-chroma oklch hue, so the site reads as sand rather than gallery grayscale. Turn the knob and the mood of every page moves together."
        >
          <TintKnob />
          <Ledger>
            <Row
              sample={<Swatch color="oklch(0.992 0.002 var(--tint))" ring />}
              name="--background"
              value="0.992 0.002"
              note="Paper. The dark ground is the same hue at 0.17."
            />
            <Row
              sample={<Swatch color="oklch(0.145 0.006 var(--tint))" />}
              name="--foreground"
              value="0.145 0.006"
              note="Ink. Emphasis comes from weight and fill percentage of this one color, not from hue."
            />
            <Row
              sample={<Swatch color="oklch(0.97 0.004 var(--tint))" ring />}
              name="--muted"
              value="0.97 0.004"
              note="The quiet fill under machine text and selected rows."
            />
            <Row
              sample={<Swatch color="oklch(0.922 0.005 var(--tint))" ring />}
              name="--border"
              value="0.922 0.005"
              note="The hairline. One line weight for the whole site."
            />
            <Row
              sample={<Swatch color="var(--color-blue-500)" />}
              name="blue-500"
              value="live"
              note="Blue means live: streaming, running, connected, or currently selected. One live accent per page, and if nothing is live the page has no blue."
            />
            <Row
              sample={<Swatch color="oklch(0.577 0.245 27.325)" />}
              name="--destructive"
              value="0.577 0.245"
              note="A state, not an accent."
            />
            <Row
              sample={<Swatch color="oklch(0.82 0.14 82)" />}
              name="glint"
              value="0.82 0.14 82"
              note="Specular light catching the printed mark. It carries no meaning and never becomes a second accent."
            />
          </Ledger>
          <p className="text-muted-foreground mt-8 max-w-[46ch] text-[13px] leading-relaxed">
            Chrome is ink; product data may be colored. A chart, a heat map, a
            trace waterfall, or a syntax theme keeps its own palette, because
            there the palette is the content.
          </p>
        </Register>

        <Register
          index={3}
          label="Voice"
          claim="Three faces, assigned by meaning rather than by size. Mono has exactly two jobs: the thing you type or install, and the eyebrow that names a section. It is never prose and never emphasis."
        >
          <div className="mt-8 flex flex-col">
            <div className="border-foreground/10 flex flex-col gap-2 border-t py-6 md:flex-row md:items-baseline md:gap-10">
              <p className={cn(typeEyebrow, "md:w-40 md:shrink-0")}>Display</p>
              <div className="min-w-0">
                <p className={typeSection}>
                  Every state an assistant can be in.
                </p>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  The page&rsquo;s own voice: h1, h2, h3, and the large figures
                  a page is built around.
                </p>
              </div>
            </div>
            <div className="border-foreground/10 flex flex-col gap-2 border-t py-6 md:flex-row md:items-baseline md:gap-10">
              <p className={cn(typeEyebrow, "md:w-40 md:shrink-0")}>Sans</p>
              <div className="min-w-0">
                <p className="text-[15px] leading-relaxed">
                  Reading text, set at a comfortable size and never shrunk to
                  make density fit.
                </p>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  Public Sans, through{" "}
                  <code className="font-mono">--font-sans</code>.
                </p>
              </div>
            </div>
            <div className="border-foreground/10 flex flex-col gap-2 border-t py-6 md:flex-row md:items-baseline md:gap-10">
              <p className={cn(typeEyebrow, "md:w-40 md:shrink-0")}>Mono</p>
              <div className="min-w-0">
                <p className="font-mono text-[13px] [font-variant-ligatures:none]">
                  npx assistant-ui init
                </p>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  JetBrains Mono, ligatures off. What you type or install, plus
                  the eyebrow above every section on this page.
                </p>
              </div>
            </div>
          </div>
          <Ledger>
            <Row
              name="typeHero"
              note="The masthead statement, one per page at most."
            />
            <Row name="typePage" note="The ordinary page title." />
            <Row name="typeSection" note="A major section turn." />
            <Row name="typeDeck" note="One short orientation passage." />
            <Row
              name="typeEyebrow"
              note="The running head that names a section."
            />
            <Row
              name="typePackage"
              note="A package name set as a title, in mono."
            />
          </Ledger>
        </Register>

        <Register
          index={4}
          label="Line"
          claim="Ink is expensive, so a rule has to earn its place. Section boundaries are the only line kind a page owes; rows inside a section breathe on rhythm and a hover fill, not on dividers."
        >
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Plate
              caption="fig. 04 · a ledger of forty hairlines is a cage"
              className="h-auto p-5"
            >
              <div className="w-full">
                {LINE_ROWS.map((row) => (
                  <div
                    key={row}
                    className="border-foreground/10 flex items-center justify-between border-b py-2 text-[13px] last:border-b-0"
                  >
                    <span>{row}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      06
                    </span>
                  </div>
                ))}
              </div>
            </Plate>
            <Plate
              caption="fig. 05 · rhythm and a hover fill carry the same rows"
              className="h-auto p-5"
            >
              <div className="w-full">
                {LINE_ROWS.map((row) => (
                  <div
                    key={row}
                    className="hover:bg-foreground/[0.025] -mx-2 flex items-center justify-between px-2 py-2 text-[13px] transition-colors"
                  >
                    <span>{row}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      06
                    </span>
                  </div>
                ))}
              </div>
            </Plate>
          </div>
          <p className="text-muted-foreground mt-8 max-w-[46ch] text-[13px] leading-relaxed">
            A hairline never stacks with a ring and a shadow on the same edge,
            and rules never nest three levels deep. Shadows are zeroed globally;
            only a surface that floats may lift.
          </p>
        </Register>

        <Register
          index={5}
          label="Motion"
          claim="Motion explains a state change, preserves continuity, or confirms an action. It never gates reading, and every one of these is off under prefers-reduced-motion."
        >
          <Ledger>
            <Row
              sample={<MotionSample kind="hero-word" />}
              name="hero-word"
              note="A headline arrives word by word, the newest landing in blue and settling into ink."
            />
            <Row
              sample={<MotionSample kind="hero-rise" />}
              name="hero-rise"
              note="Deck, actions, and metadata rise after the headline has landed."
            />
            <Row
              sample={<MotionSample kind="hero-glint" />}
              name="hero-glint"
              note="A gold sweep crosses the printed mark, occasionally."
            />
            <Row
              sample={<MotionSample kind="code-cascade" />}
              name="code-cascade"
              note="Code lines fade in in sequence when a snippet is swapped."
            />
            <Row
              sample={<MotionSample kind="line-hot" />}
              name="line-hot"
              note="The lines that changed between two snippets carry a blue gutter bar and settle once."
            />
            <Row
              sample={<MotionSample kind="stage-progress" />}
              name="stage-progress"
              note="A hairline fills under the active label to show how long the current act has left."
            />
          </Ledger>
        </Register>
      </div>

      <section className="border-foreground/10 mt-20 border-t pt-6">
        <h2 className={cn(typeEyebrow, "text-foreground")}>
          What they produce
        </h2>
        <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
          <Link href="/design/components" className="group flex flex-col">
            <p className={typeSection}>The components.</p>
            <p className="text-muted-foreground mt-2 max-w-[42ch] text-[13px] leading-relaxed">
              {DESIGN_COMPONENTS.length} primitives drawn to these registers,
              each with a live specimen, its API, and its source.
            </p>
            <span className="text-muted-foreground group-hover:text-foreground mt-3 font-mono text-[11px] transition-colors">
              /design/components →
            </span>
          </Link>
          <a href="/design.md" className="group flex flex-col">
            <p className={typeSection}>The same law, for machines.</p>
            <p className="text-muted-foreground mt-2 max-w-[42ch] text-[13px] leading-relaxed">
              One Markdown file an agent can read before it draws anything: the
              registers above, the closed token and component API, and the
              failure modes that have already cost a rebuild.
            </p>
            <span className="text-muted-foreground group-hover:text-foreground mt-3 font-mono text-[11px] transition-colors">
              /design.md ↗
            </span>
          </a>
        </div>
      </section>
    </PageFrame>
  );
}

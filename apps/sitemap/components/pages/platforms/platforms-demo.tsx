"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThreadPreview } from "@/components/demos/thread.preview";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { DemoFrame } from "@/components/shared/demo-frame";
import { NavGlyphArt } from "@/components/shared/nav-glyph";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The hosted demos the React Native and Ink pages embed. */
const EXPO_DEMO = "https://assistant-ui-expo.vercel.app/";
const INK_DEMO =
  process.env["NEXT_PUBLIC_INK_DEMO_URL"] ??
  "https://assistant-ui-ink.vercel.app";

type View = {
  id: string;
  label: string;
  glyph: "react" | "native" | "ink" | "vue";
  href: string;
  caption: string;
};

const VIEWS: readonly View[] = [
  {
    id: "react",
    label: "React",
    glyph: "react",
    href: "/react",
    caption: "The Thread, with replies from a script.",
  },
  {
    id: "react-native",
    label: "React Native",
    glyph: "native",
    href: "/react-native",
    caption: "A real Expo build, running on the web.",
  },
  {
    id: "ink",
    label: "Ink",
    glyph: "ink",
    href: "/ink",
    caption: "A real Ink render loop. Click and type.",
  },
  {
    id: "vue",
    label: "Vue",
    glyph: "vue",
    href: "/vue",
    caption:
      "The Nuxt quickstart's component. Vue has no hosted demo to run here.",
  },
];

/** One runtime on each platform: a live demo per tab, Vue's setup where nothing can run. */
export function PlatformsDemo({ vueHtml }: { vueHtml: string }) {
  const [id, setId] = useState(VIEWS[0]!.id);
  const view = VIEWS.find((entry) => entry.id === id) ?? VIEWS[0]!;

  const content: Record<string, ReactNode> = {
    react: <ThreadPreview />,
    "react-native": (
      <LiveFrame
        src={EXPO_DEMO}
        title="assistant-ui React Native demo"
        className="size-full rounded-none border-0"
      />
    ),
    ink: (
      <LiveFrame
        src={INK_DEMO}
        title="assistant-ui Ink demo"
        className="size-full rounded-none border-0"
      />
    ),
    vue: (
      <div
        className="h-full overflow-auto px-4 py-3.5 text-[12.5px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:font-mono [&_pre]:whitespace-pre"
        dangerouslySetInnerHTML={{ __html: vueHtml }}
      />
    ),
  };

  return (
    <DemoFrame
      above={
        <Tabs value={id} onValueChange={(value) => setId(String(value))}>
          <TabsList className="bg-background border-foreground/10 max-w-full justify-start overflow-x-auto border">
            {VIEWS.map((entry) => (
              <TabsTrigger
                key={entry.id}
                value={entry.id}
                className="data-active:bg-muted flex-none gap-1.5 px-2.5 text-[13px]"
              >
                <span
                  aria-hidden
                  className="flex h-4 w-5 items-center justify-center [&_svg]:h-4 [&_svg]:w-5"
                >
                  <NavGlyphArt kind={entry.glyph} />
                </span>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      caption={view.caption}
      aside={
        <Link
          href={view.href}
          className="group/link text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          Open {view.label}
          <ArrowRightIcon
            aria-hidden
            className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      }
      frameClassName="h-[30rem]"
    >
      <div key={view.id} className="min-h-0 flex-1">
        {content[view.id]}
      </div>
    </DemoFrame>
  );
}

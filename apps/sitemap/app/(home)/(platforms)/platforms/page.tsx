import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { ThreadPreview } from "@/components/demos/thread.preview";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { CopyInstall } from "@/components/pages/utilities/copy-install";
import { NavGlyphArt } from "@/components/shared/nav-glyph";
import { PageFrame } from "@/components/shared/page-frame";
import {
  InstallTerminal,
  type TerminalTab,
} from "@/components/shared/install-terminal";
import { PageHero } from "@/components/shared/page-hero";
import { installCommand, type LibraryItem } from "@/lib/library/catalog";
import { getLibraryItems } from "@/lib/library/items";

export const metadata: Metadata = {
  title: "Platforms",
  description:
    "The assistant-ui runtime and its adapters, packaged for React, React Native, Ink, and Vue.",
};

const EXPO_DEMO = "https://assistant-ui-expo.vercel.app/";
const INK_DEMO =
  process.env["NEXT_PUBLIC_INK_DEMO_URL"] ??
  "https://assistant-ui-ink.vercel.app";

const liveFrame = (src: string, title: string) => (
  <LiveFrame
    src={src}
    title={title}
    className="size-full rounded-none border-0"
  />
);

/** Each platform's start command, then its live demo; Vue's next step, since it has no hosted demo. */
const TERMINAL: readonly TerminalTab[] = [
  {
    id: "react",
    label: "React",
    icon: <NavGlyphArt kind="react" />,
    command: "npx assistant-ui@latest create my-app",
    result: <ThreadPreview />,
    caption: "The Thread demo, with replies from a script.",
  },
  {
    id: "react-native",
    label: "React Native",
    icon: <NavGlyphArt kind="native" />,
    command: "npx assistant-ui@latest create --native my-app",
    result: liveFrame(EXPO_DEMO, "assistant-ui React Native demo"),
    caption: "A real Expo build of the chat, running on the web.",
  },
  {
    id: "ink",
    label: "Ink",
    icon: <NavGlyphArt kind="ink" />,
    command: "npx assistant-ui@latest create --ink my-app",
    result: liveFrame(INK_DEMO, "assistant-ui Ink demo"),
    caption: "A real Ink render loop. Click and type.",
  },
  {
    id: "vue",
    label: "Vue",
    icon: <NavGlyphArt kind="vue" />,
    command: "npm install @assistant-ui/vue",
    next: {
      language: "vue",
      code: `<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { AISDKChat } from "@assistant-ui/ai-sdk";
import Thread from "~/components/assistant-ui/thread.vue";

const config = AuiConfig({ threads: AISDKChat() });
</script>

<template>
  <AuiProvider :config="config"><Thread /></AuiProvider>
</template>`,
    },
    caption:
      "The Nuxt quickstart's component. Vue has no hosted demo to run here.",
  },
];

type Platform = {
  /** The library item this tile installs. */
  id: string;
  title: string;
  description: string;
  href: string;
  glyph: "react" | "native" | "ink" | "vue";
  /** Library starters for this platform, templates first. */
  starters: readonly string[];
};

const PLATFORMS: readonly Platform[] = [
  {
    id: "platforms/react",
    title: "AI chat, on the web.",
    description:
      "The web distribution: the primitives, the runtime, and its adapters for any React app.",
    href: "/react",
    glyph: "react",
    starters: [
      "templates/default",
      "templates/minimal",
      "examples/with-ai-sdk-v7",
    ],
  },
  {
    id: "platforms/react-native",
    title: "AI chat, on the phone.",
    description:
      "Native Thread, Composer, and Message primitives on the same runtime, for Expo, iOS, Android, and web.",
    href: "/react-native",
    glyph: "native",
    starters: ["examples/with-expo"],
  },
  {
    id: "platforms/ink",
    title: "AI chat, in the terminal.",
    description:
      "Thread, Composer, and Message primitives for Ink, on the same runtime, rendered in ANSI.",
    href: "/ink",
    glyph: "ink",
    starters: ["examples/with-react-ink", "examples/with-react-ink-web"],
  },
  {
    id: "platforms/vue",
    title: "AI chat, in Vue.",
    description:
      "The same runtime for Vue 3.5 and Nuxt, through a provider, composables, and unstyled primitives.",
    href: "/vue",
    glyph: "vue",
    starters: ["templates/nuxt", "examples/with-vue"],
  },
];

function Starters({ items }: { items: readonly LibraryItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[13px]">
      <span className="text-muted-foreground">Start from</span>
      <ul className="contents">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground text-foreground/80 decoration-foreground/20 hover:decoration-foreground/60 inline-flex items-center gap-0.5 font-mono text-xs underline underline-offset-4 transition-colors [font-variant-ligatures:none]"
            >
              {item.name}
              <ArrowUpRightIcon aria-hidden className="size-3 opacity-60" />
              <span className="sr-only"> (opens GitHub)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({
  platform,
  item,
  starters,
}: {
  platform: Platform;
  item: LibraryItem;
  starters: readonly LibraryItem[];
}) {
  const packageName =
    item.install?.kind === "npm" ? item.install.names[0]! : item.name;
  return (
    <li className="border-foreground/10 flex min-w-0 flex-col border-r border-b">
      <div className="flex flex-col items-start px-5 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-9">
        <span
          aria-hidden
          className="border-foreground/10 bg-background rounded-document mb-5 grid size-11 place-items-center border"
        >
          <NavGlyphArt kind={platform.glyph} />
        </span>
        {item.install ? (
          <CopyInstall
            packageName={packageName}
            command={installCommand(item.install)}
          />
        ) : null}
        <h2 className="mt-2 text-lg leading-snug font-medium text-balance">
          <Link
            href={platform.href}
            className="group/link focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
          >
            {platform.title}
            <ArrowRightIcon
              aria-hidden
              className="text-muted-foreground group-hover/link:text-foreground ms-1.5 inline size-4 align-[-0.125em] transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm leading-relaxed text-pretty">
          {platform.description}
        </p>
        <Starters items={starters} />
      </div>
    </li>
  );
}

export default function PlatformsPage() {
  const items = new Map(getLibraryItems().map((item) => [item.id, item]));
  return (
    <PageFrame pad="sub">
      <PageHero
        title="One runtime, wherever the chat runs."
        deck="The runtime and its adapters, packaged for React, React Native, Ink, and Vue. Each package brings primitives for its platform and has its own page."
        primary={{ label: "Read the docs", href: "/docs" }}
        secondary={{ install: "npx assistant-ui@latest create my-app" }}
        aside={<InstallTerminal tabs={TERMINAL} frameClassName="h-[32rem]" />}
      />

      <ul
        aria-label="Platforms"
        className="border-foreground/10 mt-16 grid border-t border-l md:mt-20 md:grid-cols-2"
      >
        {PLATFORMS.map((platform) => {
          const item = items.get(platform.id);
          if (!item) return null;
          return (
            <Tile
              key={platform.id}
              platform={platform}
              item={item}
              starters={platform.starters.flatMap((id) => items.get(id) ?? [])}
            />
          );
        })}
      </ul>
    </PageFrame>
  );
}

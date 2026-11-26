import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ThreadPreview } from "@/components/demos/thread.preview";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { CopyInstall } from "@/components/pages/utilities/copy-install";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import { installCommand, type LibraryItem } from "@/lib/library/catalog";
import { getLibraryItems } from "@/lib/library/items";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Platforms",
  description:
    "The assistant-ui runtime and its adapters, packaged for React, React Native, Ink, and Vue.",
};

/** The hosted demos the Native and Ink pages embed. */
const EXPO_DEMO = "https://assistant-ui-expo.vercel.app/";
const INK_DEMO =
  process.env["NEXT_PUBLIC_INK_DEMO_URL"] ??
  "https://assistant-ui-ink.vercel.app";

/** From the Vue quickstart. */
const VUE_SNIPPET = `<script setup lang="ts">
import { AuiConfig, AuiProvider } from "@assistant-ui/vue";
import { AISDKChat } from "@assistant-ui/ai-sdk";
import Thread from "~/components/assistant-ui/thread.vue";

const config = AuiConfig({
  threads: AISDKChat(),
});
</script>

<template>
  <AuiProvider :config="config">
    <Thread />
  </AuiProvider>
</template>`;

type Platform = {
  /** The library item this tile installs. */
  id: string;
  title: string;
  description: string;
  href: string;
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
    starters: ["examples/with-expo"],
  },
  {
    id: "platforms/ink",
    title: "AI chat, in the terminal.",
    description:
      "Thread, Composer, and Message primitives for Ink, on the same runtime, rendered in ANSI.",
    href: "/ink",
    starters: ["examples/with-react-ink", "examples/with-react-ink-web"],
  },
  {
    id: "platforms/vue",
    title: "AI chat, in Vue.",
    description:
      "The same runtime for Vue 3.5 and Nuxt, through a provider, composables, and unstyled primitives.",
    href: "/vue",
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
  preview,
}: {
  platform: Platform;
  item: LibraryItem;
  starters: readonly LibraryItem[];
  preview: ReactNode;
}) {
  const packageName =
    item.install?.kind === "npm" ? item.install.names[0]! : item.name;
  return (
    <li className="border-foreground/10 flex min-w-0 flex-col border-r border-b">
      <div className="flex h-[30rem] justify-center overflow-hidden px-5 pt-8 sm:px-8">
        {preview}
      </div>
      <div className="flex flex-col items-start px-5 pt-6 pb-7 sm:px-8 sm:pb-9">
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

export default async function PlatformsPage() {
  const items = new Map(getLibraryItems().map((item) => [item.id, item]));
  const vue = await highlightElementSource(VUE_SNIPPET);
  const previews: Record<string, ReactNode> = {
    "platforms/react": (
      <div className="border-foreground/10 rounded-document h-full w-full max-w-md overflow-hidden border">
        <ThreadPreview />
      </div>
    ),
    "platforms/react-native": (
      <LiveFrame
        src={EXPO_DEMO}
        title="assistant-ui React Native demo"
        className="aspect-[9/17.5] h-full"
      />
    ),
    "platforms/ink": (
      <LiveFrame
        src={INK_DEMO}
        title="assistant-ui Ink demo"
        className="h-full w-full"
      />
    ),
    "platforms/vue": (
      <div
        className="w-full self-start [mask-image:linear-gradient(to_bottom,#000_70%,transparent),linear-gradient(to_right,#000_85%,transparent)] [mask-composite:intersect] text-[12.5px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:font-mono [&_pre]:whitespace-pre"
        dangerouslySetInnerHTML={{ __html: vue }}
      />
    ),
  };

  return (
    <PageFrame pad="sub">
      <header className="max-w-3xl">
        <h1 className={typePage}>One runtime, wherever the chat runs.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[54ch]")}>
          The runtime and its adapters, packaged for React, React Native, Ink,
          and Vue. Each package brings primitives for its platform and has its
          own page.
        </p>
      </header>

      <ul
        aria-label="Platforms"
        className="border-foreground/10 mt-12 grid border-t border-l md:mt-16 md:grid-cols-2"
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
              preview={previews[platform.id]}
            />
          );
        })}
      </ul>
    </PageFrame>
  );
}

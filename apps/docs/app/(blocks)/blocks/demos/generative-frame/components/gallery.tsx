"use client";

import { useAui } from "@assistant-ui/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import type { ThemeTokens } from "generative-frame";
import { useAssistantUiThemeTokens } from "generative-frame/assistant-ui";
import { Widget } from "generative-frame/react";
import { parseSpecStream } from "generative-frame/spec";
import { SpecRenderer } from "generative-frame/spec/react";
import { cn } from "@/lib/utils";
import data from "../data.json";
import { Icon, focusRing, rItem, rSurface } from "./ui";
import { Placeholder, catalog, components } from "./vocabulary";

/*
 * Each tile is an answer the model wrote for the tile's prompt, in one of the
 * two ways the chat draws: a spec, kept as the patches it streamed and drawn
 * with the same components as the chat, or a widget's HTML, run in its own
 * frame.
 */
const TILES = data.templates.map((template) =>
  template.code !== undefined
    ? { ...template, kind: "widget" as const, code: template.code }
    : {
        ...template,
        kind: "spec" as const,
        spec: parseSpecStream(template.patches ?? "", { mode: "jsonl" }).spec,
      },
);

type TileData = (typeof TILES)[number];

/* -------------------------------------------------------------------------- */
/* Gallery: what a new chat shows until something is asked for               */
/* -------------------------------------------------------------------------- */

export function Gallery() {
  const tokens = useAssistantUiThemeTokens();

  return (
    <div className="mx-auto w-full max-w-6xl pt-2">
      <div className="flex flex-col gap-1.5 pb-6">
        <h1 className="text-3xl font-medium tracking-tight">Widgets</h1>
        <p className="text-muted-foreground">
          Try one here, start a chat from it, or describe your own below.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <li key={tile.id}>
            <Tile tile={tile} tokens={tokens} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
 * The spec in a box of one height, so the grid stays even: it scrolls inside
 * the box and works in place. Under it, the button that starts a chat from
 * its prompt.
 */
function Tile({ tile, tokens }: { tile: TileData; tokens: ThemeTokens }) {
  const aui = useAui();
  const start = (text: string) => aui.thread().append(text);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="region"
        aria-label={tile.title}
        tabIndex={0}
        className={cn(
          "border-border/60 bg-background h-104 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] overflow-auto overscroll-contain border p-4",
          rSurface,
          focusRing,
        )}
      >
        {tile.kind === "spec" ? (
          <SpecRenderer
            spec={tile.spec}
            catalog={catalog}
            components={components}
            placeholder={Placeholder}
            handlers={{ sendMessage: ({ text }) => start(String(text)) }}
          />
        ) : (
          <Widget
            code={tile.code}
            tokens={tokens}
            onPrompt={(text) => aui.composer.setText(text)}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => start(tile.prompt)}
        className={cn(
          "hover:bg-foreground/[0.06] flex h-8 items-center justify-between gap-2 px-2 text-start transition-colors motion-reduce:transition-none",
          rItem,
          focusRing,
        )}
      >
        <span className="min-w-0 truncate font-medium">{tile.title}</span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-1">
          Start
          <Icon icon={ArrowRight02Icon} className="size-3.5" />
        </span>
      </button>
    </div>
  );
}

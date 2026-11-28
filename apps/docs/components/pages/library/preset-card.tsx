"use client";

import type { CSSProperties } from "react";
import {
  LIBRARY_PRESETS,
  presetCommand,
  presetId,
  presetPrompt,
  type LibraryPreset,
  type PresetTone,
} from "@/lib/library/presets-data";
import { cn } from "@/lib/utils";
import { ItemThumbnail, ItemTitle, itemFrame } from "./library-item";
import { overPreview } from "./library-icon-button";
import type { LibraryDetails } from "./library-item-dialog";
import { LibraryItemMenu } from "./library-item-menu";

const PRESET_DOCS = "/docs/cli#create";

/** Each color the preview reads, switched to its dark value in dark mode. */
const MODE =
  "[--preset-accent:var(--preset-accent-light)] [--preset-bg:var(--preset-bg-light)] [--preset-border:var(--preset-border-light)] [--preset-composer:var(--preset-composer-light)] [--preset-fg:var(--preset-fg-light)] [--preset-user:var(--preset-user-light)] dark:[--preset-accent:var(--preset-accent-dark)] dark:[--preset-bg:var(--preset-bg-dark)] dark:[--preset-border:var(--preset-border-dark)] dark:[--preset-composer:var(--preset-composer-dark)] dark:[--preset-fg:var(--preset-fg-dark)] dark:[--preset-user:var(--preset-user-dark)]";

const RADIUS: Record<LibraryPreset["radius"], string> = {
  sm: "3cqh",
  md: "5cqh",
  lg: "7cqh",
  full: "999px",
};

const tones = (
  name: string,
  tone: PresetTone | undefined,
  fallback: string,
) => ({
  [`--preset-${name}-light`]: tone?.light ?? fallback,
  [`--preset-${name}-dark`]: tone?.dark ?? fallback,
});

const presetStyle = (preset: LibraryPreset) => {
  const { colors } = preset;
  return {
    ...tones("accent", colors.accent, "var(--foreground)"),
    ...tones("bg", colors.background, "var(--background)"),
    ...tones("fg", colors.foreground, "var(--foreground)"),
    ...tones("border", colors.border, "var(--border)"),
    ...tones("user", colors.userMessage, "var(--muted)"),
    ...tones(
      "composer",
      colors.composer ?? colors.background,
      "var(--background)",
    ),
    "--preset-radius": RADIUS[preset.radius],
  } as CSSProperties;
};

/** A small chat drawn in a preset's own colors and corners; it fills its box. */
export function PresetPreview({ preset }: { preset: LibraryPreset }) {
  const line = "h-[4cqh] rounded-full bg-(--preset-fg) opacity-20";

  return (
    <span
      aria-hidden
      style={presetStyle(preset)}
      className={cn(MODE, "[container-type:size] absolute inset-0")}
    >
      <span className="flex size-full flex-col gap-[6cqh] bg-(--preset-bg) px-[12cqw] pt-[27cqh] pb-[9cqh]">
        <span
          className={cn(
            "h-[13cqh] w-[42cqw] rounded-(--preset-radius) bg-(--preset-user)",
            preset.userSide === "right" && "self-end",
          )}
        />
        <span className="flex flex-col gap-[3.5cqh]">
          <span className={cn(line, "w-[58cqw]")} />
          <span className={cn(line, "w-[50cqw]")} />
          <span className={cn(line, "w-[30cqw]")} />
        </span>
        <span className="mt-auto flex h-[16cqh] items-center justify-end rounded-(--preset-radius) border border-(--preset-border) bg-(--preset-composer) px-[3cqh]">
          <span className="size-[10cqh] rounded-full bg-(--preset-accent)" />
        </span>
      </span>
    </span>
  );
}

/** A preset's background and accent as a dot, for where a logo would sit. */
function PresetSwatch({ preset }: { preset: LibraryPreset }) {
  return (
    <span
      aria-hidden
      style={presetStyle(preset)}
      className={cn(
        MODE,
        "grid size-4 shrink-0 place-items-center rounded-full border border-(--preset-border) bg-(--preset-bg)",
      )}
    >
      <span className="size-1.5 rounded-full bg-(--preset-accent)" />
    </span>
  );
}

/** A preset known only by its id, as a mark names it: its preview filling a box, or its dot. */
export function PresetMark({ id, large }: { id: string; large: boolean }) {
  const preset = LIBRARY_PRESETS.find((entry) => entry.id === id);
  if (!preset) return null;
  return large ? (
    <PresetPreview preset={preset} />
  ) : (
    <PresetSwatch preset={preset} />
  );
}

export const presetDetails = (preset: LibraryPreset): LibraryDetails => ({
  id: presetId(preset),
  name: preset.name,
  description: preset.description,
  mark: `preset:${preset.id}`,
  command: presetCommand(preset),
  prompt: presetPrompt(preset),
  docs: PRESET_DOCS,
});

type PresetItemProps = {
  preset: LibraryPreset;
  /** Opens the preset's details. */
  onDetails: (details: LibraryDetails) => void;
};

export function PresetMenu({
  preset,
  onDetails,
  tooltipSide,
  className,
}: PresetItemProps & { tooltipSide?: "left" | "top"; className: string }) {
  return (
    <LibraryItemMenu
      id={presetId(preset)}
      label={preset.name}
      command={presetCommand(preset)}
      prompt={presetPrompt(preset)}
      onDetails={() => onDetails(presetDetails(preset))}
      docs={PRESET_DOCS}
      className={className}
      {...(tooltipSide && { tooltipSide })}
    />
  );
}

export function PresetCard({ preset, onDetails }: PresetItemProps) {
  return (
    <li className="group/navlink relative flex min-w-0 flex-col">
      <div className={cn(itemFrame, "rounded-(--library-card) p-5")}>
        <div className="bg-background relative aspect-[16/10] overflow-hidden rounded-(--library-card-inner)">
          <PresetMenu
            preset={preset}
            onDetails={onDetails}
            className={overPreview}
          />
          <PresetPreview preset={preset} />
        </div>
      </div>
      <ItemTitle
        label={preset.name}
        onSelect={() => onDetails(presetDetails(preset))}
        className="mt-3.5"
      />
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {preset.description}
      </p>
    </li>
  );
}

/** A preset's small preview, as the list view and the saved panel show it. */
export function PresetThumbnail({ id }: { id: string }) {
  return (
    <ItemThumbnail>
      <PresetMark id={id} large />
    </ItemThumbnail>
  );
}

export function PresetRow({ preset, onDetails }: PresetItemProps) {
  return (
    <li className="group/navlink relative flex min-w-0 items-center gap-4 py-2">
      <PresetThumbnail id={preset.id} />
      <div className="min-w-0 flex-1">
        <ItemTitle
          label={preset.name}
          onSelect={() => onDetails(presetDetails(preset))}
        />
        <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
          {preset.description}
        </p>
      </div>
      <PresetMenu
        preset={preset}
        onDetails={onDetails}
        tooltipSide="top"
        className="relative z-10 shrink-0"
      />
    </li>
  );
}

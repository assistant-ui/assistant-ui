"use client";

import Image from "next/image";
import type { LibraryEntry } from "@/lib/library/library-data";
import { ComponentIcon, componentIconId } from "./component-icons";
import { ItemGlyph } from "./library-item";
import { LibraryMark } from "./library-mark";
import { PresetPreview } from "./preset-card";
import { SkillGlyph } from "./skill-glyphs";
import { StarterPreview } from "./starter-card";

const SIZES = "48px";

function Picture({ entry }: { entry: LibraryEntry }) {
  switch (entry.kind) {
    case "starter":
      return <StarterPreview starter={entry.starter} sizes={SIZES} />;
    case "preset":
      return <PresetPreview preset={entry.preset} />;
    case "skill":
      return (
        <ItemGlyph>
          <SkillGlyph name={entry.skill.name} />
        </ItemGlyph>
      );
    case "block":
      return (
        <>
          <Image
            src={entry.block.image.light}
            alt=""
            fill
            sizes={SIZES}
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={entry.block.image.dark}
            alt=""
            fill
            sizes={SIZES}
            className="hidden object-cover object-top dark:block"
          />
        </>
      );
    case "link": {
      const mark = (
        <LibraryMark mark={entry.link.mark} name={entry.link.name} />
      );
      return entry.link.mark ? (
        mark
      ) : (
        <ComponentIcon id={componentIconId(entry.link)} fallback={mark} />
      );
    }
  }
}

/** A library item's picture at the size of a table row: its screenshot in the current mode, its drawing, its mark, or its icon. */
export function LibraryThumb({ entry }: { entry: LibraryEntry }) {
  return (
    <span className="bg-foreground/[0.03] dark:bg-foreground/[0.045] shrink-0 rounded-(--library-thumb) p-1">
      <span className="bg-background relative flex aspect-[16/10] w-12 items-center justify-center overflow-hidden rounded-(--library-thumb-inner)">
        <Picture entry={entry} />
      </span>
    </span>
  );
}

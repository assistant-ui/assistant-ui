import { cn } from "@/lib/utils";
import type { NavGlyphKind } from "@/lib/constants";

const ACCENT = "transition-colors duration-200 group-hover/navlink:bg-blue-500";
const TEXT_ACCENT =
  "transition-colors duration-200 group-hover/navlink:text-blue-500";

function GlyphElements() {
  return (
    <span className="grid grid-cols-3 gap-[3px]">
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          className={cn("bg-foreground/15 size-[7px]", index === 0 && ACCENT)}
        />
      ))}
    </span>
  );
}

function GlyphDesign() {
  return (
    <span className="relative flex h-6 w-8">
      <span className="border-foreground/25 absolute inset-[3px] border" />
      <span className="bg-foreground/40 absolute top-[1px] left-[1px] size-[4px]" />
      <span className="bg-foreground/40 absolute top-[1px] right-[1px] size-[4px]" />
      <span className="bg-foreground/40 absolute bottom-[1px] left-[1px] size-[4px]" />
      <span
        className={cn(
          "bg-foreground/40 absolute right-[1px] bottom-[1px] size-[4px]",
          ACCENT,
        )}
      />
    </span>
  );
}

function GlyphReact() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className="bg-foreground/12 ml-auto h-[5px] w-3.5" />
      <span className="bg-foreground/25 h-[3px] w-full" />
      <span className="bg-foreground/25 h-[3px] w-4/5" />
      <span className="border-foreground/25 mt-[2px] flex h-[9px] items-center justify-end border px-[2px]">
        <span
          className={cn("bg-foreground/40 rounded-capsule size-[4px]", ACCENT)}
        />
      </span>
    </span>
  );
}

function GlyphNative() {
  return (
    <span className="border-foreground/30 flex h-7 w-[18px] flex-col justify-between border p-[3px]">
      <span className="flex flex-col gap-[2px]">
        <span className="bg-foreground/25 h-[2px] w-full" />
        <span className="bg-foreground/25 h-[2px] w-3/4" />
      </span>
      <span className={cn("bg-foreground/40 mx-auto h-[2px] w-2", ACCENT)} />
    </span>
  );
}

function GlyphInk() {
  return (
    <span className="border-foreground/25 flex h-6 w-8 flex-col border">
      <span className="border-foreground/25 flex h-[6px] items-center gap-[2px] border-b px-[3px]">
        <span className="bg-foreground/30 rounded-capsule size-[2px]" />
        <span className="bg-foreground/30 rounded-capsule size-[2px]" />
      </span>
      <span className="flex flex-1 flex-col justify-center gap-[2px] px-[3px]">
        <span className="flex items-center gap-[2px]">
          <span className="bg-foreground/40 h-[2px] w-[3px]" />
          <span className="bg-foreground/25 h-[2px] w-2" />
        </span>
        <span className={cn("bg-foreground/40 h-[4px] w-[3px]", ACCENT)} />
      </span>
    </span>
  );
}

function GlyphCloud() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className={cn("bg-foreground/30 h-[6px] w-full", ACCENT)} />
      <span className="border-foreground/25 h-[6px] w-full border" />
      <span className="border-foreground/25 h-[6px] w-full border" />
    </span>
  );
}

function GlyphCloudAiSdk() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className="bg-foreground/25 h-[3px] w-full" />
      <span className="bg-foreground/25 h-[3px] w-4/5" />
      <span className="border-foreground/25 mt-[2px] flex h-[8px] items-center justify-center border">
        <span className={cn("bg-foreground/40 h-[3px] w-3.5", ACCENT)} />
      </span>
    </span>
  );
}

function GlyphShimmer() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className="bg-foreground/15 h-[3px] w-full" />
      <span className="flex h-[3px] w-full gap-[2px]">
        <span className="bg-foreground/15 w-[6px]" />
        <span className={cn("bg-foreground/40 w-[9px]", ACCENT)} />
        <span className="bg-foreground/15 flex-1" />
      </span>
      <span className="bg-foreground/15 h-[3px] w-2/3" />
    </span>
  );
}

function GlyphGlass() {
  return (
    <span className="relative flex h-6 w-8 flex-col justify-center gap-[3px]">
      <span className="bg-foreground/20 h-[2px] w-full" />
      <span className="bg-foreground/20 h-[2px] w-full" />
      <span className="bg-foreground/20 h-[2px] w-full" />
      <span className="border-foreground/40 bg-background rounded-capsule absolute top-1/2 right-[3px] flex size-[14px] -translate-y-1/2 items-center justify-center border">
        <span
          className={cn("bg-foreground/40 mt-[3px] h-[2px] w-[7px]", ACCENT)}
        />
      </span>
    </span>
  );
}

function GlyphHeat() {
  const tones = [
    "bg-foreground/10",
    "bg-foreground/25",
    "bg-foreground/10",
    "bg-foreground/40",
    "bg-foreground/20",
    "bg-foreground/25",
    "bg-foreground/10",
    "bg-foreground/30",
    "bg-foreground/10",
    "bg-foreground/25",
    "bg-foreground/10",
    "bg-foreground/30",
    "bg-foreground/15",
    "bg-foreground/25",
    "bg-foreground/10",
  ];
  return (
    <span className="grid grid-cols-5 gap-[2px]">
      {tones.map((tone, index) => (
        <span
          key={index}
          className={cn("size-[4px]", tone, index === 3 && ACCENT)}
        />
      ))}
    </span>
  );
}

function GlyphFrame() {
  return (
    <span className="border-foreground/25 flex h-6 w-8 border p-[3px]">
      <span className="border-foreground/40 flex flex-1 items-center justify-center border">
        <span className={cn("bg-foreground/25 size-[5px]", ACCENT)} />
      </span>
    </span>
  );
}

function GlyphO11y() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className="bg-foreground/30 h-[3px] w-full" />
      <span className="bg-foreground/20 ml-[5px] h-[3px] w-[13px]" />
      <span
        className={cn("bg-foreground/40 ml-[11px] h-[3px] w-[10px]", ACCENT)}
      />
    </span>
  );
}

function GlyphPlayground() {
  return (
    <span className="border-foreground/25 flex h-6 w-8 border">
      <span className="border-foreground/25 flex flex-1 flex-col justify-center gap-[2px] border-r px-[3px]">
        <span className="bg-foreground/25 h-[2px] w-full" />
        <span className="bg-foreground/25 h-[2px] w-3/4" />
        <span className="bg-foreground/25 h-[2px] w-full" />
      </span>
      <span className="flex flex-1 items-center justify-center">
        <span className={cn("bg-foreground/15 size-[8px]", ACCENT)} />
      </span>
    </span>
  );
}

function GlyphExamples() {
  return (
    <span className="grid grid-cols-2 gap-[3px]">
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={index}
          className="border-foreground/25 flex h-[11px] w-[14px] flex-col border"
        >
          <span
            className={cn(
              "bg-foreground/15 h-[3px] w-full",
              index === 0 && ACCENT,
            )}
          />
        </span>
      ))}
    </span>
  );
}

function GlyphChangelog() {
  return (
    <span className="flex w-7 flex-col gap-[4px]">
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} className="flex items-center gap-[3px]">
          <span
            className={cn(
              "bg-foreground/30 rounded-capsule size-[4px]",
              index === 0 && ACCENT,
            )}
          />
          <span className="bg-foreground/20 h-[2px] flex-1" />
        </span>
      ))}
    </span>
  );
}

function GlyphShowcase() {
  return (
    <span className="relative block h-6 w-8">
      <span className="border-foreground/20 bg-background absolute top-0 right-0 h-[16px] w-[22px] border" />
      <span className="border-foreground/30 bg-background absolute bottom-0 left-0 flex h-[16px] w-[22px] flex-col gap-[2px] border p-[3px]">
        <span className={cn("bg-foreground/20 h-[3px] w-full", ACCENT)} />
        <span className="bg-foreground/20 h-[2px] w-3/4" />
      </span>
    </span>
  );
}

function GlyphOss() {
  return (
    <span
      className={cn(
        "text-foreground/40 font-mono text-[11px] font-medium",
        TEXT_ACCENT,
      )}
    >
      {"</>"}
    </span>
  );
}

function GlyphBlog() {
  return (
    <span className="flex w-7 flex-col gap-[3px]">
      <span className={cn("bg-foreground/35 h-[4px] w-2/3", ACCENT)} />
      <span className="bg-foreground/20 h-[2px] w-full" />
      <span className="bg-foreground/20 h-[2px] w-full" />
      <span className="bg-foreground/20 h-[2px] w-1/2" />
    </span>
  );
}

function GlyphCareers() {
  return (
    <span className="flex items-end gap-[4px]">
      <span className="flex flex-col items-center gap-[2px]">
        <span
          className={cn("bg-foreground/35 rounded-capsule size-[6px]", ACCENT)}
        />
        <span className="bg-foreground/20 h-[6px] w-[10px] rounded-t-[3px]" />
      </span>
      <span className="flex flex-col items-center gap-[2px]">
        <span className="bg-foreground/25 rounded-capsule size-[5px]" />
        <span className="bg-foreground/15 h-[5px] w-[9px] rounded-t-[3px]" />
      </span>
    </span>
  );
}

function GlyphBrand() {
  return (
    <span className="relative block h-6 w-7">
      <span className="border-foreground/20 bg-foreground/[0.06] absolute top-0 right-0 size-[15px] border" />
      <span
        className={cn(
          "bg-foreground/30 absolute bottom-0 left-0 size-[15px]",
          ACCENT,
        )}
      />
    </span>
  );
}

function GlyphPackages() {
  return (
    <span className="flex flex-col items-center gap-[2px]">
      <span className="border-foreground/30 size-[9px] border" />
      <span className="flex gap-[2px]">
        <span className="border-foreground/30 size-[9px] border" />
        <span className={cn("bg-foreground/25 size-[9px]", ACCENT)} />
      </span>
    </span>
  );
}

function GlyphTraction() {
  return (
    <span className="flex h-6 items-end gap-[3px]">
      <span className="bg-foreground/15 h-[6px] w-[5px]" />
      <span className="bg-foreground/25 h-[10px] w-[5px]" />
      <span className="bg-foreground/25 h-[14px] w-[5px]" />
      <span className={cn("bg-foreground/40 h-[19px] w-[5px]", ACCENT)} />
    </span>
  );
}

const GLYPHS: Record<NavGlyphKind, () => React.ReactNode> = {
  elements: GlyphElements,
  design: GlyphDesign,
  react: GlyphReact,
  native: GlyphNative,
  ink: GlyphInk,
  cloud: GlyphCloud,
  "cloud-ai-sdk": GlyphCloudAiSdk,
  playground: GlyphPlayground,
  shimmer: GlyphShimmer,
  glass: GlyphGlass,
  heat: GlyphHeat,
  frame: GlyphFrame,
  o11y: GlyphO11y,
  examples: GlyphExamples,
  changelog: GlyphChangelog,
  showcase: GlyphShowcase,
  oss: GlyphOss,
  packages: GlyphPackages,
  traction: GlyphTraction,
  blog: GlyphBlog,
  careers: GlyphCareers,
  brand: GlyphBrand,
};

export function NavGlyph({
  kind,
  size = "sm",
}: {
  kind: NavGlyphKind;
  size?: "sm" | "lg";
}) {
  const Glyph = GLYPHS[kind];

  if (size === "lg") {
    return (
      <span className="border-foreground/10 bg-background group-hover/navlink:border-foreground/25 flex min-h-24 w-full flex-1 items-center justify-center border transition-colors">
        <span className="block scale-[2.5]">
          <Glyph />
        </span>
      </span>
    );
  }

  return (
    <span className="border-foreground/10 bg-background grid size-11 shrink-0 place-items-center border">
      <Glyph />
    </span>
  );
}

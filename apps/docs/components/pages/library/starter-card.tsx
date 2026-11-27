import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";
import { starterSourceHref, type Starter } from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { StarterGlyph } from "./starter-glyphs";
import { StarterMenu } from "./starter-menu";

function StarterPreview({
  starter,
  sizes,
}: {
  starter: Starter;
  sizes: string;
}) {
  return starter.image ? (
    <Image
      src={starter.image}
      alt=""
      fill
      sizes={sizes}
      className="object-cover object-top"
    />
  ) : (
    <span className="[container-type:size] flex size-full items-center justify-center">
      <span className="flex w-[min(36cqw,64cqh)] [&>svg]:h-auto [&>svg]:w-full [&>svg]:[stroke-width:0.5]">
        <StarterGlyph starter={starter} />
      </span>
    </span>
  );
}

function StarterTitle({
  starter,
  className,
}: {
  starter: Starter;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        <a
          href={starterSourceHref(starter)}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 group-hover/navlink:underline after:absolute after:inset-0"
        >
          {starter.label}
          <span className="sr-only"> source (opens in a new tab)</span>
        </a>
      </h3>
      <ArrowUpRightIcon
        aria-hidden
        className="text-muted-foreground size-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
}

const frame =
  "bg-foreground/[0.03] group-hover/navlink:bg-foreground/[0.05] dark:bg-foreground/[0.045] dark:group-hover/navlink:bg-foreground/[0.07] group-has-[a:focus-visible]/navlink:ring-ring transition-colors group-has-[a:focus-visible]/navlink:ring-2";

export function StarterCard({ starter }: { starter: Starter }) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 flex-col"
    >
      <div className={cn(frame, "rounded-[32px] p-5")}>
        <div className="bg-background relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl">
          <StarterMenu
            starter={starter}
            className="absolute top-3 right-3 z-10"
          />
          <StarterPreview
            starter={starter}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          />
        </div>
      </div>
      <StarterTitle starter={starter} className="mt-3.5" />
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {starter.description}
      </p>
    </li>
  );
}

export function StarterRow({ starter }: { starter: Starter }) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 items-center gap-4 py-2"
    >
      <div className={cn(frame, "shrink-0 rounded-[18px] p-2")}>
        <div className="bg-background relative flex aspect-[16/10] w-24 items-center justify-center overflow-hidden rounded-[10px]">
          <StarterPreview starter={starter} sizes="96px" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <StarterTitle starter={starter} />
        <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
          {starter.description}
        </p>
      </div>
      <StarterMenu
        starter={starter}
        tooltipSide="top"
        className="relative z-10 shrink-0"
      />
    </li>
  );
}

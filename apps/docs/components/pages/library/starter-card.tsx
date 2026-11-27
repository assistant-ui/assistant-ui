import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import {
  starterCommand,
  starterSourceHref,
  type Starter,
} from "@/lib/library/starters-data";
import { StarterGlyph } from "./starter-glyphs";
import { StarterMenu } from "./starter-menu";

const IMAGE_SIZES = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw";

export function StarterCard({ starter }: { starter: Starter }) {
  const command = starterCommand(starter);
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 flex-col"
    >
      <div className="bg-foreground/[0.03] group-hover/navlink:bg-foreground/[0.05] dark:bg-foreground/[0.045] dark:group-hover/navlink:bg-foreground/[0.07] group-has-[a:focus-visible]/navlink:ring-ring rounded-[32px] p-5 transition-colors group-has-[a:focus-visible]/navlink:ring-2">
        <div className="bg-background relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl">
          <StarterMenu
            starter={starter}
            className="absolute top-3 right-3 z-10"
          />
          {starter.image ? (
            <Image
              src={starter.image}
              alt=""
              fill
              sizes={IMAGE_SIZES}
              className="object-cover object-top"
            />
          ) : (
            <span className="[container-type:size] flex size-full items-center justify-center">
              <span className="flex w-[min(36cqw,64cqh)] [&>svg]:h-auto [&>svg]:w-full [&>svg]:[stroke-width:0.5]">
                <StarterGlyph starter={starter} />
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="mt-3.5 flex items-baseline gap-1.5">
        <h3 className="min-w-0 flex-1 text-[13.5px] font-medium">
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
          className="text-muted-foreground size-3.5 self-center opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
        />
      </div>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {starter.description}
      </p>
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] relative z-10 mt-3 flex items-center gap-2 rounded-xl py-1 pr-1 pl-3">
        <span className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
          {command}
        </span>
        <CopyButton text={command} label="Copy command" />
      </div>
    </li>
  );
}

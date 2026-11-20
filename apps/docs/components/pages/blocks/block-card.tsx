import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PackageIcon } from "@/components/pages/blocks/package-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Block, UpcomingBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const FRAME =
  "border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative aspect-[16/10] overflow-hidden rounded-lg border bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px] transition-colors";

const IMAGE_SIZES = "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw";

function BlockStack({ stack }: Pick<Block, "stack">) {
  return (
    <span className="-my-0.5 ms-auto flex shrink-0 items-center self-center ps-1.5">
      <span className="sr-only">
        Built with {stack.map((item) => item.name).join(", ")}
      </span>
      <TooltipProvider>
        {stack.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger
              render={
                <span className="group/mark relative -ms-1.5 transition-[translate] duration-200 ease-out hover:z-10 motion-reduce:transition-none [&:has(~_:hover)]:-translate-x-1 [:hover~&]:translate-x-1" />
              }
            >
              <span className="border-foreground/10 bg-background text-muted-foreground group-hover/mark:border-foreground/25 group-hover/mark:text-foreground grid size-6 place-items-center rounded-full border transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/mark:-translate-y-0.5 group-hover/mark:scale-110 motion-reduce:transition-none">
                <PackageIcon name={item.package} className="size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </span>
  );
}

export function BlockCard({
  slug,
  title,
  description,
  image,
  stack,
  index,
}: Pick<Block, "slug" | "title" | "description" | "image" | "stack"> & {
  index: number;
}) {
  return (
    <Link href={`/blocks/${slug}`} className="group flex flex-col">
      <div className={cn(FRAME, "group-hover:border-foreground/25")}>
        <Image
          src={image.light}
          alt={title}
          fill
          sizes={IMAGE_SIZES}
          className="object-cover object-top dark:hidden"
        />
        <Image
          src={image.dark}
          alt={title}
          fill
          sizes={IMAGE_SIZES}
          className="hidden object-cover object-top dark:block"
        />
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="text-muted-foreground text-xs tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="min-w-0 text-sm font-medium">
          {title}
          <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
        </h3>
        {stack.length > 0 && <BlockStack stack={stack} />}
      </div>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

export function UpcomingBlockCard({
  title,
  description,
  stack,
  index,
}: Omit<UpcomingBlock, "slug"> & { index: number }) {
  return (
    <div className="flex flex-col">
      <div className={cn(FRAME, "grid place-items-center")}>
        <span className="border-foreground/10 bg-background text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs">
          Upcoming
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="text-muted-foreground text-xs tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="min-w-0 text-sm font-medium">{title}</h3>
        {stack.length > 0 && <BlockStack stack={stack} />}
      </div>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

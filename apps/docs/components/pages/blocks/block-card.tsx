import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Block } from "@/lib/blocks";

const IMAGE_SIZES = "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw";

export function BlockCard({
  slug,
  title,
  description,
  image,
  index,
}: Pick<Block, "slug" | "title" | "description" | "image"> & {
  index: number;
}) {
  return (
    <Link href={`/blocks/${slug}`} className="group flex flex-col">
      <div className="border-foreground/10 group-hover:border-foreground/25 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative aspect-[16/10] overflow-hidden rounded-lg border bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px] transition-colors">
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
        <h3 className="text-sm font-medium">
          {title}
          <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
        </h3>
      </div>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

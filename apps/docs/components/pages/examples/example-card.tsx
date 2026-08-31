import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ExampleItem } from "@/lib/examples";

export function ExampleCard({
  title,
  image,
  description,
  link,
  external = false,
  index,
}: ExampleItem & { index: number }) {
  return (
    <Link
      href={link}
      className="group flex flex-col"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      <div className="border-foreground/10 group-hover:border-foreground/25 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative aspect-[16/10] overflow-hidden border transition-colors">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top"
        />
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="text-sm font-medium">
          {title}
          <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
        </h3>
      </div>
      {description && (
        <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
          {description}
        </p>
      )}
    </Link>
  );
}

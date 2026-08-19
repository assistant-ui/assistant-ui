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
      <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative aspect-[16/10] overflow-hidden rounded-[20px] border">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top"
        />
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h3 className="text-[13.5px] font-medium group-hover:underline group-hover:underline-offset-4">
          {title}
        </h3>
        {external && (
          <ArrowUpRight className="text-foreground/35 size-3.5 shrink-0" />
        )}
      </div>
      {description && (
        <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
          {description}
        </p>
      )}
    </Link>
  );
}

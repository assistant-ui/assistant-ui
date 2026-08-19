import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ShowcaseItem } from "@/lib/showcase";

export function ShowcaseCard({
  title,
  image,
  description,
  link,
  media,
  openSource = false,
  announcementLink,
  repositoryLink,
  index,
}: ShowcaseItem & { index: number }) {
  const hasMeta = openSource || repositoryLink || announcementLink;
  const isLogo = media === "logo";

  return (
    <article className="flex h-full flex-col">
      <Link
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 flex-col"
      >
        <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[20px] border">
          {isLogo ? (
            <Image
              src={image}
              alt={title}
              width={160}
              height={160}
              className="size-24 object-contain sm:size-28"
            />
          ) : (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="object-cover object-top"
            />
          )}
        </div>
        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <h3 className="text-[13.5px] font-medium group-hover:underline group-hover:underline-offset-4">
            {title}
          </h3>
          <ArrowUpRight className="text-foreground/35 size-3.5 shrink-0" />
        </div>
        <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
          {description}
        </p>
      </Link>
      {hasMeta ? (
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12.5px]">
          {openSource && !repositoryLink ? (
            <span className="text-foreground/35 font-mono text-[11px] tracking-tight">
              Open source
            </span>
          ) : null}
          {repositoryLink ? (
            <Link
              href={repositoryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/45 hover:text-foreground/90 transition-colors"
            >
              Source
            </Link>
          ) : null}
          {announcementLink ? (
            <Link
              href={announcementLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/45 hover:text-foreground/90 transition-colors"
            >
              Blog
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

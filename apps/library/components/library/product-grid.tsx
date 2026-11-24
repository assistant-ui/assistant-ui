"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { demoFrameClass } from "@/components/demo/utils/canvas";
import { ElementDemo } from "@/components/pages/elements/element-demos";
import {
  COMPONENT_SECTIONS,
  GALLERY_CATEGORIES,
  installLabel,
  sectionAnchor,
  type LibraryItem,
} from "@/lib/library/catalog";
import { cn } from "@/lib/utils";
import { DesignSpecimen, PrimitiveSample } from "./component-previews";
import { ItemMark } from "./item-mark";
import { ItemMenu } from "./item-menu";
import { ThemePreview } from "./theme-preview";

const IMAGE_SIZES = "(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw";

function ItemLink({
  item,
  className,
}: {
  item: LibraryItem;
  className?: string;
}) {
  const linkClassName = cn(
    "rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline",
    className,
  );
  return item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {item.name}
      <HugeiconsIcon
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
        aria-hidden
        className="text-muted-foreground ms-1 inline size-3.5 align-[-2px]"
      />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={item.href} className={linkClassName}>
      {item.name}
    </Link>
  );
}

function Connection({ item }: { item: LibraryItem }) {
  return item.connection ? (
    <span className="text-muted-foreground text-xs font-normal">
      {item.connection}
    </span>
  ) : null;
}

/**
 * Mounts a live demo once its card nears the viewport. The demo suspends while
 * its chunk loads, so it gets a boundary of its own: without one the page's
 * boundary would hide every card and the list would lose its scroll position.
 */
function LazyDemo({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex size-full min-h-0 items-center justify-center p-5"
    >
      {mounted ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}

/**
 * Fits a docs sample to its card: the sample's own frame loses its margin,
 * border, and padding, and scrolls inside the card when it is taller.
 */
const sampleClassName =
  "flex size-full min-w-0 overflow-auto [&_.not-prose]:my-0 [&>.not-prose]:m-auto! [&>.not-prose]:w-full [&>.not-prose>div]:border-0 [&>.not-prose>div]:p-0";

function Preview({ item }: { item: LibraryItem }) {
  const { preview } = item;
  if (preview?.kind === "demo") {
    return (
      <LazyDemo>
        <ElementDemo demo={preview.slug} />
      </LazyDemo>
    );
  }
  if (preview?.kind === "theme") {
    return <ThemePreview slug={preview.slug} />;
  }
  if (preview?.kind === "specimen") {
    return (
      <LazyDemo>
        <div className={sampleClassName}>
          <DesignSpecimen slug={preview.slug} />
        </div>
      </LazyDemo>
    );
  }
  if (preview?.kind === "sample") {
    return (
      <LazyDemo>
        <div
          className={cn(
            sampleClassName,
            "[&>.not-prose]:h-full [&>.not-prose>div]:h-full!",
          )}
        >
          <PrimitiveSample slug={preview.slug} />
        </div>
      </LazyDemo>
    );
  }
  if (preview?.kind === "image") {
    return (
      <>
        <Image
          src={preview.light}
          alt=""
          fill
          sizes={IMAGE_SIZES}
          className="object-cover object-top dark:hidden"
        />
        <Image
          src={preview.dark}
          alt=""
          fill
          sizes={IMAGE_SIZES}
          className="hidden object-cover object-top dark:block"
        />
      </>
    );
  }
  return null;
}

function GalleryCard({ item }: { item: LibraryItem }) {
  return (
    <li
      className={cn(
        "group/plate flex min-w-0 flex-col",
        item.wide && "@2xl:col-span-2",
      )}
    >
      <div
        className={cn(
          demoFrameClass,
          "group-hover/plate:border-foreground/25 relative h-[340px] transition-colors",
          item.wide && "@2xl:h-[420px]",
        )}
      >
        <Preview item={item} />
      </div>
      <div className="mt-3.5 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="flex items-baseline gap-2.5 text-[15px] leading-6">
            <ItemLink item={item} />
            <Connection item={item} />
          </h3>
          <p className="text-muted-foreground line-clamp-2 text-sm text-pretty">
            {item.description}
          </p>
        </div>
        <ItemMenu item={item} />
      </div>
    </li>
  );
}

function ListRow({ item }: { item: LibraryItem }) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink hover:bg-foreground/[0.025] rounded-control relative -mx-3 flex items-center gap-4 px-3 py-3 transition-colors"
    >
      <ItemMark item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="flex items-baseline gap-2.5 text-[15px] leading-6">
          <ItemLink item={item} className="after:absolute after:inset-0" />
          <Connection item={item} />
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-sm text-pretty @3xl:line-clamp-1">
          {item.description}
        </p>
        {item.install ? (
          <pre className="text-muted-foreground truncate pt-1 font-mono text-xs @3xl:hidden">
            <code>{installLabel(item.install)}</code>
          </pre>
        ) : null}
      </div>
      {item.install ? (
        <pre className="bg-foreground/[0.04] text-muted-foreground hidden max-w-[42%] shrink-0 truncate rounded-sm px-2 py-1 font-mono text-xs @3xl:block">
          <code>{installLabel(item.install)}</code>
        </pre>
      ) : null}
      <div className="relative z-10 shrink-0">
        <ItemMenu item={item} />
      </div>
    </li>
  );
}

function ItemCard({ item }: { item: LibraryItem }) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink border-border/60 hover:border-foreground/20 hover:bg-foreground/[0.03] has-[a:focus-visible]:border-ring relative flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150 motion-reduce:transition-none"
    >
      <ItemMark item={item} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-foreground text-[0.8125rem] leading-[1.125rem]">
          <ItemLink
            item={item}
            className="font-strong after:absolute after:inset-0 after:rounded-xl hover:no-underline focus-visible:no-underline"
          />
        </h3>
        <p className="text-muted-foreground truncate text-[0.8125rem] leading-[1.125rem]">
          {item.description}
        </p>
      </div>
      <div className="relative z-10 shrink-0">
        <ItemMenu item={item} />
      </div>
    </li>
  );
}

function CardGrid({ items }: { items: readonly LibraryItem[] }) {
  return (
    <ul role="list" className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

/** Cards in two columns, under a heading for each section the items name. */
function ProductCards({ items }: { items: readonly LibraryItem[] }) {
  const sections = [...new Set(items.map((item) => item.section))];

  return (
    <div className="@container flex flex-col gap-8">
      {sections.map((section) => {
        const listed = items.filter((item) => item.section === section);
        if (section === undefined) {
          return <CardGrid key="" items={listed} />;
        }
        return (
          <section key={section} className="flex flex-col gap-3">
            <h2 className="font-strong flex items-baseline gap-2 text-sm">
              {section}
              <span className="text-muted-foreground font-regular text-xs tabular-nums">
                {listed.length}
              </span>
            </h2>
            <CardGrid items={listed} />
          </section>
        );
      })}
    </div>
  );
}

function GalleryGrid({ items }: { items: readonly LibraryItem[] }) {
  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-x-6 gap-y-10 @2xl:grid-cols-2"
    >
      {items.map((item) => (
        <GalleryCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

const sectionOrder = (section: string | undefined) =>
  COMPONENT_SECTIONS.findIndex((known) => known === section);

/**
 * Previews in two columns. Items that name sections are listed under a heading
 * for each, with links at the top that jump to them.
 */
function ProductGallery({ items }: { items: readonly LibraryItem[] }) {
  const sections = [...new Set(items.map((item) => item.section))]
    .filter((section) => section !== undefined)
    .toSorted((a, b) => sectionOrder(a) - sectionOrder(b));

  if (sections.length === 0) {
    return (
      <div className="@container">
        <GalleryGrid items={items} />
      </div>
    );
  }

  const listed = sections.map((section) => ({
    section,
    items: items.filter((item) => item.section === section),
  }));

  return (
    <div className="@container flex flex-col gap-10">
      {listed.length > 1 ? (
        <nav aria-label="Sections">
          <ul role="list" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {listed.map(({ section, items }) => (
              <li key={section}>
                <a
                  href={`#${sectionAnchor(section)}`}
                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground flex items-baseline gap-1.5 rounded-sm underline-offset-4 outline-none focus-visible:underline"
                >
                  {section}
                  <span className="text-xs tabular-nums">{items.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {listed.map(({ section, items }) => (
        <section
          key={section}
          id={sectionAnchor(section)}
          aria-labelledby={`${sectionAnchor(section)}-heading`}
          className="flex scroll-mt-20 flex-col gap-5"
        >
          <h2
            id={`${sectionAnchor(section)}-heading`}
            className="font-strong flex items-baseline gap-2 text-sm"
          >
            {section}
            <span className="text-muted-foreground font-regular text-xs tabular-nums">
              {items.length}
            </span>
          </h2>
          <GalleryGrid items={items} />
        </section>
      ))}
    </div>
  );
}

/** A category's items: previews where the category has them, cards otherwise. */
export function ProductGrid({ items }: { items: readonly LibraryItem[] }) {
  const [first] = items;

  if (!first) {
    return <p className="text-muted-foreground text-sm">Nothing matches.</p>;
  }

  if (GALLERY_CATEGORIES.includes(first.category)) {
    return <ProductGallery items={items} />;
  }

  return <ProductCards items={items} />;
}

/** Items as rows, whatever their category. */
export function ProductList({ items }: { items: readonly LibraryItem[] }) {
  return (
    <div className="@container">
      <ul role="list" className="flex flex-col">
        {items.map((item) => (
          <ListRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

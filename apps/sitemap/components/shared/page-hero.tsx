import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { InstallButton } from "@/components/shared/install-button";
import { typeDeck, typePage } from "@/components/shared/type";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroLink = { label: string; href: string };

/** The second button: the install command, or a secondary link. */
export type HeroSecondary = { install: string } | HeroLink;

const isExternal = (href: string) => /^https?:\/\//.test(href);

function linkFor(href: string) {
  return isExternal(href) ? (
    <a href={href} target="_blank" rel="noreferrer" />
  ) : (
    <Link href={href} />
  );
}

/**
 * Every page's hero, per the design-pages skill: the title, an optional line,
 * the main button and either the install command or a secondary link, and on
 * the right (under the buttons on a phone) a subject page's interactive demo or
 * what an overview page shows instead. Without an aside the copy stands alone.
 */
export function PageHero({
  title,
  deck,
  primary,
  secondary,
  aside,
  showcase,
}: {
  title: ReactNode;
  deck?: ReactNode;
  primary: HeroLink;
  secondary: HeroSecondary;
  /** A subject page's demo, or an overview page's aside. */
  aside?: ReactNode;
  /** A subject page's demo as its own full-width row under the hero copy. */
  showcase?: ReactNode;
}) {
  const Arrow =
    "href" in secondary && isExternal(secondary.href)
      ? ArrowUpRightIcon
      : ArrowRightIcon;

  const hero = (
    <div
      className={cn(
        "grid items-center gap-12 lg:gap-16",
        aside && "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]",
      )}
    >
      <header className="max-w-2xl">
        <h1 className={typePage}>{title}</h1>
        {deck ? (
          <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>{deck}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" nativeButton={false} render={linkFor(primary.href)}>
            {primary.label}
          </Button>
          {"install" in secondary ? (
            <InstallButton command={secondary.install} />
          ) : (
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              className="group/secondary border-border"
              render={linkFor(secondary.href)}
            >
              {secondary.label}
              <Arrow
                aria-hidden
                data-icon="inline-end"
                className="transition-transform duration-200 group-hover/secondary:translate-x-0.5 motion-reduce:transition-none"
              />
            </Button>
          )}
        </div>
      </header>
      {aside ? <div className="min-w-0">{aside}</div> : null}
    </div>
  );
  if (!showcase) return hero;
  return (
    <>
      {hero}
      <div className="mt-12 md:mt-16">{showcase}</div>
    </>
  );
}

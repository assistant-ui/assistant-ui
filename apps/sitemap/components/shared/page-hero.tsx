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
 * the main button and either the install command or a secondary link, and an
 * interactive demo on the right (under the buttons on a phone).
 */
export function PageHero({
  title,
  deck,
  primary,
  secondary,
  demo,
}: {
  title: ReactNode;
  deck?: ReactNode;
  primary: HeroLink;
  secondary: HeroSecondary;
  demo: ReactNode;
}) {
  const Arrow =
    "href" in secondary && isExternal(secondary.href)
      ? ArrowUpRightIcon
      : ArrowRightIcon;

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
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
      <div className="min-w-0">{demo}</div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "./search-dialog";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { NAV_ITEMS, CLOUD_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { NavItems, NavItemsRoot } from "@/components/shared/nav-items";
import { HeaderBrandLink } from "@/components/shared/header-brand-link";
import { headerBarClassName } from "@/components/shared/header-chrome";
import { useScrolled } from "@/hooks/use-scrolled";

function SearchButton({ onToggle }: { onToggle: () => void }) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }
    };
    document.addEventListener("keydown", down, true);
    return () => document.removeEventListener("keydown", down, true);
  }, [onToggle]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground flex size-8 cursor-pointer items-center justify-center transition-colors md:hidden"
        aria-label="Search (⌘K)"
      >
        <Search className="size-4" />
      </button>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="hidden md:inline-flex"
        aria-label="Search (⌘K)"
      >
        Search
        <KbdGroup className="hidden lg:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
    </>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggle } = useAssistantPanel();
  const scrolled = useScrolled();

  return (
    <header className="rounded-page sticky top-0 z-50 w-full">
      <NavItemsRoot>
        <div
          className={headerBarClassName(
            scrolled,
            "mx-auto flex h-12 w-full max-w-7xl items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr]",
          )}
        >
          <HeaderBrandLink className="justify-self-start" />

          <NavItems
            items={NAV_ITEMS}
            className="hidden items-center md:flex"
            contentClassName="mx-auto max-w-7xl"
          />

          <div className="flex items-center justify-end gap-2">
            <SearchButton onToggle={() => setSearchOpen((prev) => !prev)} />
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

            <Button
              variant="outline"
              size="sm"
              onClick={toggle}
              aria-label="Ask AI (⌘I)"
            >
              Ask AI
              <KbdGroup className="hidden lg:inline-flex">
                <Kbd>⌘</Kbd>
                <Kbd>I</Kbd>
              </KbdGroup>
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              render={
                <a href={CLOUD_URL} target="_blank" rel="noopener noreferrer" />
              }
            >
              Cloud
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "bg-background fixed inset-x-0 top-12 bottom-0 z-40 transition-opacity duration-200 md:hidden",
            mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 pt-4">
            {NAV_ITEMS.map((item) => {
              if (item.type === "link") {
                return item.href.startsWith("http") ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-foreground py-3 text-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-foreground py-3 text-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div key={item.label} className="flex flex-col">
                  <span className="text-foreground py-3 text-lg">
                    {item.label}
                  </span>
                  {item.groups.map((group) => (
                    <div key={group.label} className="flex flex-col">
                      <span className="text-muted-foreground py-3 font-mono text-sm tracking-wide uppercase">
                        {group.label}
                      </span>
                      {group.items.map((link) =>
                        link.external ? (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-foreground flex items-center gap-1.5 py-2 pl-4 text-lg transition-colors"
                          >
                            {link.label}
                            <ArrowUpRight className="size-3.5 opacity-40" />
                          </a>
                        ) : (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-foreground py-2 pl-4 text-lg transition-colors"
                          >
                            {link.label}
                          </Link>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="mt-auto flex flex-col gap-4 border-t py-6">
              <Button
                size="sm"
                nativeButton={false}
                className="w-fit"
                onClick={() => setMobileMenuOpen(false)}
                render={
                  <a
                    href={CLOUD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Cloud
              </Button>
              <div className="flex gap-4">
                <a
                  href="https://github.com/assistant-ui/assistant-ui"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <GitHubIcon className="size-5" />
                </a>
                <a
                  href="https://discord.gg/S9dwgCNEFs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <DiscordIcon className="size-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </NavItemsRoot>
    </header>
  );
}

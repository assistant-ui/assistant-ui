"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import type { createDocsLayout } from "./next";

export const DocsHeader = ({
  brand,
  brandSlot,
  homeUrl,
  docsUrl,
  name,
  links,
  themeToggle,
}: {
  brand: ReactNode;
  brandSlot: ReactNode;
  homeUrl: string;
  docsUrl: string;
  name: string;
  links: createDocsLayout.Options["links"];
  themeToggle: boolean;
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { setOpenSearch } = useSearchContext();
  return (
    <header className="aui-docs-header">
      {brandSlot ? (
        <div className="aui-docs-header-brand">{brandSlot}</div>
      ) : (
        <Link
          href={homeUrl}
          className="aui-docs-header-brand"
          aria-label={`${name} home`}
        >
          {brand}
        </Link>
      )}
      <div className="aui-docs-header-controls">
        <button
          type="button"
          className="aui-docs-header-search"
          aria-label="Search documentation"
          onClick={() => setOpenSearch(true)}
        >
          <Search aria-hidden="true" />
          <span>Search...</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav className="aui-docs-header-links" aria-label="Site navigation">
          <Link href={docsUrl} aria-current="page">
            Docs
          </Link>
          {links?.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>
        {themeToggle && (
          <button
            type="button"
            className="aui-docs-theme-toggle"
            aria-label="Toggle color theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Sun className="aui-docs-theme-sun" aria-hidden="true" />
            <Moon className="aui-docs-theme-moon" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
};

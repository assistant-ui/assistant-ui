"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";

const DOCS_ORIGIN =
  process.env["NEXT_PUBLIC_DOCS_ORIGIN"] ?? "http://localhost:3000";

/**
 * A page this app has no copy of yet opens on the docs site, so the header and
 * footer links keep working. A page added here takes over its address.
 */
export default function NotFound() {
  const target = `${DOCS_ORIGIN}${usePathname()}`;

  useEffect(() => {
    const { search, hash } = window.location;
    window.location.replace(`${target}${search}${hash}`);
  }, [target]);

  return (
    <main
      {...MAIN_CONTENT_PROPS}
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 px-4 py-24"
    >
      <h1 className="text-2xl font-medium">Opening on the docs site</h1>
      <p className="text-muted-foreground">
        This page has no copy here yet.{" "}
        <a href={target} className="text-foreground underline">
          Open it on the docs site
        </a>
        .
      </p>
    </main>
  );
}

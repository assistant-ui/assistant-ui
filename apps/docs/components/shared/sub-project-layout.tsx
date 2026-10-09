"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LegalLinks } from "./legal-links";
import {
  SubProjectHeader,
  type SubProjectBreadcrumb,
} from "./sub-project-header";

interface SubProjectLayoutProps {
  name: string;
  githubPath: string;
  breadcrumbs?: SubProjectBreadcrumb[];
  children: ReactNode;
  hideFooter?: boolean;
  fullHeight?: boolean;
}

export function SubProjectLayout({
  name,
  githubPath,
  breadcrumbs: breadcrumbsOverride,
  children,
  hideFooter = false,
  fullHeight = false,
}: SubProjectLayoutProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col",
        fullHeight ? "h-svh overflow-hidden" : "min-h-screen",
      )}
    >
      <SubProjectHeader
        name={name}
        githubPath={githubPath}
        {...(breadcrumbsOverride && { breadcrumbs: breadcrumbsOverride })}
        sticky={!fullHeight}
        barClassName="mx-auto max-w-7xl"
      />

      <div className={cn("flex-1", fullHeight && "min-h-0 overflow-hidden")}>
        {children}
      </div>

      {!hideFooter && (
        <footer className="py-8">
          <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              By{" "}
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                assistant-ui
              </Link>
            </p>
            <LegalLinks />
          </div>
        </footer>
      )}
    </div>
  );
}

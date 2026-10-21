"use client";

import { Menu, X } from "lucide-react";
import { useDocsSidebar } from "@/components/pages/docs/contexts/sidebar";
import { SubProjectHeader } from "@/components/shared/sub-project-header";
import { getDocsSite } from "@/lib/docs-sites";

export function DocsSiteHeader({ site: id }: { site: string }) {
  const { open, toggle } = useDocsSidebar();
  const site = getDocsSite(id)!;

  return (
    <SubProjectHeader
      name={site.id}
      githubPath={site.github}
      breadcrumbs={[]}
      actions={
        <button
          type="button"
          onClick={toggle}
          className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors md:hidden"
          aria-label="Toggle sidebar"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      }
    />
  );
}

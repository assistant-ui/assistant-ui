"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/assistant-ui/select";
import { GitHubIcon } from "@/components/icons/github";
import { HeaderBrandLink } from "@/components/shared/header-brand-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DEMO_META } from "@/lib/demos-meta";

export function DemoHeader({ slug }: { slug: string }) {
  const router = useRouter();
  const demo = DEMO_META.find((entry) => entry.slug === slug);

  return (
    <header className="bg-background z-50 flex h-12 shrink-0 items-center justify-between px-4">
      <div className="flex min-w-0 items-center">
        <HeaderBrandLink labelClassName="hidden sm:inline" />
        <span className="text-muted-foreground/40 ml-3">/</span>
        <Select
          variant="ghost"
          value={slug}
          onValueChange={(value) => router.push(`/demos/${value}`)}
          options={DEMO_META.map((d) => ({ value: d.slug, label: d.name }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/docs"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Docs
        </Link>
        {demo && (
          <a
            href={demo.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
            aria-label="View source on GitHub"
          >
            <GitHubIcon className="size-4" />
          </a>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

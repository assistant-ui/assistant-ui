"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitHubIcon } from "@/components/icons/github";
import { HeaderBrandLink } from "@/components/shared/header-brand-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DEMO_META } from "@/lib/demos-meta";

export function DemoHeader({ slug }: { slug: string }) {
  const router = useRouter();
  const demo = DEMO_META.find((entry) => entry.slug === slug);
  const demos = DEMO_META.map((entry) => ({
    value: entry.slug,
    label: entry.name,
  }));

  return (
    <header className="bg-background z-50 flex h-12 shrink-0 items-center justify-between px-4">
      <div className="flex min-w-0 items-center">
        <HeaderBrandLink labelClassName="hidden sm:inline" />
        <span className="text-muted-foreground/40 ml-3">/</span>
        <Select
          value={slug}
          onValueChange={(value) => {
            if (value !== null) router.push(`/demos/${value}`);
          }}
          items={demos}
        >
          <SelectTrigger className="hover:bg-accent h-8 border-0 bg-transparent px-2 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {demos.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

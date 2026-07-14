"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/radix/button";
import { Select } from "@/components/assistant-ui/select";
import { GitHubIcon } from "@/components/icons/github";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { DEMOS, getDemo } from "@/lib/demos";

export function DemoHeader({ slug }: { slug: string }) {
  const router = useRouter();
  const demo = getDemo(slug);

  return (
    <header className="flex h-12 flex-none items-center justify-between gap-4 border-b px-4">
      <div className="flex min-w-0 items-center">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/favicon/icon.svg"
            alt="assistant-ui logo"
            width={18}
            height={18}
            className="dark:hue-rotate-180 dark:invert"
          />
          <span className="hidden font-medium tracking-tight sm:inline">
            assistant-ui
          </span>
        </Link>
        <span className="text-muted-foreground/40 ml-3">/</span>
        <Select
          value={slug}
          onValueChange={(value) => router.push(`/demos/${value}`)}
          options={DEMOS.map((d) => ({ value: d.slug, label: d.name }))}
        />
        {demo && (
          <p className="text-muted-foreground ml-2 hidden min-w-0 truncate text-xs lg:block">
            {demo.tagline}
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-1">
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
        <Button size="sm" className="ml-1 h-8" asChild>
          <Link href="/docs">Get started</Link>
        </Button>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReleaseGroup, PackageRelease } from "@/lib/releases";

const PAGE_SIZE = 10;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cleanBody(markdown: string): string {
  return (
    markdown
      // strip known changeset headings only
      .replace(/^#{1,6}\s+(Patch|Minor|Major)\s+Changes\s*$/gim, "")
      // strip "Updated dependencies" blocks and their indented deps
      .replace(/^-\s+Updated dependencies.*(?:\n\s+-.*)*/gm, "")
      // strip commit hash prefix: "- abc1234: desc" → "- desc"
      .replace(/^(\s*-\s+)[a-f0-9]{6,10}:\s*/gm, "$1")
      .trim()
  );
}

const Heading = ({ children }: { children?: React.ReactNode }) => (
  <p className="font-medium text-foreground/80">{children}</p>
);

const markdownComponents = {
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
};

function ReleaseEntry({ release }: { release: PackageRelease }) {
  return (
    <details className="group/release">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open/release:rotate-90" />
        <span className="font-medium font-mono text-foreground/80 text-sm transition-colors group-hover/release:text-foreground">
          {release.pkg}@{release.version}
        </span>
        <Link
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 text-muted-foreground text-xs transition-colors hover:text-foreground"
        >
          GitHub →
        </Link>
      </summary>
      <div className="py-1 pl-[1.375rem] text-muted-foreground text-sm [&_li]:my-1 [&_p]:my-0 [&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-4">
        <ReactMarkdown components={markdownComponents}>
          {cleanBody(release.body)}
        </ReactMarkdown>
      </div>
    </details>
  );
}

function DateSection({ group }: { group: ReleaseGroup }) {
  return (
    <section>
      <h2 className="font-medium text-lg tracking-tight">
        {formatDate(group.date)}
      </h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {group.releases.length}{" "}
        {group.releases.length === 1 ? "package" : "packages"}
      </p>

      <div className="mt-4 space-y-1">
        {group.releases.map((r) => (
          <ReleaseEntry key={`${r.pkg}@${r.version}`} release={r} />
        ))}
      </div>
    </section>
  );
}

export function ChangelogList({ groups }: { groups: ReleaseGroup[] }) {
  const [count, setCount] = useState(PAGE_SIZE);

  const visible = groups.slice(0, count);
  const remaining = groups.length - count;

  return (
    <>
      <div className="space-y-10">
        {visible.map((group) => (
          <DateSection key={group.date} group={group} />
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setCount((c) => c + PAGE_SIZE)}
          >
            Load more ({remaining})
          </Button>
        </div>
      )}
    </>
  );
}

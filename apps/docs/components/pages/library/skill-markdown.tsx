"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

function Skeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-3">
      {["w-1/3", "w-full", "w-11/12", "w-4/5", "w-1/4", "w-full", "w-3/4"].map(
        (width, index) => (
          <span
            key={index}
            className={`bg-foreground/[0.06] h-3.5 rounded-sm motion-reduce:animate-none ${width}`}
          />
        ),
      )}
    </div>
  );
}

const SkillMarkdownBody = dynamic(() => import("./skill-markdown-body"), {
  loading: Skeleton,
});

const documents = new Map<string, Promise<string>>();

/** The text of one skill file, without its frontmatter; fetched once and kept. */
export const loadSkillDocument = (href: string) => {
  let request = documents.get(href);
  if (!request) {
    request = fetch(href).then(async (response) => {
      if (!response.ok) throw new Error(`${href} responded ${response.status}`);
      return (await response.text()).replace(/^---\n[\s\S]*?\n---\n+/, "");
    });
    request.catch(() => documents.delete(href));
    documents.set(href, request);
  }
  return request;
};

type Loaded = { href: string; text: string } | { href: string; failed: true };

/**
 * One markdown file of a skill, fetched the first time it is shown. `label`
 * names it while it loads; `base` is set for a file whose relative links
 * should be read against its own address; `raw` shows the source as written.
 */
export function SkillMarkdown({
  href,
  label,
  base,
  raw = false,
}: {
  href: string;
  label: string;
  base?: string;
  raw?: boolean;
}) {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    let current = true;
    loadSkillDocument(href).then(
      (text) => current && setLoaded({ href, text }),
      () => current && setLoaded({ href, failed: true }),
    );
    return () => {
      current = false;
    };
  }, [href]);

  const state = loaded?.href === href ? loaded : undefined;

  if (!state) {
    return (
      <div role="status" aria-label={`Loading ${label}`}>
        <Skeleton />
      </div>
    );
  }
  if ("failed" in state) {
    return (
      <p className="text-muted-foreground text-sm">
        This file did not load.{" "}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline underline-offset-4"
        >
          Open {label}
        </a>
      </p>
    );
  }
  if (raw) {
    return (
      <pre
        data-skill-markdown
        className="font-mono text-xs leading-relaxed break-words whitespace-pre-wrap [font-variant-ligatures:none]"
      >
        {state.text}
      </pre>
    );
  }
  return <SkillMarkdownBody text={state.text} {...(base && { base })} />;
}

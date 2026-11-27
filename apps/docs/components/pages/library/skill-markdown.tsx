"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LibrarySkill } from "@/lib/library/skills-data";

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

const loadDocument = (href: string) => {
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

/** A skill's SKILL.md, fetched from the site's own copy the first time it is shown. */
export function SkillMarkdown({ skill }: { skill: LibrarySkill }) {
  const [loaded, setLoaded] = useState<Loaded>();
  const { rawHref } = skill;

  useEffect(() => {
    let current = true;
    loadDocument(rawHref).then(
      (text) => current && setLoaded({ href: rawHref, text }),
      () => current && setLoaded({ href: rawHref, failed: true }),
    );
    return () => {
      current = false;
    };
  }, [rawHref]);

  const state = loaded?.href === rawHref ? loaded : undefined;

  if (!state) {
    return (
      <div role="status" aria-label={`Loading ${skill.name}/SKILL.md`}>
        <Skeleton />
      </div>
    );
  }
  if ("failed" in state) {
    return (
      <p className="text-muted-foreground text-sm">
        This file did not load.{" "}
        <a
          href={rawHref}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline underline-offset-4"
        >
          Open SKILL.md
        </a>
      </p>
    );
  }
  return <SkillMarkdownBody text={state.text} />;
}

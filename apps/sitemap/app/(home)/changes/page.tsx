import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { readChangeLog, type Change } from "@/lib/changes";

export const metadata: Metadata = {
  title: "Changes",
  description:
    "What this copy of the site changes from the docs app, and what is still planned.",
};

/** Text with `code` spans, as CHANGES.md writes them. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={index}
            className="bg-foreground/[0.04] rounded-sm px-1 py-px font-mono text-[0.85em]"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const formatDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-foreground/10 flex flex-col gap-8 border-t pt-8"
    >
      <h2 id={id} className="flex items-baseline gap-2 text-lg font-medium">
        {title}
        <span className="text-muted-foreground text-sm font-normal tabular-nums">
          {count}
        </span>
      </h2>
      {children}
    </section>
  );
}

function ChangeEntry({ change }: { change: Change }) {
  return (
    <article className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8">
      <p className="text-muted-foreground pt-0.5 text-sm tabular-nums">
        {formatDate(change.date)}
      </p>
      <div className="flex max-w-[68ch] flex-col gap-3">
        <h3 className="text-base font-medium">{change.title}</h3>
        {change.summary.map((block, index) =>
          block.kind === "paragraph" ? (
            <p key={index} className="text-[15px] leading-relaxed">
              <Inline text={block.text} />
            </p>
          ) : (
            <ul
              key={index}
              className="flex list-disc flex-col gap-1.5 ps-5 text-[15px] leading-relaxed"
            >
              {block.items.map((item) => (
                <li key={item}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          ),
        )}
        {change.files.length > 0 ? (
          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-sm transition-colors">
              {change.files.length}{" "}
              {change.files.length === 1 ? "file" : "files"}
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {change.files.map((file) => (
                <li key={file.path} className="flex flex-col gap-0.5 text-sm">
                  <code className="font-mono text-[13px]">{file.path}</code>
                  {file.note ? (
                    <span className="text-muted-foreground">
                      <Inline text={file.note} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {change.foldBack ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="text-foreground font-medium">
              When folding back:{" "}
            </span>
            <Inline text={change.foldBack} />
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function ChangesPage() {
  const { todo, changes } = readChangeLog();
  return (
    <PageFrame pad="sub" className="flex flex-col gap-12">
      <div className="flex flex-col gap-3">
        <h1 className={typePage}>Changes</h1>
        <p className={typeDeck}>
          What this copy of the site changes from the docs app, newest first,
          and what is still planned. It reads{" "}
          <code className="font-mono text-[0.9em]">
            apps/sitemap/CHANGES.md
          </code>
          .
        </p>
      </div>

      <Section id="to-do" title="To do" count={todo.length}>
        <ul className="flex flex-col gap-3">
          {todo.map((item) => (
            <li
              key={item}
              className="flex max-w-[68ch] items-start gap-3 text-[15px] leading-relaxed"
            >
              <span
                aria-hidden
                className="border-foreground/30 mt-1.5 size-3.5 shrink-0 rounded-[3px] border"
              />
              <span>
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="done" title="Done" count={changes.length}>
        <div className="flex flex-col gap-12">
          {changes.map((change) => (
            <ChangeEntry
              key={`${change.date}-${change.title}`}
              change={change}
            />
          ))}
        </div>
      </Section>
    </PageFrame>
  );
}

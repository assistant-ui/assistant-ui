import { article } from "./article";

// The body uses a tiny markdown subset: blank-line paragraphs and "## " headings.
const blocks = article.body.split(/\n{2,}/);

export function Article() {
  return (
    <article className="mx-auto max-w-[40rem] px-6 py-10 md:px-10 md:py-14">
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
        {article.kicker}
      </p>
      <h1 className="font-serif text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
        {article.title}
      </h1>
      <p className="text-muted-foreground mt-4 font-serif text-lg leading-snug text-pretty">
        {article.dek}
      </p>
      <p className="text-muted-foreground border-border mt-6 border-b pb-6 text-sm">
        <span className="text-foreground font-medium">{article.byline}</span>
        {" · "}
        {article.date}
      </p>
      <div className="mt-8 space-y-5 font-serif text-[1.075rem] leading-relaxed">
        {blocks.map((block, i) =>
          block.startsWith("## ") ? (
            <h2
              key={i}
              className="pt-4 font-sans text-lg font-semibold tracking-tight"
            >
              {block.slice(3)}
            </h2>
          ) : i === 0 ? (
            <p key={i}>
              <span className="font-sans text-sm font-semibold tracking-wide uppercase">
                {article.dateline} —{" "}
              </span>
              {block}
            </p>
          ) : (
            <p key={i}>{block}</p>
          ),
        )}
      </div>
      <p className="text-muted-foreground border-border mt-10 border-t pt-4 text-xs italic">
        This article is fiction. Gerald is not real, as far as we know.
      </p>
    </article>
  );
}

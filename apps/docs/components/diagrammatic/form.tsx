import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Figure } from "./figure";
import { getChart } from "./registry";

const MOTION = new Set([
  "sankey",
  "chord",
  "network",
  "arc-diagram",
  "flow-map",
]);

const ENTRY: Record<string, string> = {
  "world-map": "diagrammatic/world",
};

function Prose({ text }: { text: string }): ReactNode {
  return text
    .split("`")
    .map((part, i) =>
      i % 2 === 1 ? (
        <code key={i}>{part}</code>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}

export function Form({ slug }: { slug: string }) {
  const chart = getChart(slug);
  if (!chart) notFound();
  const entry = ENTRY[slug] ?? "diagrammatic";

  return (
    <>
      <pre className="not-prose text-muted-foreground my-4 font-mono text-xs [font-variant-ligatures:none]">
        <code>
          {"import { "}
          <span className="text-foreground">{chart.exportName}</span>
          {` } from "${entry}";`}
        </code>
      </pre>
      {chart.examples.map((example, k) => (
        <Fragment key={example.title}>
          <p>
            <Prose text={example.setup} />
          </p>
          <Figure
            n={
              chart.examples.length > 1
                ? `${chart.index}.${k + 1}`
                : chart.index
            }
            caption={example.title}
          >
            {k === 0 && MOTION.has(slug) ? (
              <div data-dg-motion="">{example.chart}</div>
            ) : (
              example.chart
            )}
            {example.source && (
              <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                Illustrative data. {example.source}
              </p>
            )}
          </Figure>
          <p>
            <Prose text={example.read} />
          </p>
        </Fragment>
      ))}
      <dl className="not-prose my-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Use it for</dt>
          <dd className="text-muted-foreground mt-1 leading-relaxed">
            {chart.use}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Watch out</dt>
          <dd className="text-muted-foreground mt-1 leading-relaxed">
            {chart.watch}
          </dd>
        </div>
      </dl>
    </>
  );
}

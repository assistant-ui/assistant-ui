import { Icicle } from "diagrammatic";
import { FigTooltip } from "../fig-tooltip";
import type { DemoExample } from "./types";
import { Terminal } from "./scenes";

export const glyph = (
  <Icicle
    title="Monorepo size"
    root={{
      label: "repo · 4.2 GB",
      children: [
        {
          label: "packages",
          children: [
            { label: "react", value: 50 },
            { label: "core", value: 32 },
          ],
        },
        {
          label: "apps",
          children: [
            { label: "web", value: 34 },
            { label: "docs", value: 22 },
          ],
        },
        { label: "docs", value: 36 },
      ],
    }}
  />
);

export const examples: DemoExample[] = [
  {
    title: "Where a slow request spends its time",
    setup:
      "A 420ms endpoint gets profiled, and the trace comes back as the icicle every profiler draws: the handler on top, its callees beneath, width equal to time.",
    read: "The db block is half the request, and inside it the query dwarfs serialization — the index to add is three levels down and one glance away. A flame graph is an icicle wearing profiler clothes; the reading skill transfers exactly.",
    chart: (
      <Terminal title="trace · GET /orders — 420ms">
        <FigTooltip
          entries={{
            db: "54ms",
            query: "38ms",
            pool: "6ms",
            serialize: "10ms",
            render: "31ms",
            template: "16ms",
            partials: "7ms",
            markdown: "8ms",
            auth: "8ms",
            session: "5ms",
            token: "3ms",
            cache: "7ms",
          }}
        >
          <Icicle
            title="Request time by call"
            root={{
              label: "handler · 420ms",
              children: [
                {
                  label: "db",
                  children: [
                    { label: "query", value: 38 },
                    { label: "pool", value: 6 },
                    { label: "serialize", value: 10 },
                  ],
                },
                {
                  label: "render",
                  children: [
                    { label: "template", value: 16 },
                    { label: "partials", value: 7 },
                    { label: "markdown", value: 8 },
                  ],
                },
                {
                  label: "auth",
                  children: [
                    { label: "session", value: 5 },
                    { label: "token", value: 3 },
                  ],
                },
                { label: "cache", value: 7 },
              ],
            }}
          />
        </FigTooltip>
      </Terminal>
    ),
  },
];

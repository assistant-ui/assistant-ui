import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DevToolsModalSample } from "@/components/pages/docs/samples/devtools.lazy";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";

const DESCRIPTION =
  "Inspect runtime state, context, and events in the browser.";

export const metadata: Metadata = {
  title: "assistant-ui DevTools",
  description: DESCRIPTION,
};

const TABS = ["Thread", "Context", "Activity"] as const;

const FEATURES = [
  {
    title: "Development only",
    description:
      "A floating launcher in the lower-right corner of development builds. The whole component is stripped from production builds.",
  },
  {
    title: "Isolated panel",
    description:
      "The panel renders inline in an isolated shadow root. In your app it opens over a dimmed backdrop that closes on click.",
  },
  {
    title: "Custom tabs",
    description:
      "Add inspector tabs with createDevToolsPlugin. Each renders from the inspected instance's state, logs, model context, and scopes.",
  },
] as const;

const SETUP = `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";

export function App() {
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <DevToolsModal />
      {/* ...your assistant-ui... */}
    </AssistantRuntimeProvider>
  );
}`;

const PLUGIN = `import { createDevToolsPlugin, DevToolsModal } from "@assistant-ui/react-devtools";

const myTab = createDevToolsPlugin({
  id: "my-tab",
  label: "My tab",
  Component: ({ data }) => <pre>{JSON.stringify(data.state, null, 2)}</pre>,
});

<DevToolsModal plugins={[myTab]} />;`;

export default function DevToolsPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="See inside the runtime."
        deck={DESCRIPTION}
        primary={{ label: "Read the docs", href: "/docs/devtools" }}
        secondary={{ install: "npm install @assistant-ui/react-devtools" }}
        showcase={
          <DemoSetupPanel
            demo={<DevToolsModalSample />}
            demoCaption="The real DevTools panel on a sample chat. Open the launcher, then run a demo turn."
            files={[
              { path: "app.tsx", language: "tsx", code: SETUP },
              { path: "my-tab.tsx", language: "tsx", code: PLUGIN },
            ]}
            setupCaption="From the package README."
            frameClassName="h-[34rem] [&_.not-prose]:my-0 [&_.not-prose]:h-full [&_.not-prose>div]:h-full [&_.not-prose>div]:rounded-none [&_.not-prose>div]:border-0"
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">The tabs</p>
            <span className="text-muted-foreground text-sm tabular-nums">
              {TABS.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {TABS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            See how data flows to the runtime layer, without resorting to
            console.log.
          </p>
        </section>

        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          DevTools is one of the{" "}
          <Link
            href="/utilities"
            className="text-foreground font-medium transition-colors"
          >
            utilities
          </Link>{" "}
          for the parts around a chat. For agent traces and run timelines, see{" "}
          <Link
            href="/react-o11y"
            className="text-foreground font-medium transition-colors"
          >
            react-o11y
          </Link>
          .
        </p>
        <Link
          href="/docs/devtools#custom-event-sources"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Custom event sources
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
        </Link>
      </footer>
    </PageFrame>
  );
}

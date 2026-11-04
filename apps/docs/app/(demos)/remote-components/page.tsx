import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { BookingDemo } from "@/components/pages/docs/samples/remote-components/demos";
import { Code } from "@/components/pages/docs/samples/remote-components/remote-source";

const STEP_PAGE = `<h3>Weather in <span id="city">Berlin</span></h3>
<button>Monday</button>
<script>
  rc.addEventListener("props-changed", () => (city.textContent = rc.props.city));
  document.querySelector("button").onclick = () => rc.props.onSelect("mon");
</script>`;

const STEP_SERVE = `import { remoteComponentsMiddleware } from "@assistant-ui/remote-components-serve/node";

app.use(remoteComponentsMiddleware({ root: "/srv/widgets" }));`;

const STEP_HOST = `<RemoteComponent
  src="https://widgets.example/weather.html"
  city="Lisbon"
  onSelect={async (day) => setDay(day)}
/>`;

const STEPS = [
  {
    title: "Write a page",
    body: "Plain HTML. Props are on rc.props. Functions call back.",
    file: "weather.html",
    code: STEP_PAGE,
    lang: "html",
  },
  {
    title: "Serve it",
    body: "The serving layer adds the doctype, the runtime and a CSP.",
    file: "server.ts",
    code: STEP_SERVE,
    lang: "ts",
  },
  {
    title: "Render it",
    body: "Style the slot like any element. Everything else is a prop.",
    file: "App.tsx",
    code: STEP_HOST,
    lang: "tsx",
  },
] as const;

const FACTS = [
  {
    title: "Its own origin",
    body: "The iframe can't read your DOM, cookies or storage. Generated HTML runs on an opaque origin.",
    href: "/remote-components/docs/security",
  },
  {
    title: "Network you control",
    body: 'Remotes call public APIs directly, without your cookies. Turn it off with network="none", or allow a list of origins.',
    href: "/remote-components/docs/network",
  },
  {
    title: "Data across the boundary",
    body: "Props and arguments are structured-clone data. Functions only go one way, as props.",
    href: "/remote-components/docs/props",
  },
  {
    title: "Safe Content Frames",
    body: "For code you don't trust, each publisher gets a hashed origin on a public-suffix domain.",
    href: "/remote-components/docs/serving#safe-content-frames",
  },
] as const;

const PATHS = [
  {
    title: "Introduction",
    body: "Write a page, serve it, render it.",
    href: "/remote-components/docs",
  },
  {
    title: "Generated HTML",
    body: "Show a model's output without a server.",
    href: "/remote-components/docs/html",
  },
  {
    title: "Security",
    body: "What a remote can reach, and the threat model.",
    href: "/remote-components/docs/security",
  },
] as const;

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";

export default function RemoteComponentsPage() {
  return (
    <PageFrame pad="sub" className="pt-24 md:pt-36">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className={typePage}>Pages from another origin, laid out inline</h1>
        <p className={cn(typeDeck, "mx-auto mt-4 max-w-[54ch]")}>
          Show an HTML page from another origin in your app. It runs in a
          sandboxed iframe and behaves as if it were inline.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Link
            href="/remote-components/docs"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
          >
            Read the docs
          </Link>
          <span className="text-muted-foreground text-sm">
            The packages are not on npm yet.
          </span>
        </div>
      </header>

      <figure className="mt-14 md:mt-20">
        <BookingDemo />
        <figcaption className="text-muted-foreground mx-auto mt-4 max-w-[60ch] text-center text-xs">
          fig. 01 · the time slots are a separate document in a sandboxed frame.
          The card, the popover layer and the Book button belong to this page.
        </figcaption>
      </figure>

      <section className="mx-auto mt-24 max-w-2xl text-center md:mt-32">
        <h2 className={typeSection}>A page is the component</h2>
        <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
          A remote component is an HTML document with one script in it. Any page
          works: a fragment, a page a model wrote, a built React app. You render
          it with RemoteComponent. It takes your layout, your theme and your
          props. Its callbacks are async functions on your side.
        </p>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={cn(typeSection, "text-center")}>Write, serve, render</h2>
        <ol className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-6 lg:gap-y-0">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex min-w-0 flex-col lg:row-span-4 lg:grid lg:grid-rows-subgrid"
            >
              <span className="text-muted-foreground text-sm tabular-nums">
                {index + 1}
              </span>
              <h3 className="mt-1 font-medium">{step.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {step.body}
              </p>
              <div className="mt-4 flex min-w-0 flex-1 flex-col [&>figure]:flex-1">
                <Code
                  code={step.code}
                  lang={step.lang}
                  title={step.file}
                  className="my-0"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24 md:mt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={typeSection}>Isolation, set from outside</h2>
          <p className={cn(typeDeck, "mx-auto mt-3 max-w-[56ch]")}>
            The remote is untrusted code. Sandbox, origin and network are set by
            your page and the server.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <Link
              key={fact.title}
              href={fact.href}
              className={cn(
                field,
                "hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4",
              )}
            >
              <h3 className="font-medium">{fact.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {fact.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-32 max-w-5xl">
        <div className="divide-foreground/10 border-foreground/10 grid border-y md:grid-cols-3 md:divide-x">
          {PATHS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group hover:bg-foreground/[0.025] flex items-start justify-between gap-4 px-6 py-6 transition-colors"
            >
              <span>
                <span className="block font-medium">{path.title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {path.body}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </footer>
    </PageFrame>
  );
}

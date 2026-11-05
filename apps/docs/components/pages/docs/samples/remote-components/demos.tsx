"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  RemoteComponent,
  type RemoteComponentHandle,
} from "@assistant-ui/remote-components-host-react";
import { cn } from "@/lib/utils";
import {
  ControlButton,
  DemoHost,
  ErrorNotice,
  Placeholder,
  Range,
  Segmented,
  Stage,
  field,
} from "./demo-ui";
import { GENERATED_HTML, remotePage } from "./pages";

const PAGES = {
  rsvp: remotePage("rsvp"),
  stars: remotePage("stars"),
  centered: remotePage("centered"),
  counter: remotePage("counter"),
  slots: remotePage("slots"),
  note: remotePage("note"),
  tags: remotePage("tags"),
  panel: remotePage("panel"),
  greeting: remotePage("greeting"),
  search: remotePage("search"),
  slow: remotePage("slow"),
  crashy: remotePage("crashy"),
  themeCard: remotePage("theme-card"),
  shipping: remotePage("shipping"),
  menuButton: remotePage("menu-button"),
  dialogButton: remotePage("dialog-button"),
  weather: remotePage("weather"),
  probe: remotePage("probe"),
};

const errorFallback = (
  error: { code: string; message: string },
  retry: () => void,
) => <ErrorNotice code={error.code} message={error.message} retry={retry} />;

const pushLine = (lines: string[], line: string) =>
  [line, ...lines].slice(0, 3);

const SLOTS = ["9:00", "9:30", "10:30", "11:00", "13:00", "14:30"];
const MORE = ["15:00", "15:30", "16:00", "17:30"];

export function BookingDemo() {
  const [width, setWidth] = useState(560);
  const [boundary, setBoundary] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <DemoHost>
      <div
        className={cn(
          field,
          "mx-auto flex flex-col gap-5 p-5 text-sm [--focus-ring:var(--ring)] sm:p-6",
        )}
        style={{ maxWidth: width }}
      >
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="bg-foreground/[0.06] grid size-9 shrink-0 place-items-center rounded-full text-xs font-medium"
          >
            DR
          </div>
          <div>
            <div className="font-medium">Design review</div>
            <div className="text-muted-foreground">30 min, video call</div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-muted-foreground w-12 shrink-0 leading-snug">
            Thu
            <br />
            Nov 6
          </div>
          <div
            className={cn(
              "relative min-w-0 flex-1",
              boundary && "outline-foreground/40 outline-1 outline-dashed",
            )}
          >
            {boundary && (
              <span className="bg-background text-muted-foreground absolute -top-2.5 right-1 px-1 text-xs">
                remote
              </span>
            )}
            <RemoteComponent
              html={PAGES.slots}
              frameTitle="Time slots"
              fallback={<Placeholder className="h-16" />}
              slots={SLOTS}
              more={MORE}
              selected={picked}
              onPick={async (slot: string) => setPicked(slot)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span aria-live="polite" className="text-muted-foreground">
            {picked ? `${picked} on Thursday` : "Pick a time"}
          </span>
          <button
            type="button"
            disabled={picked === null}
            className="bg-primary text-primary-foreground h-8 rounded-md px-3 font-medium transition-opacity disabled:opacity-50"
          >
            Book
          </button>
        </div>
      </div>
      <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
        <Range
          label="Width"
          min={280}
          max={720}
          value={width}
          onChange={setWidth}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={boundary}
            onChange={(event) => setBoundary(event.target.checked)}
            className="accent-foreground"
          />
          Show boundary
        </label>
      </div>
    </DemoHost>
  );
}

export function RsvpDemo() {
  const [reply, setReply] = useState<string | null>(null);
  return (
    <Stage log={`onReply(${reply === null ? "" : JSON.stringify(reply)})`}>
      <RemoteComponent
        html={PAGES.rsvp}
        frameTitle="RSVP"
        fallback={<Placeholder className="h-16" />}
        event="Design sync"
        when="Thursday, 10:00"
        onReply={async (answer: string) => setReply(answer)}
      />
    </Stage>
  );
}

export function CounterDemo() {
  return (
    <Stage>
      <RemoteComponent
        html={PAGES.counter}
        frameTitle="Counter"
        fallback={<Placeholder className="w-24" />}
        style={{ width: "fit-content" }}
        label="Clicks"
      />
    </Stage>
  );
}

/** Fetches public/rc/rating.html (scripts/build-remote-components.mjs); the plain stars page if it is missing. */
function useBuiltRating(): string | undefined {
  const [html, setHtml] = useState<string>();
  useEffect(() => {
    let live = true;
    fetch("/rc/rating.html")
      .then((r) => (r.ok ? r.text() : PAGES.stars))
      .catch(() => PAGES.stars)
      .then((text) => live && setHtml(text));
    return () => {
      live = false;
    };
  }, []);
  return html;
}

function Stars({ html }: { html: string | undefined }) {
  const [value, setValue] = useState(3);
  return (
    <Stage
      log={`value = ${value}`}
      controls={
        <ControlButton onClick={() => setValue(0)}>Clear</ControlButton>
      }
    >
      {html === undefined ? (
        <Placeholder className="h-8 w-44" />
      ) : (
        <RemoteComponent
          html={html}
          frameTitle="Rating"
          fallback={<Placeholder className="h-8 w-44" />}
          style={{ width: "fit-content" }}
          value={value}
          onRate={async (n: number) => setValue(n)}
        />
      )}
    </Stage>
  );
}

export function StarsDemo() {
  return <Stars html={PAGES.stars} />;
}

/** The landing page's step-1 component (rating.tsx), as built by `remote-components build`. */
export function RatingDemo() {
  return <Stars html={useBuiltRating()} />;
}

const hostBox = "border-foreground/10 rounded-document border";

export function NoteDemo() {
  const [width, setWidth] = useState(420);
  return (
    <Stage
      controls={
        <Range
          label="Container width"
          min={160}
          max={640}
          value={width}
          onChange={setWidth}
        />
      }
    >
      <div className={cn(hostBox, "max-w-full p-3")} style={{ width }}>
        <RemoteComponent
          html={PAGES.note}
          frameTitle="Note"
          fallback={<Placeholder className="h-16" />}
          title="Quarterly report"
          text="Revenue grew in every region. Support volume fell after the new onboarding flow. Hiring is on plan for the next quarter."
        />
      </div>
    </Stage>
  );
}

type TagMode = "flex" | "grid" | "fit-content";

const TAG_LAYOUTS: Record<
  TagMode,
  { outer: CSSProperties; slot: CSSProperties }
> = {
  flex: {
    outer: { display: "flex", alignItems: "center", gap: 8 },
    slot: { flex: "0 1 auto", minWidth: 0 },
  },
  grid: {
    outer: {
      display: "grid",
      gridTemplateColumns: "auto minmax(min-content, max-content) auto",
      alignItems: "center",
      gap: 8,
    },
    slot: {},
  },
  "fit-content": {
    outer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 8,
    },
    slot: { width: "fit-content", maxWidth: "100%" },
  },
};

const TAGS = ["design", "frontend", "q4", "needs review", "accessibility"];

export function TagsDemo() {
  const [mode, setMode] = useState<TagMode>("flex");
  const [width, setWidth] = useState(520);
  const layout = TAG_LAYOUTS[mode];
  return (
    <Stage
      controls={
        <>
          <Segmented
            label="Container"
            value={mode}
            onChange={setMode}
            options={[
              { value: "flex", label: "flex" },
              { value: "grid", label: "grid" },
              { value: "fit-content", label: "fit-content" },
            ]}
          />
          <Range
            label="Container width"
            min={160}
            max={640}
            value={width}
            onChange={setWidth}
          />
        </>
      }
    >
      <div style={{ width, maxWidth: "100%", ...layout.outer }}>
        <span className="text-muted-foreground">Labels</span>
        <RemoteComponent
          html={PAGES.tags}
          frameTitle="Tags"
          fallback={<Placeholder className="h-6 w-32" />}
          style={layout.slot}
          tags={TAGS}
        />
        <button
          type="button"
          className="hover:bg-foreground/[0.05] h-7 rounded-sm px-2.5 transition-colors"
        >
          Edit
        </button>
      </div>
    </Stage>
  );
}

export function PanelDemo() {
  const [height, setHeight] = useState(140);
  return (
    <Stage
      controls={
        <Range
          label="Row height"
          min={60}
          max={240}
          value={height}
          onChange={setHeight}
        />
      }
    >
      <div className="flex gap-2" style={{ height }}>
        <div className="bg-foreground/[0.04] text-muted-foreground rounded-document w-24 shrink-0 p-2.5 text-[13px]">
          Sidebar
        </div>
        <RemoteComponent
          html={PAGES.panel}
          frameTitle="Panel"
          fallback={<Placeholder className="h-full flex-1" />}
          style={{ flex: 1 }}
          title="Remote panel"
        />
      </div>
    </Stage>
  );
}

export function CenteredDemo() {
  const [fixed, setFixed] = useState(false);
  return (
    <Stage
      controls={
        <Segmented
          label="Slot height"
          value={fixed ? "fixed" : "auto"}
          onChange={(value) => setFixed(value === "fixed")}
          options={[
            { value: "auto", label: "height: auto" },
            { value: "fixed", label: "height: 200px" },
          ]}
        />
      }
    >
      <RemoteComponent
        html={PAGES.centered}
        frameTitle="Centered page"
        fallback={<Placeholder className={fixed ? "h-[200px]" : "h-16"} />}
        className="outline-foreground/20 outline-1 outline-dashed"
        {...(fixed && { style: { height: 200 } })}
      />
    </Stage>
  );
}

export function GreetingDemo() {
  const [name, setName] = useState("Ada");
  const [log, setLog] = useState<string[]>([]);
  const likes = useRef(0);
  return (
    <Stage
      log={
        log.length
          ? log.map((line, i) => <div key={i}>{line}</div>)
          : "Host log is empty."
      }
      controls={
        <label className="text-muted-foreground flex items-center gap-2">
          name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-input text-foreground h-7 w-36 rounded-md border bg-transparent px-2"
          />
        </label>
      }
    >
      <RemoteComponent
        html={PAGES.greeting}
        frameTitle="Greeting"
        fallback={<Placeholder />}
        name={name}
        onLike={(who: string) => {
          likes.current += 1;
          const count = likes.current;
          setLog((lines) => pushLine(lines, `onLike("${who}") → ${count}`));
          return count;
        }}
      />
    </Stage>
  );
}

const CITIES = ["Berlin", "Bern", "Bergen", "Lisbon", "Oslo", "Osaka"];

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export function SearchDemo() {
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => setLog((lines) => pushLine(lines, line));
  return (
    <Stage
      log={
        log.length
          ? log.map((line, i) => <div key={i}>{line}</div>)
          : "Search, then cancel before it finishes."
      }
    >
      <RemoteComponent
        html={PAGES.search}
        frameTitle="Search"
        fallback={<Placeholder className="h-14" />}
        onSearch={async (
          query: string,
          { signal }: { signal: AbortSignal },
        ) => {
          add(`onSearch("${query}") started`);
          signal.addEventListener("abort", () => add("host signal aborted"));
          await sleep(1500, signal);
          add(`onSearch("${query}") resolved`);
          return CITIES.filter((city) =>
            city.toLowerCase().includes(query.toLowerCase()),
          );
        }}
      />
    </Stage>
  );
}

export function FallbackDemo() {
  const ref = useRef<RemoteComponentHandle>(null);
  return (
    <Stage
      controls={
        <ControlButton onClick={() => ref.current?.reload()}>
          Reload
        </ControlButton>
      }
    >
      <RemoteComponent
        ref={ref}
        html={PAGES.slow}
        frameTitle="Slow"
        fallback={<Placeholder />}
      />
    </Stage>
  );
}

export function ErrorsDemo() {
  const ref = useRef<RemoteComponentHandle>(null);
  const [log, setLog] = useState<string[]>([]);
  return (
    <Stage
      log={
        log.length
          ? log.map((line, i) => <div key={i}>{line}</div>)
          : "Click Throw, then Reject a promise."
      }
      controls={
        <ControlButton onClick={() => ref.current?.reload()}>
          Reload
        </ControlButton>
      }
    >
      <RemoteComponent
        ref={ref}
        html={PAGES.crashy}
        frameTitle="Crashy"
        fallback={<Placeholder />}
        errorFallback={errorFallback}
        onError={(error, { fatal }) =>
          setLog((lines) =>
            pushLine(
              lines,
              `onError(${error.code}, fatal: ${fatal}) ${error.message}`,
            ),
          )
        }
      />
    </Stage>
  );
}

export function FailuresDemo() {
  return (
    <Stage className="grid gap-3">
      <RemoteComponent
        src="/robots.txt"
        sandbox="allow-scripts"
        frameTitle="No runtime"
        fallback={<Placeholder />}
        errorFallback={errorFallback}
      />
      <RemoteComponent
        src="/robots.txt"
        sandbox="allow-scripts"
        timeout={2000}
        frameTitle="Too slow"
        fallback={<Placeholder />}
        errorFallback={errorFallback}
      />
    </Stage>
  );
}

type ThemePreset = "page" | "paper" | "night" | "large";

const THEMES: Record<ThemePreset, CSSProperties> = {
  page: {},
  paper: {
    colorScheme: "light",
    fontFamily: 'Georgia, "Times New Roman", serif',
    ["--background" as string]: "#fbf8f1",
    ["--card" as string]: "#fffdf8",
    ["--foreground" as string]: "#2b2620",
    ["--muted" as string]: "#f1ece1",
    ["--muted-foreground" as string]: "#7a6f60",
    ["--border" as string]: "#e2d9c6",
    ["--primary" as string]: "#9a3412",
    ["--primary-foreground" as string]: "#fffdf8",
  },
  night: {
    colorScheme: "dark",
    ["--background" as string]: "#0e1525",
    ["--card" as string]: "#131c30",
    ["--foreground" as string]: "#e3e8f0",
    ["--muted" as string]: "#1c2740",
    ["--muted-foreground" as string]: "#93a0b5",
    ["--border" as string]: "#26324a",
    ["--primary" as string]: "#7cb2ff",
    ["--primary-foreground" as string]: "#0e1525",
  },
  large: {
    fontSize: 18,
    letterSpacing: "0.01em",
    ["--radius-sm" as string]: "14px",
  },
};

export function ThemeDemo() {
  const [preset, setPreset] = useState<ThemePreset>("page");
  return (
    <Stage
      controls={
        <Segmented
          label="Host theme"
          value={preset}
          onChange={setPreset}
          options={[
            { value: "page", label: "This page" },
            { value: "paper", label: "Paper" },
            { value: "night", label: "Night" },
            { value: "large", label: "Large" },
          ]}
        />
      }
    >
      <div
        className="border-border rounded-document border p-5"
        style={{
          ...THEMES[preset],
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <RemoteComponent
          html={PAGES.themeCard}
          frameTitle="Themed card"
          fallback={<Placeholder className="h-24" />}
        />
      </div>
    </Stage>
  );
}

export function ShippingDemo() {
  const ref = useRef<RemoteComponentHandle>(null);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <Stage
      log={saved ? `onSave: ${saved}` : "Click Name, then press Tab."}
      controls={
        <>
          <ControlButton
            onClick={() => ref.current?.focus("first", { focusVisible: true })}
          >
            focus(&quot;first&quot;)
          </ControlButton>
          <ControlButton
            onClick={() => ref.current?.focus("last", { focusVisible: true })}
          >
            focus(&quot;last&quot;)
          </ControlButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Name"
          placeholder="Name"
          className="border-input h-7 w-32 rounded-md border bg-transparent px-2"
        />
        <RemoteComponent
          ref={ref}
          html={PAGES.shipping}
          frameTitle="Shipping"
          fallback={<Placeholder className="w-80" />}
          style={{ width: "fit-content", maxWidth: "100%" }}
          onSave={async (choice: { zip: string; speed: string }) =>
            setSaved(`${choice.speed} to ${choice.zip || "no ZIP"}`)
          }
        />
        <button
          type="button"
          className="bg-primary text-primary-foreground h-7 rounded-md px-3 font-medium"
        >
          Pay
        </button>
      </div>
    </Stage>
  );
}

export function MenuDemo() {
  return (
    <Stage>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground">24 results</span>
        <RemoteComponent
          html={PAGES.menuButton}
          frameTitle="Sort menu"
          fallback={<Placeholder className="w-32" />}
          style={{ width: "fit-content" }}
        />
      </div>
    </Stage>
  );
}

export function DialogDemo() {
  return (
    <Stage>
      <RemoteComponent
        html={PAGES.dialogButton}
        frameTitle="Rename"
        fallback={<Placeholder className="w-32" />}
      />
    </Stage>
  );
}

type Policy = "public" | "none" | "allow" | "other";

const POLICIES: Record<Policy, "public" | "none" | string[]> = {
  public: "public",
  none: "none",
  allow: ["https://api.open-meteo.com"],
  other: ["https://example.com"],
};

export function WeatherDemo() {
  const [policy, setPolicy] = useState<Policy>("public");
  return (
    <Stage
      controls={
        <Segmented
          label="Network policy"
          value={policy}
          onChange={setPolicy}
          options={[
            { value: "public", label: '"public"' },
            { value: "none", label: '"none"' },
            { value: "allow", label: "open-meteo.com" },
            { value: "other", label: "example.com" },
          ]}
        />
      }
    >
      <RemoteComponent
        key={policy}
        html={PAGES.weather}
        network={POLICIES[policy]}
        frameTitle="Weather"
        fallback={<Placeholder className="h-16" />}
      />
    </Stage>
  );
}

const PROBE_COOKIE = "rc_probe";
const PROBE_STORAGE_KEY = "rc:probe";

export function ProbeDemo() {
  const [mode, setMode] = useState<"opaque" | "scf">("opaque");
  useEffect(() => {
    document.cookie = `${PROBE_COOKIE}=secret; path=/; SameSite=Lax`;
    try {
      localStorage.setItem(PROBE_STORAGE_KEY, "secret");
    } catch {}
  }, []);
  return (
    <Stage
      controls={
        <Segmented
          label="Isolation"
          value={mode}
          onChange={setMode}
          options={[
            { value: "opaque", label: "Opaque" },
            { value: "scf", label: "Safe Content Frame" },
          ]}
        />
      }
    >
      <RemoteComponent
        key={mode}
        html={PAGES.probe}
        isolation={mode === "scf" ? "scf" : "url"}
        network="none"
        frameTitle="Probe"
        fallback={<Placeholder className="h-36" />}
        errorFallback={errorFallback}
        hostCookie={PROBE_COOKIE}
        hostStorageKey={PROBE_STORAGE_KEY}
      />
    </Stage>
  );
}

export function HtmlEditorDemo() {
  const [text, setText] = useState(GENERATED_HTML);
  const [html, setHtml] = useState(GENERATED_HTML);
  const [mode, setMode] = useState<"srcdoc" | "scf">("srcdoc");
  const [asked, setAsked] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => setHtml(text), 400);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <Stage
      className="grid gap-4"
      log={
        asked.length
          ? asked.map((question, i) => (
              <div key={i}>onAsk(&quot;{question}&quot;)</div>
            ))
          : "Edit the HTML, or click a button."
      }
      controls={
        <Segmented
          label="Isolation"
          value={mode}
          onChange={setMode}
          options={[
            { value: "srcdoc", label: "srcdoc" },
            { value: "scf", label: "Safe Content Frame" },
          ]}
        />
      }
    >
      <textarea
        aria-label="HTML"
        spellCheck={false}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="border-input bg-background rounded-document h-56 w-full resize-y border p-3 font-mono text-xs leading-relaxed [font-variant-ligatures:none]"
      />
      <RemoteComponent
        key={mode}
        html={html}
        isolation={mode === "scf" ? "scf" : "url"}
        network="none"
        frameTitle="Generated HTML"
        fallback={<Placeholder className="h-32" />}
        errorFallback={errorFallback}
        onAsk={async (question: string) =>
          setAsked((lines) => pushLine(lines, question))
        }
      />
    </Stage>
  );
}

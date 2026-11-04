import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  RemoteHostProvider,
  type RemoteComponentHandle,
} from "@assistant-ui/remote-components-host-react";
import { netPage, widgetPage } from "./fixtures.js";

export type ComponentName =
  | "text"
  | "card"
  | "fill"
  | "margins"
  | "dynamic"
  | "themed"
  | "units"
  | "menu-trigger"
  | "dialog-trigger"
  | "focus"
  | "slow"
  | "throws"
  | "rpc"
  | "security"
  | "square"
  | "nest"
  | "cq"
  | "search"
  | "anim"
  | "dir"
  | "buttons"
  | "radios";

export interface SubjectOptions {
  c: ComponentName;
  id?: string;
  props?: Record<string, unknown>;
  style?: CSSProperties;
  className?: string;
  /** Extra host props for the remote variant (fallback, timeout, …). */
  host?: Record<string, unknown>;
  /** Query string appended to the remote URL. */
  query?: string;
  /** Override the remote URL entirely. */
  src?: string;
}

export type Subject = (o: SubjectOptions) => ReactNode;

export interface CaseState {
  [key: string]: unknown;
}

export interface Case {
  name: string;
  /**
   * "compare": render inline and remote side by side; tests compare geometry
   * and pixels. "remote": render the remote variant only (behavioural cases).
   */
  mode: "compare" | "remote";
  render(S: Subject, state: CaseState): ReactNode;
}

/** Renders its children inside an open shadow root (focus-shadow). */
function ShadowBox({ children }: { children: ReactNode }): ReactNode {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el !== null)
      setRoot(el.shadowRoot ?? el.attachShadow({ mode: "open" }));
  }, []);
  return (
    <div ref={ref}>{root !== null ? createPortal(children, root) : null}</div>
  );
}

function PerfPage({
  S,
  n,
  tick,
}: {
  S: Subject;
  n: number;
  tick: boolean;
}): ReactNode {
  const clock = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!tick) return;
    let i = 0;
    const t = setInterval(() => {
      if (clock.current) clock.current.textContent = String(++i);
    }, 50);
    return () => clearInterval(t);
  }, [tick]);
  const deep = (depth: number, child: ReactNode): ReactNode =>
    depth === 0 ? child : <div className="wrap">{deep(depth - 1, child)}</div>;
  return (
    <div>
      <span id="clock" ref={clock}>
        0
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 4,
          width: 900,
        }}
      >
        {Array.from({ length: n }, (_, i) => (
          <div key={i}>
            {deep(12, S({ c: "text", id: `p${i}`, props: { text: `#${i}` } }))}
          </div>
        ))}
      </div>
      <ul style={{ height: 200, overflow: "hidden" }}>
        {Array.from({ length: 500 }, (_, i) => (
          <li key={i}>
            <span>row {i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A remote between two host buttons, and buttons that call `ref.focus()`. */
function FocusButtons({ S }: { S: Subject }): ReactNode {
  const ref = useRef<RemoteComponentHandle>(null);
  return (
    <div>
      <button id="before">before</button>
      <div style={{ width: 300 }}>{S({ c: "focus", host: { ref } })}</div>
      <button id="after">after</button>
      <button id="focus-first" onClick={() => ref.current?.focus("first")}>
        focus first
      </button>
      <button id="focus-last" onClick={() => ref.current?.focus("last")}>
        focus last
      </button>
    </div>
  );
}

/**
 * A host whose width depends on the content height (a feedback loop with
 * no browser hysteresis): 200px wide while the content is taller than
 * 250px, 300px otherwise. Square content (height = width) flips forever
 * unless the remote side settles it.
 */
function LoopBox({ children }: { children: ReactNode }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() =>
      setWidth(el.getBoundingClientRect().height > 250 ? 200 : 300),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} data-loop-box="" style={{ width }}>
      {children}
    </div>
  );
}

const box = (w: number, h: number, bg = "#cbd5e1"): ReactNode => (
  <div style={{ width: w, height: h, background: bg, flex: "none" }} />
);
// Solid, not dashed: WebKit paints a dashed outline with a different dash
// phase when a composited layer (an iframe) is next to it. Host painting,
// not remote fidelity.
const outline: CSSProperties = { outline: "1px solid #94a3b8" };

/**
 * One arbitrary page as a remote (tests/pages.spec.ts). URL params: `src`,
 * `width` (default 480), `layout` = block | fit (in a fit-content box) |
 * raw (a plain 300px iframe, no runtime) | scf.
 */
function PageCase({ S }: { S: Subject }): ReactNode {
  const q = new URLSearchParams(location.search);
  const src = q.get("src") ?? "";
  const width = Number(q.get("width") ?? 480);
  const layout = q.get("layout") ?? "block";
  if (layout === "raw") {
    return (
      <iframe
        data-raw-frame=""
        src={src}
        title="raw"
        sandbox="allow-scripts allow-same-origin"
        style={{ display: "block", width, height: 300, border: 0, ...outline }}
      />
    );
  }
  const subject = S({
    c: "text",
    src,
    host: { timeout: 8000, ...(layout === "scf" ? { isolation: "scf" } : {}) },
    props: {
      city: "Berlin",
      note: "Bring a coat",
      onSelect: (day: unknown) =>
        window.__events.push({
          type: "select",
          id: "main",
          message: JSON.stringify(day),
        }),
      onSubmit: (fields: unknown) =>
        window.__events.push({
          type: "submit",
          id: "main",
          message: JSON.stringify(fields),
        }),
    },
  });
  return layout === "fit" ? (
    <div style={{ width, ...outline }}>
      <div style={{ width: "fit-content", ...outline }}>{subject}</div>
    </div>
  ) : (
    <div style={{ width, ...outline }}>{subject}</div>
  );
}

export const cases: Case[] = [
  { name: "page", mode: "remote", render: (S) => <PageCase S={S} /> },
  /* ---------------- sizing ---------------- */
  {
    name: "auto-height",
    mode: "compare",
    render: (S) => <div style={{ width: 300 }}>{S({ c: "text" })}</div>,
  },
  {
    name: "auto-height-card",
    mode: "compare",
    render: (S) => <div style={{ width: 260 }}>{S({ c: "card" })}</div>,
  },
  {
    name: "resize-container",
    mode: "compare",
    render: (S, st) => (
      <div
        style={{ width: (st.width as number | undefined) ?? 400, ...outline }}
      >
        {S({ c: "card" })}
      </div>
    ),
  },
  {
    name: "fill-width",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 500 }}>
        {S({ c: "card", props: { body: "Short." } })}
      </div>
    ),
  },
  {
    name: "fractional-width",
    mode: "compare",
    render: (S) => <div style={{ width: 287.4 }}>{S({ c: "card" })}</div>,
  },
  {
    name: "min-content",
    mode: "compare",
    render: (S) => (
      <div style={{ width: "min-content", ...outline }}>{S({ c: "card" })}</div>
    ),
  },
  {
    name: "max-content",
    mode: "compare",
    render: (S) => (
      <div style={{ width: "max-content", ...outline }}>{S({ c: "card" })}</div>
    ),
  },
  {
    name: "fit-content-narrow",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 200 }}>
        <div style={{ width: "fit-content", ...outline }}>
          {S({ c: "text" })}
        </div>
      </div>
    ),
  },
  {
    name: "float",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 400 }}>
        <div style={{ float: "left", ...outline }}>
          {S({ c: "card", props: { body: "Floated." } })}
        </div>
        Text next to the float flows around it.
      </div>
    ),
  },
  {
    name: "overflow-narrow",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 60, ...outline }}>
        {S({ c: "text", props: { text: "Supercalifragilistic word" } })}
      </div>
    ),
  },
  {
    name: "margins",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 400, background: "#f1f5f9" }}>
        {S({ c: "margins" })}
      </div>
    ),
  },
  {
    name: "units",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 400, fontSize: 20 }}>{S({ c: "units" })}</div>
    ),
  },
  {
    name: "fixed-height",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({ c: "fill", style: { height: 80 } })}
      </div>
    ),
  },
  {
    name: "aspect-ratio",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 400 }}>
        {S({ c: "fill", style: { aspectRatio: "16 / 9", width: 320 } })}
      </div>
    ),
  },

  /* ---------------- flexbox ---------------- */
  {
    name: "flex-row-auto",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 560,
          alignItems: "flex-start",
        }}
      >
        {S({ c: "text", id: "a", style: { flex: "0 0 auto" } })}
        {box(60, 30)}
        {S({
          c: "card",
          id: "b",
          style: { flex: "0 0 auto" },
          props: { body: "Card." },
        })}
      </div>
    ),
  },
  {
    name: "flex-grow",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 560,
          alignItems: "flex-start",
        }}
      >
        {S({ c: "card", id: "a", style: { flex: 1 } })}
        {S({ c: "text", id: "b", style: { flex: 2 } })}
        {box(80, 30)}
      </div>
    ),
  },
  {
    name: "flex-shrink",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 300,
          alignItems: "flex-start",
          ...outline,
        }}
      >
        {S({ c: "text", id: "a" })}
        {S({
          c: "text",
          id: "b",
          props: { text: "Another fairly long sentence here" },
        })}
      </div>
    ),
  },
  {
    name: "flex-shrink-min0",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 160,
          alignItems: "flex-start",
          ...outline,
        }}
      >
        {S({
          c: "text",
          id: "a",
          style: { minWidth: 0 },
          props: { text: "Incomprehensibilities everywhere" },
        })}
        {S({ c: "card", id: "b", style: { minWidth: 0 } })}
      </div>
    ),
  },
  {
    name: "flex-wrap",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          width: 400,
          alignItems: "flex-start",
        }}
      >
        {S({
          c: "card",
          id: "a",
          style: { flex: "1 1 auto" },
          props: { title: "One", body: "Short" },
        })}
        {S({
          c: "card",
          id: "b",
          style: { flex: "1 1 auto" },
          props: { title: "Two", body: "A somewhat longer body text" },
        })}
        {S({
          c: "card",
          id: "c",
          style: { flex: "1 1 auto" },
          props: { title: "Three", body: "Mid length body" },
        })}
        {S({ c: "text", id: "d", style: { flex: "0 0 auto" } })}
      </div>
    ),
  },
  {
    name: "flex-column",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 400,
          alignItems: "flex-start",
        }}
      >
        {S({ c: "text", id: "a" })}
        {S({ c: "card", id: "b", props: { body: "Column item" } })}
        <div style={{ alignSelf: "center" }}>
          {S({ c: "text", id: "c", props: { text: "centered" } })}
        </div>
        {S({ c: "card", id: "d", style: { alignSelf: "stretch" } })}
      </div>
    ),
  },
  {
    name: "flex-column-grow",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 300,
          height: 260,
          ...outline,
        }}
      >
        {S({ c: "text", id: "a" })}
        {S({ c: "fill", id: "b", style: { flex: 1 } })}
      </div>
    ),
  },
  {
    name: "flex-stretch",
    mode: "compare",
    render: (S) => (
      <div style={{ display: "flex", gap: 8, width: 400 }}>
        {box(80, 120)}
        {S({ c: "fill", id: "a", style: { flex: 1 } })}
      </div>
    ),
  },
  {
    name: "flex-align-center",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 400,
          height: 100,
          alignItems: "center",
          justifyContent: "space-between",
          ...outline,
        }}
      >
        {S({ c: "text", id: "a", props: { text: "left" } })}
        {S({ c: "card", id: "b", props: { title: "Mid", body: "dle" } })}
        {S({ c: "text", id: "c", props: { text: "right" } })}
      </div>
    ),
  },

  /* ---------------- grid ---------------- */
  {
    name: "grid-auto",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto",
          gap: 8,
          width: 400,
          alignItems: "start",
        }}
      >
        {S({ c: "text", id: "a" })}
        {S({ c: "card", id: "b" })}
      </div>
    ),
  },
  {
    name: "grid-tracks",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "min-content max-content 1fr",
          gap: 8,
          width: 580,
          alignItems: "start",
        }}
      >
        {S({ c: "text", id: "a" })}
        {S({ c: "text", id: "b", props: { text: "max content track" } })}
        {S({ c: "card", id: "c" })}
      </div>
    ),
  },
  {
    name: "grid-autofill",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
          width: 560,
        }}
      >
        {["One", "Two", "Three", "Four", "Five"].map((t) =>
          S({ c: "card", id: t, props: { title: t, body: `${t} body` } }),
        )}
      </div>
    ),
  },

  {
    name: "scrollbar-loop",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 300, height: 292, overflow: "auto", ...outline }}>
        {S({ c: "square" })}
      </div>
    ),
  },

  {
    name: "feedback-loop",
    mode: "remote",
    render: (S) => <LoopBox>{S({ c: "square" })}</LoopBox>,
  },

  /* ---------------- harder layout ---------------- */
  {
    name: "rtl",
    mode: "compare",
    render: (S) => (
      <div dir="rtl" style={{ width: 400, ...outline }}>
        {S({
          c: "text",
          id: "a",
          props: { text: "Mixed text: שלום עולם and more words" },
        })}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {S({
            c: "card",
            id: "b",
            props: { title: "כותרת", body: "גוף הכרטיס עם טקסט" },
          })}
          {S({
            c: "text",
            id: "c",
            style: { flex: "0 0 auto" },
            props: { text: "end" },
          })}
        </div>
      </div>
    ),
  },
  {
    name: "scrollbar-appears",
    mode: "compare",
    render: (S, st) => (
      <div style={{ width: 300, height: 200, overflow: "auto", ...outline }}>
        {S({ c: "card", id: "a" })}
        {S({
          c: "text",
          id: "b",
          props: {
            text: st.long === true ? "Long text. ".repeat(40) : "Short text.",
          },
        })}
      </div>
    ),
  },
  {
    name: "many-resize",
    mode: "compare",
    render: (S, st) => (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          width: (st.width as number | undefined) ?? 580,
          alignItems: "flex-start",
        }}
      >
        {Array.from({ length: 24 }, (_, i) =>
          S({
            c: i % 3 === 0 ? "card" : "text",
            id: `m${i}`,
            style: { flex: "1 1 auto" },
            props:
              i % 3 === 0
                ? { title: `Card ${i}`, body: "Body text" }
                : { text: `Item ${i} text` },
          }),
        )}
      </div>
    ),
  },
  {
    name: "nested",
    mode: "compare",
    render: (S) => <div style={{ width: 420 }}>{S({ c: "nest" })}</div>,
  },
  {
    name: "container-query",
    mode: "compare",
    render: (S, st) => (
      <div>
        <div
          style={{
            containerType: "inline-size",
            width: (st.width as number | undefined) ?? 420,
            ...outline,
          }}
        >
          {S({ c: "cq", id: "a" })}
        </div>
        <div
          style={{
            containerType: "inline-size",
            containerName: "panel",
            width: 500,
            display: "flex",
            gap: 8,
            marginTop: 8,
          }}
        >
          {box(120, 40)}
          {S({ c: "cq", id: "b", style: { flex: 1 } })}
        </div>
      </div>
    ),
  },

  /* ---------------- dynamic ---------------- */
  {
    name: "dynamic",
    mode: "compare",
    render: (S) => <div style={{ width: 320 }}>{S({ c: "dynamic" })}</div>,
  },
  /** `:dir(rtl)` and `[dir="rtl"]` selectors inside the remote (not just the direction property). */
  {
    name: "dir-selectors",
    mode: "compare",
    render: (S) => (
      <div dir="rtl" style={{ width: 300, ...outline }}>
        {S({ c: "dir" })}
      </div>
    ),
  },

  /* ---------------- theming ---------------- */
  {
    name: "theme-tokens",
    mode: "compare",
    render: (S) => (
      <div
        style={
          {
            width: 400,
            color: "#7c2d12",
            fontFamily: "Georgia, serif",
            fontSize: 15,
            lineHeight: 1.6,
            letterSpacing: "0.02em",
            "--accent": "#0d9488",
            "--accent-fg": "white",
            "--radius": "12px",
          } as CSSProperties
        }
      >
        {S({ c: "themed" })}
      </div>
    ),
  },
  {
    // The host fades color and letter-spacing on a theme switch. The remote
    // must end on the final values, not the ones from the first frame.
    name: "theme-transition",
    mode: "compare",
    render: (S, st) => (
      <div
        style={{
          width: 320,
          transition: "color 300ms linear, letter-spacing 300ms linear",
          color: st.dark === true ? "rgb(220, 38, 38)" : "rgb(37, 99, 235)",
          letterSpacing: st.dark === true ? "2px" : "0px",
        }}
      >
        {S({ c: "text" })}
      </div>
    ),
  },
  {
    name: "dark-mode",
    mode: "compare",
    render: (S, st) => (
      <div
        style={
          {
            width: 420,
            padding: 12,
            colorScheme: st.light === true ? "light" : "dark",
            background: st.light === true ? "#ffffff" : "#18181b",
            color: st.light === true ? "#18181b" : "#e4e4e7",
            "--accent": st.light === true ? "#2563eb" : "#60a5fa",
            "--accent-fg": st.light === true ? "white" : "black",
            "--radius": "4px",
          } as CSSProperties
        }
      >
        {S({ c: "themed" })}
      </div>
    ),
  },
  {
    name: "custom-font",
    mode: "compare",
    render: (S) => (
      <div style={{ width: 400, fontFamily: "Lobster, cursive", fontSize: 22 }}>
        {S({ c: "text", id: "a" })}
        {S({ c: "card", id: "b" })}
      </div>
    ),
  },
  {
    name: "transparent",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          width: 400,
          padding: 16,
          background:
            "repeating-linear-gradient(45deg, #fecaca 0 10px, #fef9c3 10px 20px)",
        }}
      >
        {S({ c: "text" })}
      </div>
    ),
  },

  /* ---------------- Safe Content Frame isolation ---------------- */
  {
    name: "scf-layout",
    mode: "compare",
    render: (S) => (
      <div
        style={{
          display: "flex",
          gap: 8,
          width: 520,
          alignItems: "flex-start",
        }}
      >
        {S({
          c: "text",
          id: "a",
          src: "http://127.0.0.1:5181/text/single.html",
          host: { isolation: "scf" },
          style: { flex: "0 0 auto" },
        })}
        {S({
          c: "card",
          id: "b",
          src: "http://127.0.0.1:5181/card/",
          host: { isolation: "scf" },
          style: { flex: 1 },
        })}
      </div>
    ),
  },
  {
    name: "scf-behaviour",
    mode: "remote",
    render: (S, st) => (
      <div style={{ width: 400 }}>
        {S({
          c: "rpc",
          id: "rpc",
          src: "http://127.0.0.1:5181/rpc/single.html",
          host: { isolation: "scf" },
          props: {
            count: (st.count as number | undefined) ?? 0,
            onCompute: async (a: number, b: number) => a + b,
          },
        })}
        {S({
          c: "security",
          id: "sec",
          src: "http://127.0.0.1:5181/security/single.html",
          host: { isolation: "scf" },
        })}
        {S({
          c: "menu-trigger",
          id: "menu",
          src: "http://127.0.0.1:5181/menu-trigger/",
          host: { isolation: "scf" },
        })}
      </div>
    ),
  },
  {
    // `scf.salt: "instance"`: one hashed origin per instanceId.
    name: "scf-instance",
    mode: "remote",
    render: (S) => (
      <RemoteHostProvider
        scf={{ shimDomain: "rc.localhost", salt: "instance" }}
      >
        <div style={{ width: 400 }}>
          {S({
            c: "security",
            id: "a",
            src: "http://127.0.0.1:5181/security/single.html",
            host: { isolation: "scf", instanceId: "inst-a" },
          })}
          {S({
            c: "security",
            id: "a2",
            src: "http://127.0.0.1:5181/security/single.html",
            host: { isolation: "scf", instanceId: "inst-a" },
          })}
          {S({
            c: "security",
            id: "b",
            src: "http://127.0.0.1:5181/security/single.html",
            host: { isolation: "scf", instanceId: "inst-b" },
          })}
        </div>
      </RemoteHostProvider>
    ),
  },

  /* ---------------- harder behaviour ---------------- */
  {
    name: "rpc-cancel",
    mode: "remote",
    render: (S) =>
      S({
        c: "search",
        props: {
          onSearch: (q: string, { signal }: { signal: AbortSignal }) =>
            new Promise<string>((resolve, reject) => {
              window.__events.push({ type: "search-start", id: q });
              const t = setTimeout(() => resolve(`found ${q}`), 5000);
              signal.addEventListener("abort", () => {
                clearTimeout(t);
                window.__events.push({
                  type: "search-abort",
                  id: q,
                  code: (signal.reason as { code?: string }).code ?? "",
                });
                reject(signal.reason);
              });
            }),
        },
      }),
  },
  {
    name: "tab-order",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 400 }}>
        <button id="b0">b0</button>
        {S({ c: "focus", id: "a" })}
        {S({ c: "text", id: "empty", props: { text: "no tab stops here" } })}
        <button id="b1">b1</button>
        {S({ c: "focus", id: "c" })}
        {S({ c: "nest", id: "n", props: { inner: "focus" } })}
        <button id="b2">b2</button>
      </div>
    ),
  },
  {
    name: "high-frequency",
    mode: "remote",
    render: (S, st) => (
      <div style={{ width: 400 }}>
        {S({
          c: "rpc",
          props: { count: (st.count as number | undefined) ?? 0 },
        })}
      </div>
    ),
  },
  {
    name: "teardown",
    mode: "remote",
    render: (S, st) =>
      st.hidden === true ? (
        <div id="empty">gone</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: 600 }}>
          {Array.from({ length: 12 }, (_, i) =>
            S({
              c: i % 3 === 0 ? "menu-trigger" : i % 3 === 1 ? "rpc" : "themed",
              id: `t${i}`,
              ...(i % 3 === 1
                ? {
                    props: { onCompute: async (a: number, b: number) => a + b },
                  }
                : {}),
            }),
          )}
        </div>
      ),
  },
  {
    name: "transition",
    mode: "compare",
    render: (S, st) => (
      <div style={{ width: 300 }}>
        {S({ c: "anim", props: { open: st.open === true } })}
      </div>
    ),
  },
  {
    name: "selection",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 400 }}>
        {S({ c: "text", props: { text: "Select this sentence and copy it." } })}
      </div>
    ),
  },

  /* ---------------- behavioural (remote only) ---------------- */
  {
    // Network policy (SPEC §12): CSP from the serving layer, or from the host.
    name: "network",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 500 }}>
        {/* Serving layer default ("public"): https/wss only, so loopback http is blocked. */}
        {S({
          c: "text",
          id: "public",
          src: "http://127.0.0.1:5181/__html/fixtures/net.html",
        })}
        {/* Host-rendered HTML with an allowlist that includes the remote server. */}
        {S({
          c: "text",
          id: "list",
          host: { html: netPage, network: ["http://127.0.0.1:5181"] },
        })}
        {/* Host-rendered HTML with no network. */}
        {S({ c: "text", id: "none", host: { html: netPage, network: "none" } })}
        {/* URL remote locked down by the host: <iframe csp> (enforced by Chromium). */}
        {S({
          c: "text",
          id: "url-none",
          src: "http://127.0.0.1:5181/__html/fixtures/net.html",
          host: { network: "none" },
        })}
      </div>
    ),
  },
  {
    // The html prop: a document from the host, no server.
    name: "html-prop",
    mode: "remote",
    render: (S, st) => (
      <div style={{ width: 360 }}>
        {S({
          c: "text",
          host: {
            html: widgetPage,
            ...(new URLSearchParams(location.search).get("scf") === "1"
              ? { isolation: "scf" }
              : {}),
          },
          props: {
            name: (st.name as string | undefined) ?? "Ada",
            onPick: (c: string) =>
              window.__events.push({ type: "pick", id: "main", message: c }),
          },
        })}
      </div>
    ),
  },
  {
    name: "overlay-popover-edge",
    mode: "remote",
    render: (S) => (
      <div style={{ position: "fixed", right: 10, bottom: 10, width: 220 }}>
        {S({ c: "menu-trigger", props: { align: "right" } })}
      </div>
    ),
  },
  {
    name: "overlay-popover-options",
    mode: "remote",
    render: (S, st) => (
      <div style={{ paddingTop: 300, width: 220 }}>
        {S({
          c: "menu-trigger",
          props: {
            side: st.side ?? "bottom",
            offset: st.offset ?? 4,
            label: st.label ?? "Fruit",
          },
        })}
      </div>
    ),
  },
  {
    name: "overlay-popover-tall",
    mode: "remote",
    render: (S) => (
      <div style={{ position: "fixed", left: 40, top: 300, width: 220 }}>
        {S({
          c: "menu-trigger",
          props: {
            items: Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`),
          },
        })}
      </div>
    ),
  },
  {
    name: "overlay-popover-scroll",
    mode: "remote",
    render: (S) => (
      <div style={{ height: 2000, paddingTop: 100 }}>
        <div style={{ width: 220 }}>{S({ c: "menu-trigger" })}</div>
      </div>
    ),
  },
  {
    name: "overlay-dialog",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <div style={{ width: 300 }}>{S({ c: "dialog-trigger" })}</div>
        <button id="after">after</button>
      </div>
    ),
  },
  {
    name: "focus-visible",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <div style={{ width: 300 }}>{S({ c: "buttons" })}</div>
        <button id="after">after</button>
      </div>
    ),
  },
  {
    name: "focus-radios",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <div style={{ width: 300 }}>{S({ c: "radios" })}</div>
        <button id="after">after</button>
      </div>
    ),
  },
  {
    name: "focus-shadow",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <ShadowBox>
          <button id="in-shadow">in shadow</button>
          <div style={{ width: 300 }}>{S({ c: "focus" })}</div>
        </ShadowBox>
        <button id="after">after</button>
      </div>
    ),
  },
  {
    name: "focus-order",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <div style={{ width: 300 }}>{S({ c: "focus" })}</div>
        <button id="after">after</button>
      </div>
    ),
  },
  {
    name: "theme-hover",
    mode: "remote",
    render: (S) => (
      <div>
        <style>
          {
            ".hov, .fw { color: rgb(10, 10, 10); width: 300px; padding: 8px } .hov:hover { color: rgb(200, 0, 0) } .fw:focus-within { color: rgb(0, 0, 200) }"
          }
        </style>
        <div className="hov">
          <span id="hov-label">hover me</span>
          {S({ c: "text", id: "h" })}
        </div>
        <div className="fw">
          <input id="fw-input" />
          {S({ c: "text", id: "f" })}
        </div>
        <button id="away">away</button>
      </div>
    ),
  },
  {
    // A host scroller that shows only the top of the remote's buttons.
    name: "reveal-click",
    mode: "remote",
    render: (S) => (
      <div>
        <button id="before">before</button>
        <div id="scroller" style={{ width: 300, height: 16, overflow: "auto" }}>
          {S({ c: "buttons" })}
        </div>
      </div>
    ),
  },
  {
    name: "focus-programmatic",
    mode: "remote",
    render: (S) => <FocusButtons S={S} />,
  },
  {
    name: "loading",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({
          c: "slow",
          host: {
            fallback: (
              <div id="fallback" style={{ height: 40, background: "#e5e7eb" }}>
                Loading…
              </div>
            ),
          },
        })}
      </div>
    ),
  },
  {
    name: "error-render",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({
          c: "throws",
          host: {
            errorFallback: (e: Error & { code: string }) => (
              <div id="error">{`${e.code}: ${e.message}`}</div>
            ),
          },
        })}
      </div>
    ),
  },
  {
    name: "error-load",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({
          c: "text",
          src: "http://127.0.0.1:5181/does-not-exist/",
          host: {
            errorFallback: (e: Error & { code: string }) => (
              <div id="error">{e.code}</div>
            ),
          },
        })}
      </div>
    ),
  },
  {
    name: "error-timeout",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({
          c: "slow",
          query: "?delay=3000",
          host: {
            timeout: 400,
            fallback: <div id="fallback">Loading…</div>,
            errorFallback: (e: Error & { code: string }, retry: () => void) => (
              <button id="error" onClick={retry}>
                {e.code}
              </button>
            ),
          },
        })}
      </div>
    ),
  },
  {
    name: "props-rpc",
    mode: "remote",
    render: (S, st) =>
      S({
        c: "rpc",
        props: {
          count: (st.count as number | undefined) ?? 0,
          when: new Date(Date.UTC(2024, 0, 2, 3, 4, 5)),
          tags: new Map([
            ["a", 1],
            ["b", 2],
          ]),
          nested: { deep: { fn: async (x: number) => x * 2 } },
          onCompute: async (a: number, b: number) => {
            await new Promise((r) => setTimeout(r, 20));
            return a + b + ((st.bonus as number | undefined) ?? 0);
          },
          onFail: async () => {
            const e = new Error("nope");
            e.name = "ValidationError";
            throw e;
          },
          missing: undefined,
        },
      }),
  },
  {
    name: "reload",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 300 }}>
        {S({
          c: "dynamic",
          host: {
            ref: (h: { reload(): void } | null) =>
              ((window as unknown as { __handle: unknown }).__handle = h),
          },
        })}
      </div>
    ),
  },
  {
    name: "many-instances",
    mode: "remote",
    render: (S) => (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: 600 }}>
        {Array.from({ length: 40 }, (_, i) =>
          S({ c: "text", id: `i${i}`, props: { text: `#${i}` } }),
        )}
      </div>
    ),
  },
  {
    // Performance (tests/perf.spec.ts, RC_PERF=1): `n` slots, each 12
    // wrappers deep, next to 1,000 unrelated elements, and a clock that
    // changes a text node every 50ms while `tick` is set.
    name: "perf",
    mode: "remote",
    render: (S, st) => (
      <PerfPage
        S={S}
        n={(st.n as number | undefined) ?? 0}
        tick={st.tick === true}
      />
    ),
  },
  {
    name: "lazy",
    mode: "remote",
    render: (S) => (
      <div>
        <div style={{ height: 3000 }}>spacer</div>
        {S({ c: "text", host: { loading: "lazy" } })}
      </div>
    ),
  },
  {
    name: "security",
    mode: "remote",
    render: (S) => (
      <div style={{ width: 600 }}>
        {S({ c: "security", id: "own" })}
        {S({ c: "security", id: "opaque", host: { sandbox: "allow-scripts" } })}
        {S({
          c: "text",
          id: "same-origin",
          src: "http://localhost:5180/text/",
          host: {
            errorFallback: (e: Error & { code: string }) => (
              <div id="same-origin-error">{e.code}</div>
            ),
          },
        })}
      </div>
    ),
  },
  {
    name: "theme-change",
    mode: "remote",
    render: (S, st) => (
      <div
        style={{
          width: 300,
          colorScheme: st.dark === true ? "dark" : "light",
          color: st.dark === true ? "white" : "black",
          ...({
            "--accent": st.dark === true ? "black" : "white",
          } as CSSProperties),
        }}
      >
        {S({ c: "themed" })}
      </div>
    ),
  },
];

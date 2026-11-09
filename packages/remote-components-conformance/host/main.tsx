/// <reference types="vite/client" />
import {
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  RemoteComponent,
  RemoteHostProvider,
  type RemoteComponentError,
} from "@assistant-ui/remote-components-host-react";
import {
  cases,
  type CaseState,
  type ComponentName,
  type Subject,
} from "./cases.js";

const REMOTE = "http://127.0.0.1:5181/";

// Inline variants: the very same component modules.
const modules = import.meta.glob<{
  default: ComponentType<Record<string, unknown>>;
}>(["../components/*.tsx", "!../components/slow.tsx"], { eager: true });
const inline = (c: ComponentName): ComponentType<Record<string, unknown>> => {
  const m = modules[`../components/${c}.tsx`];
  if (m === undefined) throw new Error(`No inline component ${c}`);
  return m.default;
};

/* ---- tiny case-state store driven by tests via window.__case ---- */
let state: CaseState = {};
const listeners = new Set<() => void>();
declare global {
  interface Window {
    __case: { set(patch: CaseState): void; get(): CaseState };
    __events: {
      type: string;
      id: string;
      code?: string;
      message?: string;
      fatal?: boolean;
    }[];
  }
}
window.__events = [];
window.__case = {
  set(patch) {
    state = { ...state, ...patch };
    for (const l of listeners) l();
  },
  get: () => state,
};
const useCaseState = (): CaseState =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

const params = new URLSearchParams(location.search);
const caseName = params.get("case");
/** RC_VARIANT=static: every remote is its component rendered to static HTML, through the serving layer. */
const variant = params.get("variant") ?? "react";
const theCase = cases.find((c) => c.name === caseName);

function Column({ kind }: { kind: "inline" | "remote" }): ReactNode {
  const st = useCaseState();
  const S: Subject = (o) => {
    const id = o.id ?? "main";
    const cls = `subject subject-${id}${o.className ? ` ${o.className}` : ""}`;
    if (kind === "inline") {
      const C = inline(o.c);
      // Reference model: a block (the slot) containing a flow-root (the remote root).
      return (
        <div
          key={id}
          className={cls}
          style={{ position: "relative", ...o.style }}
        >
          <div style={{ display: "flow-root", height: "100%" }}>
            <C {...o.props} />
          </div>
        </div>
      );
    }
    const src =
      o.src ??
      (variant === "static"
        ? `${REMOTE}__page/static/${o.c}/?p=${encodeURIComponent(JSON.stringify(o.props ?? {}))}`
        : `${REMOTE}${o.c}/${o.query ?? ""}`);
    return (
      <RemoteComponent
        key={id}
        src={src}
        className={cls}
        {...(o.style ? { style: o.style } : {})}
        onError={(e: RemoteComponentError, info: { fatal: boolean }) =>
          window.__events.push({
            type: "error",
            id,
            code: e.code,
            message: e.message,
            fatal: info.fatal,
          })
        }
        onReady={() => window.__events.push({ type: "ready", id })}
        {...o.host}
        {...o.props}
      />
    );
  };
  return theCase!.render(S, st);
}

function App(): ReactNode {
  if (theCase === undefined) {
    return (
      <ul style={{ padding: 40 }}>
        {cases.map((c) => (
          <li key={c.name}>
            <a href={`?case=${c.name}`}>{c.name}</a> ({c.mode})
          </li>
        ))}
      </ul>
    );
  }
  return (
    <RemoteHostProvider scf={{ shimDomain: "rc.localhost" }}>
      {theCase.mode === "compare" ? (
        <>
          <div className="col-label" style={{ left: 20 }}>
            inline
          </div>
          <div className="col-label" style={{ left: 660 }}>
            remote
          </div>
          <div id="inline" className="col col-inline">
            <Column kind="inline" />
          </div>
          <div id="remote" className="col col-remote">
            <Column kind="remote" />
          </div>
        </>
      ) : (
        <div id="remote" style={{ padding: 20 }}>
          <Column kind="remote" />
        </div>
      )}
    </RemoteHostProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

import type { ProbeId, ProbeResult } from "../../src/readiness/probes";
import {
  isTestbedMessage,
  NARROW_WIDTH,
  TESTBED_CHANNEL,
  type GalleryShown,
  type GallerySectionInfo,
  type GalleryView,
  type HostToWebviewMessage,
  type TaskResult,
  type WebviewBootConfig,
  type WebviewToHostMessage,
} from "../../src/protocol";
import { getVSCodeApi } from "../vscode-api";
import { ALL_SECTIONS, issueMark, issuesSince, type Issue } from "./recorder";
import { sectionConflicts, SECTIONS } from "./registry";
import { galleryView } from "./view";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/** Settle time after the last frame, for effects that load asynchronously. */
const SETTLE_MS = 120;
const IMAGE_TIMEOUT_MS = 2_000;

const imagesLoaded = (root: ParentNode) =>
  Promise.race([
    Promise.all(
      [...root.querySelectorAll("img")].map((img) =>
        img.complete ? undefined : img.decode().catch(() => undefined),
      ),
    ),
    sleep(IMAGE_TIMEOUT_MS),
  ]);

/** Shows `view` and waits until it has rendered, loaded and settled. */
const show = async (view: GalleryView) => {
  await galleryView.set(view);
  await nextFrame();
  await nextFrame();
  await document.fonts.ready;
  await imagesLoaded(document);
  await sleep(SETTLE_MS);
  await nextFrame();
};

const cardOf = (id: string) =>
  document.querySelector<HTMLElement>(
    `[data-gallery-section="${CSS.escape(id)}"]`,
  );

const describeElement = (el: Element) => {
  const slot = el.getAttribute("data-slot");
  const classes = [...el.classList]
    .filter((c) => !c.includes(":") && !c.includes("["))
    .slice(0, 3);
  return `${el.localName}${slot ? `[data-slot=${slot}]` : ""}${classes.map((c) => `.${c}`).join("")}`;
};

/** An ancestor below `container` that clips or scrolls horizontally. */
const clippedWithin = (el: Element, container: Element) => {
  for (
    let node = el.parentElement;
    node && node !== container;
    node = node.parentElement
  ) {
    if (getComputedStyle(node).overflowX !== "visible") return true;
  }
  return false;
};

/**
 * Why the section's body is wider than its card, or `null`: the outermost
 * elements that stick out past its right edge and are not inside a scroll or
 * clip container.
 */
const measureOverflow = (id: string) => {
  const body = cardOf(id)?.querySelector<HTMLElement>("[data-gallery-body]");
  if (!body) return "not rendered";
  const excess = body.scrollWidth - body.clientWidth;
  if (excess <= 1) return null;
  const right = body.getBoundingClientRect().right;
  const offenders = [...body.querySelectorAll("*")].filter((el) => {
    if (el.getBoundingClientRect().right <= right + 1) return false;
    if (getComputedStyle(el).position === "fixed") return false;
    return !clippedWithin(el, body);
  });
  const outermost = offenders.filter(
    (el) => !offenders.some((other) => other !== el && other.contains(el)),
  );
  return `+${excess}px: ${outermost.slice(0, 2).map(describeElement).join(", ") || "?"}`;
};

type SectionReport = { id: string; issues: Issue[]; overflow: string | null };

type Sweep = {
  sections: SectionReport[];
  /** Issues while every section was mounted at once. */
  all: Issue[];
  pageOverflow: number;
};

/**
 * Shows every section alone at the narrow width, then all of them together,
 * and records the issues and the overflow of each.
 */
const runSweep = async (): Promise<Sweep> => {
  const sections: SectionReport[] = [];
  for (const { id } of SECTIONS) {
    const mark = issueMark();
    await show({ section: id, width: NARROW_WIDTH, noMotion: true });
    sections.push({
      id,
      issues: issuesSince(mark).filter((i) => i.section === id),
      overflow: measureOverflow(id),
    });
  }
  const mark = issueMark();
  await show({ section: null, width: NARROW_WIDTH, noMotion: true });
  const pageOverflow =
    document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const all = issuesSince(mark).filter((i) => i.section === ALL_SECTIONS);
  await show({ section: null, width: null });
  return { sections, all, pageOverflow };
};

// The three gallery probes share one sweep per page load; a switchboard
// change or a rebuild reloads the page.
let sweep: Promise<Sweep> | undefined;
const getSweep = () => (sweep ??= runSweep());

const summarize = (
  label: string,
  offenders: { id: string; detail: string }[],
): ProbeResult => {
  if (offenders.length === 0) {
    return { state: "pass", detail: `${SECTIONS.length} sections, 0 ${label}` };
  }
  return {
    state: "fail",
    detail: `${offenders.length}/${SECTIONS.length} sections: ${offenders
      .map(({ id, detail }) => `${id} (${detail})`)
      .join("; ")}`,
  };
};

const issueOffenders = (sweepResult: Sweep, kinds: Issue["kind"][]) => {
  const reports = [
    ...sweepResult.sections,
    { id: ALL_SECTIONS, issues: sweepResult.all },
  ];
  return reports.flatMap(({ id, issues }) => {
    const matching = issues.filter((i) => kinds.includes(i.kind));
    if (matching.length === 0) return [];
    const kindsSeen = [
      ...new Set(matching.map((i) => `${i.kind}: ${i.message}`)),
    ];
    return [{ id, detail: kindsSeen.slice(0, 2).join(" | ") }];
  });
};

const withConflicts = (result: ProbeResult): ProbeResult => {
  const conflicts = sectionConflicts();
  if (conflicts.length === 0) return result;
  return { state: "fail", detail: `${conflicts.join("; ")}; ${result.detail}` };
};

export const GALLERY_PROBES: Partial<
  Record<ProbeId, (boot: WebviewBootConfig) => Promise<ProbeResult>>
> = {
  "gallery-csp": async (boot) => {
    if (boot.switchboard.csp !== "strict") {
      return { state: "fail", detail: "Requires auiTest.csp=strict" };
    }
    const result = await getSweep();
    return withConflicts(
      summarize("violations", issueOffenders(result, ["csp"])),
    );
  },
  "gallery-errors": async () => {
    const result = await getSweep();
    return withConflicts(
      summarize(
        "errors",
        issueOffenders(result, ["error", "console", "boundary"]),
      ),
    );
  },
  "gallery-overflow": async () => {
    const result = await getSweep();
    const offenders = result.sections.flatMap(({ id, overflow }) =>
      overflow ? [{ id, detail: overflow }] : [],
    );
    if (result.pageOverflow > 1) {
      offenders.push({
        id: "page",
        detail: `document +${result.pageOverflow}px`,
      });
    }
    return withConflicts(
      summarize(`overflowing at ${NARROW_WIDTH}px`, offenders),
    );
  },
};

const GALLERY_TASKS = {
  "gallery-sections": async (): Promise<GallerySectionInfo[]> =>
    SECTIONS.map(({ id, title, category }) => ({ id, title, category })),

  "gallery-show": async (arg: unknown): Promise<GalleryShown> => {
    const view = arg as GalleryView;
    await show(view);
    const target =
      view.section === null
        ? document.querySelector("[data-gallery-root]")
        : cardOf(view.section);
    const rect = target?.getBoundingClientRect();
    return {
      rect: rect
        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  },
} as const;

const post = (message: WebviewToHostMessage) =>
  getVSCodeApi().postMessage(message);

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const startGalleryListener = (boot: WebviewBootConfig) => {
  window.addEventListener("message", async (event: MessageEvent<unknown>) => {
    if (!isTestbedMessage(event.data)) return;
    const message = event.data as HostToWebviewMessage;
    if (message.type === "run-task") {
      const task = GALLERY_TASKS[message.task as keyof typeof GALLERY_TASKS];
      let result: TaskResult;
      try {
        if (!task) throw new Error(`The gallery has no task ${message.task}`);
        result = { ok: true, value: await task(message.arg) };
      } catch (error) {
        result = { ok: false, error: errorMessage(error) };
      }
      post({
        channel: TESTBED_CHANNEL,
        type: "task-result",
        requestId: message.requestId,
        result,
      });
      return;
    }
    const probe = GALLERY_PROBES[message.probeId];
    let result: ProbeResult;
    try {
      result = probe
        ? await probe(boot)
        : {
            state: "fail",
            detail: `The gallery has no probe ${message.probeId}`,
          };
    } catch (error) {
      result = { state: "fail", detail: errorMessage(error) };
    }
    post({
      channel: TESTBED_CHANNEL,
      type: "probe-result",
      requestId: message.requestId,
      result,
    });
  });
  post({
    channel: TESTBED_CHANNEL,
    type: "ready",
    implementedProbes: Object.keys(GALLERY_PROBES) as ProbeId[],
  });
};

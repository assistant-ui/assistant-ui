import { cleanup, render } from "@testing-library/react";
import { TerminalIcon } from "lucide-react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { AgentPlan } from "../elements/agent-plan";
import { AgentStatus, type AgentState } from "../elements/agent-status";
import { Chart } from "../elements/chart";
import { CodeDiff } from "../elements/code-diff";
import { CodeRunner } from "../elements/code-runner";
import { CommandPalette } from "../elements/command-palette";
import { ComputerUse } from "../elements/computer-use";
import { ContextBreakdown } from "../elements/context-breakdown";
import { CostMeter } from "../elements/cost-meter";
import { DocumentReference } from "../elements/document-reference";
import { FeedbackDialog } from "../elements/feedback-dialog";
import { FileTree } from "../elements/file-tree";
import { FlowGraph } from "../elements/flow-graph";
import { JobProgress } from "../elements/job-progress";
import { GenerationLoader } from "../elements/loading-state";
import { MapAnswer } from "../elements/map-answer";
import { MathBlock } from "../elements/math-block";
import { McpServerPanel } from "../elements/mcp-server-panel";
import { MessagePair } from "../elements/message-pair";
import { Onboarding } from "../elements/onboarding";
import { PromptLibrary } from "../elements/prompt-library";
import { QuotaBanner } from "../elements/quota-banner";
import { ReadAloud } from "../elements/read-aloud";
import { ReasoningEffort } from "../elements/reasoning-effort";
import { ReasoningPanel } from "../elements/reasoning-panel";
import { RetrievalChunks } from "../elements/retrieval-chunks";
import { ReviewableDiff } from "../elements/reviewable-diff";
import { ScoreBreakdown } from "../elements/score-breakdown";
import { SettingsPanel } from "../elements/settings-panel";
import { SpecSheet } from "../elements/spec-sheet";
import { StreamingText } from "../elements/streaming-text";
import { SubagentList } from "../elements/subagent-list";
import { TerminalBlock } from "../elements/terminal-block";
import { ThreadList } from "../elements/thread-list";
import { Timeline } from "../elements/timeline";
import { ThinkingIndicator } from "../elements/thinking-indicator";
import { ToolCall } from "../elements/tool-call";
import { ToolTimeline } from "../elements/tool-timeline";
import { TraceWaterfall } from "../elements/trace-waterfall";
import { VoiceConversation } from "../elements/voice-conversation";
import { WebSearch } from "../elements/web-search";

/**
 * A caller drives these from its own state, so every numeric prop is rendered
 * at values a caller can actually reach. `n` stands in for whatever the element
 * treats as a position or a count, and `items` for how many rows it was given.
 */
type Case = (n: number, items: number) => ReactElement;

const list = <T,>(items: number, make: (i: number) => T) =>
  Array.from({ length: items }, (_, i) => make(i));

const CASES: Record<string, Case> = {
  "agent-plan": (n, items) => (
    <AgentPlan steps={list(items, (i) => `step ${i}`)} activeIndex={n} />
  ),
  "agent-status": () => (
    <AgentStatus state="working" label={"l".repeat(200)} elapsed="0:12" />
  ),
  chart: (n, items) => (
    <Chart
      label="Latency"
      value="180ms"
      points={list(items, (i) => i * 3)}
      visibleCount={n}
    />
  ),
  "code-diff": (n, items) => (
    <CodeDiff
      filename="a.ts"
      additions={2}
      deletions={1}
      lines={list(items, () => ({
        kind: "added" as const,
        text: "x".repeat(400),
      }))}
      cycle={n}
    />
  ),
  "code-runner": (_n, items) => (
    <CodeRunner
      language="ts"
      code={"y".repeat(400)}
      state="ok"
      output={list(items, () => "z".repeat(400))}
    />
  ),
  "command-palette": (_n, items) => (
    <CommandPalette
      commands={list(items, (i) => ({
        id: `c${i}`,
        label: `Command ${i}`,
        group: "Thread",
        keys: ["⌘K"],
      }))}
      query={"q".repeat(200)}
      activeId="c0"
    />
  ),
  "computer-use": (n, items) => (
    <ComputerUse
      url="example.com"
      steps={list(items, (i) => ({
        id: `s${i}`,
        action: "click",
        target: "Button",
        x: 10,
        y: 10,
      }))}
      activeIndex={n}
    >
      <div />
    </ComputerUse>
  ),
  "context-breakdown": (n, items) => (
    <ContextBreakdown
      segments={list(items, (i) => ({
        label: `seg ${i}`,
        tokens: 4000,
        tint: "bg-blue-500",
      }))}
      limit={n}
    />
  ),
  "cost-meter": (n, items) => (
    <CostMeter
      runCost="$0.10"
      sessionCost="$1.00"
      lines={list(items, (i) => ({
        model: `m${i}`,
        inputTokens: 10,
        outputTokens: 10,
        cost: "$0.01",
        share: n,
      }))}
    />
  ),
  "document-reference": (n, items) => (
    <DocumentReference
      title="Spec"
      pages={items}
      anchors={list(items, (i) => ({ page: i, quote: "q".repeat(300) }))}
      activePage={n}
    />
  ),
  "feedback-dialog": (_n, items) => (
    <FeedbackDialog
      reasons={list(items, (i) => `reason ${i}`)}
      selected={[]}
      note=""
      sent={false}
    />
  ),
  "file-tree": (n, items) => (
    <FileTree
      nodes={list(items, (i) => ({
        path: `p${i}`,
        name: `n${i}`,
        depth: 0,
        kind: "file" as const,
      }))}
      visibleCount={n}
      totalAdditions={2}
      totalDeletions={1}
    />
  ),
  "flow-graph": (n, items) => (
    <FlowGraph
      nodes={list(items, (i) => ({
        id: `n${i}`,
        label: `Node ${i}`,
        column: i,
        row: 0,
        state: "done" as const,
      }))}
      edges={[]}
      visibleCount={n}
    />
  ),
  "job-progress": (n, items) => (
    <JobProgress
      title="Indexing"
      stages={list(items, (i) => ({ name: `stage ${i}`, weight: 1 }))}
      stageIndex={n}
      stageProgress={n}
      eta="2m"
    />
  ),
  "map-answer": (_n, items) => (
    <MapAnswer
      pins={list(items, (i) => ({
        id: `p${i}`,
        label: `Place ${i}`,
        detail: "1km",
        x: 20,
        y: 20,
      }))}
      activeId="p0"
    />
  ),
  "math-block": (n, items) => (
    <MathBlock
      steps={list(items, (i) => ({ expression: `${i}` }))}
      visibleSteps={n}
    />
  ),
  "mcp-server-panel": (_n, items) => (
    <McpServerPanel
      servers={list(items, (i) => ({
        id: `s${i}`,
        name: `Server ${i}`,
        transport: "stdio",
        status: "connected" as const,
        tools: ["read"],
      }))}
    />
  ),
  "message-pair": (n, items) => (
    <MessagePair
      userMessage="hi"
      words={list(items, (i) => `w${i}`)}
      visibleWords={n}
      streaming
    />
  ),
  onboarding: (n, items) => (
    <Onboarding
      steps={list(items, (i) => ({
        title: `t${i}`,
        body: "b".repeat(300),
        example: "e",
      }))}
      index={n}
    />
  ),
  "prompt-library": (_n, items) => (
    <PromptLibrary
      prompts={list(items, (i) => ({
        id: `p${i}`,
        name: `Prompt ${i}`,
        body: "b".repeat(300),
        variables: ["x"],
      }))}
      query={"q".repeat(200)}
      selectedId="p0"
    />
  ),
  "quota-banner": (n) => (
    <QuotaBanner
      used={n}
      limit={100}
      unit="runs"
      resetsIn="2h"
      upgradeLabel="Upgrade"
    />
  ),
  "read-aloud": (n, items) => (
    <ReadAloud
      words={list(items, (i) => `w${i}`)}
      spokenIndex={n}
      playing
      rate={1}
      elapsed="0:01"
      duration="0:10"
    />
  ),
  "reasoning-effort": (n, items) => (
    <ReasoningEffort
      levels={list(items, (i) => ({
        key: `k${i}`,
        label: `L${i}`,
        budget: 1000,
      }))}
      selectedKey="k0"
      spent={n}
    />
  ),
  "reasoning-panel": (n, items) => (
    <ReasoningPanel
      steps={list(items, (i) => ({ title: `t${i}`, body: "b".repeat(300) }))}
      visibleSteps={n}
      streaming
      open
      onOpenChange={() => {}}
      restingLabel="Thought"
    />
  ),
  "retrieval-chunks": (n, items) => (
    <RetrievalChunks
      query="q"
      chunks={list(items, (i) => ({
        id: `c${i}`,
        source: `s${i}`,
        locator: "p1",
        score: 0.5,
        text: "t",
      }))}
      visibleCount={n}
      searching={false}
    />
  ),
  "reviewable-diff": (_n, items) => (
    <ReviewableDiff
      filename="a.ts"
      hunks={list(items, (i) => ({
        id: `h${i}`,
        range: "@@ -1 +1 @@",
        decision: "pending" as const,
        lines: [{ kind: "added" as const, text: "x".repeat(400) }],
      }))}
    />
  ),
  "score-breakdown": (n, items) => (
    <ScoreBreakdown
      verdict="Good"
      total={7}
      outOf={10}
      criteria={list(items, (i) => ({
        label: `c${i}`,
        score: 7,
        weight: 1,
        note: "n".repeat(300),
      }))}
      visibleCount={n}
    />
  ),
  "settings-panel": (n) => (
    <SettingsPanel
      model="a"
      models={["a", "b"]}
      systemPrompt=""
      temperature={n}
      toggles={[{ key: "k", label: "L", detail: "d", on: true }]}
    />
  ),
  "spec-sheet": (n, items) => (
    <SpecSheet
      title="Spec"
      rows={list(items, (i) => ({ label: `l${i}`, value: `v${i}` }))}
      visibleCount={n}
    />
  ),
  "streaming-text": (n, items) => (
    <StreamingText
      segments={list(items, (i) => ({ text: `w${i}` }))}
      count={n}
      streaming
    />
  ),
  "subagent-list": (n, items) => (
    <SubagentList
      agents={list(items, (i) => ({ name: `a${i}`, model: "m" }))}
      completedCount={n}
      progress={list(items, () => n)}
      showSummary={false}
      summaryAgent={{ name: "a", model: "m" }}
    />
  ),
  "terminal-block": (n, items) => (
    <TerminalBlock
      command="ls"
      lines={list(items, (i) => `line ${i}`)}
      visibleCount={n}
      done
    />
  ),
  "thread-list": (n, items) => (
    <ThreadList
      threads={list(items, (i) => ({
        title: `t${i}`,
        time: "1m",
        unread: true,
      }))}
      activeIndex={n}
    />
  ),
  timeline: (n, items) => (
    <Timeline
      events={list(items, (i) => ({
        id: `e${i}`,
        when: "past" as const,
        time: "1m",
        title: "t".repeat(300),
      }))}
      visibleCount={n}
    />
  ),
  "tool-timeline": (n, items) => (
    <ToolTimeline
      steps={list(items, (i) => ({
        verb: `v${i}`,
        chip: `c${i}`,
        icon: TerminalIcon,
      }))}
      visibleSteps={n}
      streaming
      open
      onOpenChange={() => {}}
      restingLabel="Ran"
      activeLabel="Running"
      stats={[]}
    />
  ),
  "trace-waterfall": (n, items) => (
    <TraceWaterfall
      spans={list(items, (i) => ({
        id: `s${i}`,
        name: `n${i}`,
        depth: 0,
        startMs: 10,
        durationMs: 20,
        status: "completed" as const,
      }))}
      totalMs={100}
      visibleCount={n}
    />
  ),
  "voice-conversation": (n, items) => (
    <VoiceConversation
      mode="listening"
      amplitude={n}
      transcript={list(items, (i) => ({
        id: `t${i}`,
        role: "user" as const,
        text: "x".repeat(300),
      }))}
    />
  ),
  "web-search": (n, items) => (
    <WebSearch
      query="q"
      results={list(items, (i) => ({ title: `t${i}`, domain: `d${i}.com` }))}
      visibleResults={n}
      searching={false}
      cycle={n}
    />
  ),
};

/**
 * Elements whose hostile number is how far through a collection they are, and
 * nothing they print. For these an out-of-range number still names a position:
 * below the start is the start, past the end is the end. `Array#slice` gives
 * neither, so this is what separates a routed count from a raw one.
 *
 * A prop that identifies a selection rather than a position is excluded on
 * purpose. `thread-list`'s activeIndex, `document-reference`'s activePage, and
 * `read-aloud`'s spokenIndex all mean "nothing is selected yet" out of range,
 * and clamping them would silently select the first row instead.
 *
 * `code-diff` is absent for a different reason: its only numeric prop that it
 * does not print is `cycle`, which feeds a React key, so its markup is byte
 * identical at every value and the assertion would hold without exercising
 * anything.
 */
const COUNT_SHAPED = new Set([
  "agent-plan",
  "chart",
  "computer-use",
  "cost-meter",
  "file-tree",
  "flow-graph",
  "job-progress",
  "math-block",
  "message-pair",
  "onboarding",
  "reasoning-panel",
  "retrieval-chunks",
  "score-breakdown",
  "settings-panel",
  "spec-sheet",
  "streaming-text",
  "terminal-block",
  "timeline",
  "tool-timeline",
  "trace-waterfall",
  "voice-conversation",
  "web-search",
]);

const HOSTILE: [label: string, n: number, items: number][] = [
  ["negative", -3, 4],
  ["zero", 0, 4],
  ["oversized", 1e9, 4],
  ["fractional", 1.5, 4],
  ["NaN", Number.NaN, 4],
  ["empty collection", 2, 0],
];

/**
 * Every percentage an element writes into an inline style, read out of the
 * server-rendered markup rather than the DOM: jsdom validates the CSSOM the way
 * a browser does, so it silently drops `width: -75%` and the assertion below
 * would never see the value that caused the bug.
 */
const inlinePercentages = (markup: string) =>
  [...markup.matchAll(/style="([^"]*)"/g)].flatMap(([, declarations]) =>
    (declarations ?? "")
      .split(";")
      .map((declaration) => declaration.split(":"))
      .filter(([, value]) => value?.trim().endsWith("%"))
      .map(([property, value]) => ({
        property: (property ?? "").trim(),
        value: (value ?? "").trim(),
      })),
  );

/**
 * The name a screen reader would announce for a control. Text inside an
 * `aria-hidden` subtree does not contribute to it, so reading `textContent`
 * would report a name for a control that announces nothing, which is the same
 * false confidence this sweep exists to remove.
 */
const visibleText = (element: Element): string =>
  [...element.childNodes]
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (!(node instanceof Element)) return "";
      if (node.getAttribute("aria-hidden") === "true") return "";
      return visibleText(node);
    })
    .join("")
    .trim();

const accessibleName = (element: HTMLElement) => {
  const labelled = element.getAttribute("aria-labelledby");
  if (labelled) {
    return labelled
      .split(/\s+/)
      .map((id) => {
        const target = document.getElementById(id);
        return target ? visibleText(target) : "";
      })
      .join(" ")
      .trim();
  }
  return (
    element.getAttribute("aria-label")?.trim() ||
    visibleText(element) ||
    element.getAttribute("title")?.trim() ||
    ""
  );
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

describe.each(Object.entries(CASES))("%s", (name, make) => {
  it.each(HOSTILE)("survives a %s numeric prop", (_label, n, items) => {
    const markup = renderToStaticMarkup(make(n, items));

    for (const { property, value } of inlinePercentages(markup)) {
      const share = Number.parseFloat(value);
      expect(
        share,
        `${name} rendered ${property}: ${value}, which a browser drops as invalid`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        share,
        `${name} rendered ${property}: ${value}, past the end of its track`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it.runIf(COUNT_SHAPED.has(name))(
    "reads an out-of-range count as its nearest end",
    () => {
      const items = 4;

      expect(
        renderToStaticMarkup(make(-3, items)),
        "a negative count dropped rows from the end instead of showing none",
      ).toBe(renderToStaticMarkup(make(0, items)));
      expect(
        renderToStaticMarkup(make(1e9, items)),
        "a count past the end did not show every row",
      ).toBe(renderToStaticMarkup(make(items, items)));
      expect(
        renderToStaticMarkup(make(Number.NaN, items)),
        "NaN did not read as the start",
      ).toBe(renderToStaticMarkup(make(0, items)));
    },
  );

  it("gives every control an accessible name", () => {
    const { container } = render(make(2, 3));
    const controls = container.querySelectorAll<HTMLElement>(
      'button, [role="button"], [role="option"], a[href], input, textarea',
    );

    for (const control of controls) {
      expect(
        accessibleName(control),
        `${name} has a control with no accessible name: ${control.outerHTML.slice(0, 120)}`,
      ).not.toBe("");
    }
  });
});

describe("shimmer labels", () => {
  const cases: Record<string, ReactElement> = {
    "tool-timeline": CASES["tool-timeline"]!(2, 3),
    "reasoning-panel": CASES["reasoning-panel"]!(2, 3),
    "retrieval-chunks": (
      <RetrievalChunks query="q" chunks={[]} visibleCount={0} searching />
    ),
    "web-search": (
      <WebSearch
        query="q"
        results={[]}
        visibleResults={0}
        searching
        cycle={0}
      />
    ),
    "tool-call": (
      <ToolCall
        label="Completed"
        activeLabel="Running"
        query="q"
        request="request"
        result="result"
        running
        open={false}
        onOpenChange={() => {}}
      />
    ),
    "generation-loader": <GenerationLoader label="Loading" tick={0} />,
    "thinking-indicator": <ThinkingIndicator label="Thinking" />,
  };

  it.each(Object.entries(cases))(
    "%s keeps shimmer text outside aria-hidden subtrees",
    (_name, element) => {
      const { container } = render(element);
      const shimmerLabels = container.querySelectorAll(".shimmer");

      expect(shimmerLabels.length).toBeGreaterThan(0);
      for (const shimmerLabel of shimmerLabels) {
        expect(shimmerLabel.closest('[aria-hidden="true"]')).toBeNull();
      }
    },
  );

  it("keeps the inactive SwapLabel layer out of copied selection", () => {
    const { container } = render(
      <ToolTimeline
        steps={[{ verb: "Read", chip: "file.ts", icon: TerminalIcon }]}
        visibleSteps={1}
        streaming={false}
        open={false}
        onOpenChange={() => {}}
        restingLabel="Completed"
        activeLabel="Running"
        stats={[]}
      />,
    );
    const inactiveLayer = container.querySelector<HTMLElement>(
      '[aria-hidden="true"][class*="col-start-1"]',
    );

    expect(inactiveLayer).not.toBeNull();
    expect(inactiveLayer?.getAttribute("class")).toContain("select-none");
    expect(container.querySelector("[aria-hidden] .shimmer")).toBeNull();
  });

  it("renders a streaming shimmer label's text exactly once", () => {
    const { getAllByText } = render(
      <ToolTimeline
        steps={[{ verb: "Read", chip: "file.ts", icon: TerminalIcon }]}
        visibleSteps={1}
        streaming
        open
        onOpenChange={() => {}}
        restingLabel="Completed"
        activeLabel="Running"
        stats={[]}
      />,
    );

    expect(getAllByText("Running")).toHaveLength(1);
    expect(getAllByText("Read")).toHaveLength(1);
  });
});

/**
 * State a sweep cannot see. A control whose accessible name is merely non-empty
 * still passes the sweep above while the part carried by colour, position, or
 * size goes unannounced, so each of those is pinned to the element that owns it.
 */
describe("state that is carried by more than colour", () => {
  it("names an mcp server's status in its collapsed row", () => {
    const { container } = render(
      CASES["mcp-server-panel"]!(0, 1) as ReactElement,
    );
    const row = container.querySelector<HTMLElement>("button")!;

    expect(accessibleName(row)).toContain("connected");
  });

  it.each(["working", "waiting", "done"] as AgentState[])(
    "names an agent's %s state and leaves nothing inert behind",
    (state) => {
      const { container } = render(
        <AgentStatus state={state} label="Refactoring composer" />,
      );
      const root = container.querySelector<HTMLElement>(
        '[data-slot="agent-status"]',
      )!;

      expect(root.querySelector("button")).toBeNull();
      expect(visibleText(root)).toContain(state);
      expect(
        root.lastElementChild!.getAttribute("aria-hidden"),
        "the trailing icon is still announced as a control",
      ).toBe("true");
    },
  );

  it("separates working from waiting by shape and motion, not colour", () => {
    const dot = (state: AgentState) =>
      render(
        <AgentStatus state={state} label="Refactoring composer" />,
      ).container.querySelector<HTMLElement>('[data-slot="agent-status"]')!
        .firstElementChild!.className;

    expect(dot("working")).toContain("animate-pulse");
    expect(dot("waiting")).not.toContain("animate-pulse");
    expect(
      dot("waiting"),
      "reduced motion leaves colour as the only channel",
    ).toContain("border");
    expect(dot("working")).not.toContain("border");
  });

  it("keeps the trailing icon from reading as pressable", () => {
    const { container } = render(
      <AgentStatus state="working" label="Refactoring composer" />,
    );
    const icon = container.querySelector<HTMLElement>(
      '[data-slot="agent-status"]',
    )!.lastElementChild!;

    expect(icon.className).not.toMatch(/hover:|active:|focus-visible:/);
  });

  it("values each subagent bar and leaves the summary indeterminate", () => {
    const { container } = render(
      <SubagentList
        agents={[
          { name: "Explore the runtime", model: "haiku" },
          { name: "Fix composer types", model: "sonnet" },
          { name: "Write regression tests", model: "sonnet" },
        ]}
        completedCount={1}
        progress={[-1, 37.5, 101]}
        showSummary
        summaryAgent={{ name: "Summarize findings", model: "haiku" }}
      />,
    );
    const progressbars = [
      ...container.querySelectorAll<HTMLElement>('[role="progressbar"]'),
    ];

    expect(
      progressbars.map((bar) => bar.getAttribute("aria-valuenow")),
      "the summary card has no progress input, so it reports no value",
    ).toEqual(["0", "37.5", "100", null]);
    expect(progressbars.map(accessibleName)).toEqual([
      "Explore the runtime progress",
      "Fix composer types progress",
      "Write regression tests progress",
      "Summarize findings progress",
    ]);
    for (const progressbar of progressbars) {
      expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
      expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
    }
  });

  it("marks the current map pin and gives it a 24px target", () => {
    const { container } = render(CASES["map-answer"]!(0, 2) as ReactElement);
    const pins = [...container.querySelectorAll<HTMLElement>("[aria-label]")];

    expect(pins.map((pin) => pin.getAttribute("aria-current"))).toEqual([
      "true",
      null,
    ]);
    for (const pin of pins) {
      expect(pin.className, "a pin target below 24px").toContain("size-6");
    }
  });

  it("marks the current thread and names an unread one", () => {
    const { container } = render(CASES["thread-list"]!(1, 3) as ReactElement);
    const rows = [...container.querySelectorAll<HTMLElement>("button")];

    expect(rows[1]?.getAttribute("aria-current")).toBe("true");
    expect(rows[0]?.getAttribute("aria-current")).toBeNull();
    expect(accessibleName(rows[0]!)).toContain("unread");
  });

  it("marks the current document anchor", () => {
    const { container } = render(
      CASES["document-reference"]!(1, 3) as ReactElement,
    );
    const anchors = [...container.querySelectorAll<HTMLElement>("button")];

    expect(anchors.map((a) => a.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
  });

  it("keeps feedback's live region mounted before it has anything to say", () => {
    const props = {
      reasons: ["Wrong"],
      selected: [],
      note: "",
      onToggleReason: () => {},
    };
    const { container, rerender } = render(
      <FeedbackDialog {...props} sent={false} />,
    );
    const before = container.querySelector('[role="status"]');

    expect(before, "no region to announce into").not.toBeNull();
    expect(before!.textContent?.trim()).toBe("");

    rerender(<FeedbackDialog {...props} sent />);
    const after = container.querySelector('[role="status"]');

    expect(after, "the region was replaced rather than updated").toBe(before);
    expect(after!.textContent).toContain("Thanks");
  });

  it("marks only one document anchor current when a page repeats", () => {
    const { container } = render(
      <DocumentReference
        title="Spec"
        pages={4}
        anchors={[
          { page: 2, quote: "first" },
          { page: 2, quote: "second" },
        ]}
        activePage={2}
      />,
    );

    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it("closes the palette's combobox and frees its message when nothing matches", () => {
    const { container } = render(
      <CommandPalette
        commands={[{ id: "a", label: "New thread", group: "Thread", keys: [] }]}
        query="zzz"
        activeId="a"
      />,
    );
    const listbox = container.querySelector('[role="listbox"]')!;

    expect(
      container
        .querySelector('[role="combobox"]')!
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      listbox.textContent,
      "a listbox owns only options, so a bare message inside it is suppressed",
    ).not.toContain("No command matches");
    expect(container.textContent).toContain("No command matches");
  });

  // A matching query, unlike the sweep's fixture, so there are options to point at.
  it.each([
    [
      "command-palette",
      <CommandPalette
        key="command-palette"
        commands={[
          { id: "a", label: "New thread", group: "Thread", keys: ["⌘N"] },
          { id: "b", label: "Stop the run", group: "Thread", keys: ["⌘."] },
        ]}
        query=""
        activeId="b"
      />,
    ],
    [
      "prompt-library",
      <PromptLibrary
        key="prompt-library"
        prompts={[
          { id: "a", name: "Summarize", body: "…", variables: [] },
          { id: "b", name: "Translate", body: "…", variables: [] },
        ]}
        query=""
        selectedId="b"
      />,
    ],
  ] as [string, ReactElement][])(
    "points %s's combobox at the highlighted option",
    (_name, element) => {
      const { container } = render(element);
      const input = container.querySelector<HTMLElement>('[role="combobox"]')!;
      const active = container.querySelector<HTMLElement>(
        '[role="option"][aria-selected="true"]',
      )!;

      expect(active.id).not.toBe("");
      expect(input.getAttribute("aria-activedescendant")).toBe(active.id);
      expect(
        container.querySelector('[role="listbox"]')!.id,
        "the listbox the combobox names",
      ).toBe(input.getAttribute("aria-controls"));
    },
  );
});

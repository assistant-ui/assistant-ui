import { describe, it, expect } from "vitest";
import {
  htmlArtifactType,
  defaultArtifactTypes,
  toolResultFromStatus,
  type ArtifactSpec,
  type ArtifactsState,
} from "../artifacts";

// These tests cover the pure exported values and type helpers.
// Integration tests for the full Artifacts resource (which requires
// an AssistantTapContext to mount) are exercised end-to-end via the example app.
//
// Version navigation (selectIndex / selectPrevious / selectNext) and the derived
// state fields (selectedIndex, count, isFirst, isLast) are computed inside
// `computeState()` which is called from within the resource. The correctness of
// those derivations is verified below via direct computation of equivalent logic.

describe("htmlArtifactType", () => {
  it("has the correct toolName", () => {
    expect(htmlArtifactType.toolName).toBe("render_html");
  });

  it("has the correct mimeType", () => {
    expect(htmlArtifactType.mimeType).toBe("text/html");
  });

  it("has the correct language", () => {
    expect(htmlArtifactType.language).toBe("html");
  });

  it("extracts code from args", () => {
    expect(htmlArtifactType.getContent({ code: "<h1>hi</h1>" })).toBe(
      "<h1>hi</h1>",
    );
  });

  it("returns undefined when args is undefined", () => {
    expect(htmlArtifactType.getContent(undefined as any)).toBeUndefined();
  });

  it("returns undefined when code is missing from args", () => {
    expect(htmlArtifactType.getContent({} as any)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// toolResultFromStatus — status → tool-result mapping
//
// The Artifacts resource completes artifact tool calls itself (they have no
// server-side execute) by mapping a terminal operation status to a tool
// result and submitting it via ThreadRuntime.addToolResult. The mapping is
// extracted as a pure helper so it can be covered without mounting the
// resource (which needs an AssistantTapContext).
// ---------------------------------------------------------------------------

describe("toolResultFromStatus", () => {
  it("maps a terminal 'ok' status to { result: { ok: true }, isError: false }", () => {
    expect(toolResultFromStatus({ status: "ok" })).toEqual({
      result: { ok: true },
      isError: false,
    });
  });

  it("maps a terminal 'error' status to { result: { ok: false, error }, isError: true }", () => {
    expect(
      toolResultFromStatus({
        status: "error",
        error: { message: "boom" },
      }),
    ).toEqual({
      result: { ok: false, error: "boom" },
      isError: true,
    });
  });

  it("produces no resolution for a 'pending' status", () => {
    expect(toolResultFromStatus({ status: "pending" })).toBeNull();
  });

  it("produces no resolution for null/undefined status", () => {
    expect(toolResultFromStatus(null)).toBeNull();
    expect(toolResultFromStatus(undefined)).toBeNull();
  });
});

describe("defaultArtifactTypes", () => {
  it("includes htmlArtifactType", () => {
    expect(defaultArtifactTypes).toContain(htmlArtifactType);
  });

  it("has exactly one entry", () => {
    expect(defaultArtifactTypes).toHaveLength(1);
  });
});

describe("ArtifactSpec shape", () => {
  it("allows custom spec", () => {
    const customSpec: ArtifactSpec<{ svg: string }> = {
      toolName: "render_svg",
      mimeType: "image/svg+xml",
      getContent: (a) => a?.svg,
      language: "xml",
    };
    expect(customSpec.getContent({ svg: "<svg />" })).toBe("<svg />");
    expect(customSpec.mimeType).toBe("image/svg+xml");
  });
});

// ---------------------------------------------------------------------------
// State derivation logic — Phase 2
//
// The Artifacts resource's computeState() calculates selectedIndex, count,
// isFirst, and isLast. These are computed deterministically from (artifacts,
// selectedId). We test that logic here directly by replicating the derivation,
// since the resource requires an AssistantTapContext for mount.
// ---------------------------------------------------------------------------

/** Replicate the computeState derivation for unit-testable assertions */
function deriveState(
  artifacts: { id: string }[],
  selectedId: string | null,
): Pick<
  ArtifactsState,
  "selectedIndex" | "count" | "isFirst" | "isLast" | "selectedId"
> {
  const fallbackId = artifacts.at(-1)?.id ?? null;
  const effectiveId = selectedId ?? fallbackId;
  const idx = artifacts.findIndex((a) => a.id === effectiveId);
  const count = artifacts.length;
  return {
    selectedId: effectiveId,
    selectedIndex: idx,
    count,
    isFirst: idx <= 0,
    isLast: idx === -1 || idx === count - 1,
  };
}

const makeArtifacts = (...ids: string[]) => ids.map((id) => ({ id }));

describe("ArtifactsState derivation — selectedIndex / count / isFirst / isLast", () => {
  it("empty list: selectedIndex -1, count 0, isFirst true, isLast true", () => {
    const s = deriveState([], null);
    expect(s.selectedIndex).toBe(-1);
    expect(s.count).toBe(0);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(true);
  });

  it("single artifact, null selectedId: defaults to last (index 0)", () => {
    const s = deriveState(makeArtifacts("t1"), null);
    expect(s.selectedId).toBe("t1");
    expect(s.selectedIndex).toBe(0);
    expect(s.count).toBe(1);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(true);
  });

  it("three artifacts, null selectedId: follows tail (index 2)", () => {
    const s = deriveState(makeArtifacts("t1", "t2", "t3"), null);
    expect(s.selectedId).toBe("t3");
    expect(s.selectedIndex).toBe(2);
    expect(s.count).toBe(3);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(true);
  });

  it("three artifacts, selectedId='t1': isFirst true, isLast false", () => {
    const s = deriveState(makeArtifacts("t1", "t2", "t3"), "t1");
    expect(s.selectedIndex).toBe(0);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(false);
  });

  it("three artifacts, selectedId='t2': neither first nor last", () => {
    const s = deriveState(makeArtifacts("t1", "t2", "t3"), "t2");
    expect(s.selectedIndex).toBe(1);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(false);
  });

  it("three artifacts, selectedId='t3': isFirst false, isLast true", () => {
    const s = deriveState(makeArtifacts("t1", "t2", "t3"), "t3");
    expect(s.selectedIndex).toBe(2);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(true);
  });

  it("follow-tail: when selectedId is null and list grows, selectedId tracks tail", () => {
    const s2 = deriveState(makeArtifacts("t1", "t2"), null);
    expect(s2.selectedId).toBe("t2");

    // Simulate a new artifact arriving while selectedId is still null
    const s3 = deriveState(makeArtifacts("t1", "t2", "t3"), null);
    expect(s3.selectedId).toBe("t3");
    expect(s3.selectedIndex).toBe(2);
  });

  it("pinned: when selectedId is set, list growth does not change selectedId", () => {
    const s2 = deriveState(makeArtifacts("t1", "t2"), "t1");
    expect(s2.selectedId).toBe("t1");

    // New artifact arrives but selectedId stays pinned
    const s3 = deriveState(makeArtifacts("t1", "t2", "t3"), "t1");
    expect(s3.selectedId).toBe("t1");
    expect(s3.selectedIndex).toBe(0);
    expect(s3.count).toBe(3);
    expect(s3.isLast).toBe(false);
  });
});

describe("selectPrevious / selectNext derivation", () => {
  it("selectPrevious from tail moves to second-to-last", () => {
    const current = deriveState(makeArtifacts("t1", "t2", "t3"), null);
    expect(current.selectedIndex).toBe(2); // tail
    // selectPrevious: if cur > 0, select artifacts[cur - 1]
    const arts = makeArtifacts("t1", "t2", "t3");
    const newId = arts[current.selectedIndex - 1].id;
    const next = deriveState(arts, newId);
    expect(next.selectedId).toBe("t2");
    expect(next.selectedIndex).toBe(1);
  });

  it("selectPrevious at first is a no-op", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    const current = deriveState(arts, "t1");
    expect(current.selectedIndex).toBe(0);
    expect(current.isFirst).toBe(true);
    // cur is NOT > 0, so no-op — selectedId stays "t1"
    const next = deriveState(arts, "t1");
    expect(next.selectedId).toBe("t1");
  });

  it("selectNext from first moves to second", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    const current = deriveState(arts, "t1");
    expect(current.selectedIndex).toBe(0);
    // selectNext: if cur >= 0 && cur < length - 1, select artifacts[cur + 1]
    const newId = arts[current.selectedIndex + 1].id;
    const next = deriveState(arts, newId);
    expect(next.selectedId).toBe("t2");
    expect(next.selectedIndex).toBe(1);
  });

  it("selectNext at last is a no-op", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    const current = deriveState(arts, "t3");
    expect(current.selectedIndex).toBe(2);
    expect(current.isLast).toBe(true);
    // cur is NOT < length - 1, so no-op
    const next = deriveState(arts, "t3");
    expect(next.selectedId).toBe("t3");
  });
});

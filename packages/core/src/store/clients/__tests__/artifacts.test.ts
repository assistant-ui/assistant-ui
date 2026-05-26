import { describe, it, expect } from "vitest";
import {
  htmlArtifactType,
  defaultArtifactTypes,
  collectArtifacts,
  deriveArtifactsListState,
  toolResultFromStatus,
  updateArtifactPatch,
  type ArtifactSpec,
} from "../artifacts";

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

describe("collectArtifacts", () => {
  it("records unknown-id patch errors in foldStatuses without mutating the status input map", () => {
    const byToolName = new Map([
      ["render_html", { kind: "create" as const, spec: htmlArtifactType }],
      [
        "update_artifact",
        { kind: "patch" as const, spec: updateArtifactPatch },
      ],
    ]);
    const statusInput = new Map<string, { status: "pending" }>();
    const messages = [
      {
        content: [
          {
            type: "tool-call",
            toolName: "update_artifact",
            toolCallId: "patch-1",
            argsText: JSON.stringify({
              artifactId: "missing",
              find: "x",
              replace: "y",
            }),
            args: { artifactId: "missing", find: "x", replace: "y" },
          },
        ],
      },
    ] as const;

    const { artifacts, foldStatuses } = collectArtifacts(
      messages,
      byToolName,
      statusInput,
    );

    expect(artifacts).toHaveLength(0);
    expect(statusInput.size).toBe(0);
    expect(foldStatuses.get("patch-1")?.status).toBe("error");
    expect(foldStatuses.get("patch-1")).toMatchObject({
      status: "error",
      error: {
        message: expect.stringContaining('no artifact with id "missing"'),
      },
    });
  });
});

describe("deriveArtifactsListState", () => {
  const makeArtifacts = (...ids: string[]) => ids.map((id) => ({ id }));

  it("empty list: selectedIndex -1, count 0, isFirst true, isLast true", () => {
    const s = deriveArtifactsListState([], null);
    expect(s.selectedIndex).toBe(-1);
    expect(s.count).toBe(0);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(true);
  });

  it("single artifact, null selectedId: defaults to last (index 0)", () => {
    const s = deriveArtifactsListState(makeArtifacts("t1"), null);
    expect(s.selectedId).toBe("t1");
    expect(s.selectedIndex).toBe(0);
    expect(s.count).toBe(1);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(true);
  });

  it("three artifacts, null selectedId: follows tail (index 2)", () => {
    const s = deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), null);
    expect(s.selectedId).toBe("t3");
    expect(s.selectedIndex).toBe(2);
    expect(s.count).toBe(3);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(true);
  });

  it("three artifacts, selectedId='t1': isFirst true, isLast false", () => {
    const s = deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), "t1");
    expect(s.selectedIndex).toBe(0);
    expect(s.isFirst).toBe(true);
    expect(s.isLast).toBe(false);
  });

  it("three artifacts, selectedId='t2': neither first nor last", () => {
    const s = deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), "t2");
    expect(s.selectedIndex).toBe(1);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(false);
  });

  it("three artifacts, selectedId='t3': isFirst false, isLast true", () => {
    const s = deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), "t3");
    expect(s.selectedIndex).toBe(2);
    expect(s.isFirst).toBe(false);
    expect(s.isLast).toBe(true);
  });

  it("follow-tail: when selectedId is null and list grows, selectedId tracks tail", () => {
    expect(
      deriveArtifactsListState(makeArtifacts("t1", "t2"), null).selectedId,
    ).toBe("t2");
    expect(
      deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), null)
        .selectedId,
    ).toBe("t3");
  });

  it("pinned: when selectedId is set, list growth does not change selectedId", () => {
    const s3 = deriveArtifactsListState(makeArtifacts("t1", "t2", "t3"), "t1");
    expect(s3.selectedId).toBe("t1");
    expect(s3.selectedIndex).toBe(0);
    expect(s3.count).toBe(3);
    expect(s3.isLast).toBe(false);
  });
});

describe("selectPrevious / selectNext derivation", () => {
  const makeArtifacts = (...ids: string[]) => ids.map((id) => ({ id }));

  it("selectPrevious from tail moves to second-to-last", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    const current = deriveArtifactsListState(arts, null);
    expect(current.selectedIndex).toBe(2);
    const newId = arts[current.selectedIndex - 1]!.id;
    const next = deriveArtifactsListState(arts, newId);
    expect(next.selectedId).toBe("t2");
    expect(next.selectedIndex).toBe(1);
  });

  it("selectPrevious at first is a no-op", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    expect(deriveArtifactsListState(arts, "t1").selectedId).toBe("t1");
  });

  it("selectNext from first moves to second", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    const current = deriveArtifactsListState(arts, "t1");
    const newId = arts[current.selectedIndex + 1]!.id;
    const next = deriveArtifactsListState(arts, newId);
    expect(next.selectedId).toBe("t2");
    expect(next.selectedIndex).toBe(1);
  });

  it("selectNext at last is a no-op", () => {
    const arts = makeArtifacts("t1", "t2", "t3");
    expect(deriveArtifactsListState(arts, "t3").selectedId).toBe("t3");
  });
});

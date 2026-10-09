import { describe, expect, it } from "vitest";
import {
  countGroups,
  decodePayload,
  deleteNote,
  encodePayload,
  formatMarker,
  insertNote,
  listNotes,
  newNoteId,
  scanTags,
} from "./markers";

const stamp = { id: "n-0a1b2c3d", ts: "2026-10-08T12:00:00.000Z" };

const page = `import { Variant, Variants } from "@assistant-ui/variants";

export function Page() {
  return (
    <main className={cn("a", { b: x > 1 })}>
      <Variants id="scf-features" label="Features" default="cards">
        <Variant id="current" label="Current">
          <FeaturesCurrent />
        </Variant>
        <Variant id="cards" label={"Light > cards"}>
          <>
            <FeaturesCards />
            <Note text={\`a \${b > c ? "}" : "{"}\`} />
          </>
        </Variant>
        <Variant id="grid" label="Grid" />
      </Variants>
      <Variants id="scf-cta">
        <Variant id="button">
          <Variants id="scf-tone">
            <Variant id="loud">LOUD</Variant>
            <Variant id="quiet">quiet</Variant>
          </Variants>
        </Variant>
        <Variant id='link'>link</Variant>
      </Variants>
    </main>
  );
}
`;

const insertOk = (
  source: string,
  target: { group: string; variant?: string },
  payload: { note: string; hint?: string },
) => {
  const result = insertNote(source, target, payload, stamp);
  if (!result.ok) throw new Error(result.error);
  return result;
};

describe("payload", () => {
  it("round-trips through base64url", () => {
    const payload = { note: 'smaller "arrow" ✓', hint: "a > svg" };
    const encoded = encodePayload(payload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePayload(encoded)).toEqual(payload);
    expect(decodePayload("not json")).toBeUndefined();
    expect(decodePayload(encodePayload({ note: 1 } as never))).toBeUndefined();
  });

  it("makes eight hex digit ids", () => {
    expect(newNoteId()).toMatch(/^n-[0-9a-f]{8}$/);
  });
});

describe("scanTags", () => {
  it("finds groups and variants with their groups through braces and strings", () => {
    const tags = scanTags(page).map((tag) => [tag.kind, tag.id, tag.group]);
    expect(tags).toEqual([
      ["group", "scf-features", undefined],
      ["variant", "current", "scf-features"],
      ["variant", "cards", "scf-features"],
      ["variant", "grid", "scf-features"],
      ["group", "scf-cta", undefined],
      ["variant", "button", "scf-cta"],
      ["group", "scf-tone", undefined],
      ["variant", "loud", "scf-tone"],
      ["variant", "quiet", "scf-tone"],
      ["variant", "link", "scf-cta"],
    ]);
    expect(countGroups(page, "scf-tone")).toBe(1);
    expect(countGroups(page, "missing")).toBe(0);
  });
});

describe("insertNote and deleteNote", () => {
  it("inserts a variant note as the first child and deletes it back to the original", () => {
    const result = insertOk(
      page,
      { group: "scf-features", variant: "cards" },
      { note: "bigger icons", hint: "svg" },
    );
    expect(result.source).toContain(
      `<Variant id="cards" label={"Light > cards"}>\n          ${formatMarker(stamp.id, stamp.ts, { note: "bigger icons", hint: "svg" })}\n          <>`,
    );
    expect(result.line).toBe(11);
    expect(deleteNote(result.source, stamp.id)).toBe(page);
  });

  it("inserts a group note after the <Variants> tag", () => {
    const result = insertOk(page, { group: "scf-cta" }, { note: "align" });
    const notes = listNotes(result.source);
    expect(notes).toEqual([
      {
        id: stamp.id,
        ts: stamp.ts,
        note: "align",
        group: "scf-cta",
        variant: undefined,
        line: 19,
      },
    ]);
    expect(deleteNote(result.source, stamp.id)).toBe(page);
  });

  it("opens a self-closing <Variant /> to hold the marker", () => {
    const result = insertOk(
      page,
      { group: "scf-features", variant: "grid" },
      { note: "denser" },
    );
    expect(result.source).toContain(
      `<Variant id="grid" label="Grid">\n          ${formatMarker(stamp.id, stamp.ts, { note: "denser" })}\n        </Variant>`,
    );
    expect(listNotes(result.source)[0]).toMatchObject({
      group: "scf-features",
      variant: "grid",
    });
  });

  it("targets nested groups and single-quoted ids", () => {
    const tone = insertOk(
      page,
      { group: "scf-tone", variant: "quiet" },
      { note: "softer" },
    );
    expect(listNotes(tone.source)[0]).toMatchObject({
      group: "scf-tone",
      variant: "quiet",
    });
    const link = insertOk(
      page,
      { group: "scf-cta", variant: "link" },
      { note: "arrow" },
    );
    expect(listNotes(link.source)[0]).toMatchObject({
      group: "scf-cta",
      variant: "link",
    });
  });

  it("refuses unknown and duplicated targets", () => {
    expect(insertNote(page, { group: "nope" }, { note: "x" })).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(
      insertNote(page, { group: "scf-cta", variant: "nope" }, { note: "x" }),
    ).toMatchObject({ ok: false, status: 404 });
    const twice = `${page}\n<Variants id="scf-cta"><Variant id="a" /></Variants>`;
    expect(
      insertNote(twice, { group: "scf-cta" }, { note: "x" }),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      insertNote('<Variants id="g" />', { group: "g" }, { note: "x" }),
    ).toMatchObject({ ok: false, status: 422 });
  });

  it("deletes only the marker with the given id", () => {
    const first = insertOk(page, { group: "scf-cta" }, { note: "one" });
    const second = insertNote(
      first.source,
      { group: "scf-cta", variant: "link" },
      { note: "two" },
      { id: "n-ffffffff", ts: stamp.ts },
    );
    if (!second.ok) throw new Error(second.error);
    const remaining = deleteNote(second.source, stamp.id)!;
    expect(listNotes(remaining).map((note) => note.note)).toEqual(["two"]);
    expect(deleteNote(remaining, "n-12345678")).toBeUndefined();
  });

  it("ignores markers whose payload is broken", () => {
    const broken = page.replace(
      '<Variant id="link">',
      '<Variant id="link">{/* @variants-note id="n-00000000" ts="x" text="!!" */}',
    );
    expect(listNotes(broken)).toEqual([]);
  });
});

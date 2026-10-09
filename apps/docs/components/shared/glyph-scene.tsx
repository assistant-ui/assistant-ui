import { cn } from "@/lib/utils";

export type GlyphTone = "ghost" | "whisper" | "live";

export type GlyphToken = {
  text: string;
  x: number;
  y: number;
  tone: GlyphTone;
};

export type GlyphSceneArt = {
  name: string;
  field: string;
  tokens: GlyphToken[];
};

export const GRID_COLS = 80;
export const GRID_ROWS = 30;
export const FIELD_CHARS = " .,:;-=+*#%@|/_<>()~^";

export function fieldRows(field: string): string[] {
  const lines = field.split("\n");
  if (lines.length > GRID_ROWS && lines[0] === "") lines.shift();
  if (lines.length > GRID_ROWS && lines[lines.length - 1]!.trim() === "") {
    lines.pop();
  }
  return lines;
}

export function parseField(field: string): string[] {
  return fieldRows(field).map((line) =>
    line.padEnd(GRID_COLS).slice(0, GRID_COLS),
  );
}

function splice(row: string, x: number, text: string): string {
  return row.slice(0, x) + text + row.slice(x + text.length);
}

export function buildLayers(scene: GlyphSceneArt): {
  base: string;
  whisper: string;
  live: string;
} {
  const base = parseField(scene.field);
  const blank = " ".repeat(GRID_COLS);
  const whisper = Array.from({ length: base.length }, () => blank);
  const live = Array.from({ length: base.length }, () => blank);
  for (const token of scene.tokens) {
    if (token.y < 0 || token.y >= base.length) continue;
    base[token.y] = splice(base[token.y]!, token.x, token.text);
    if (token.tone === "whisper") {
      whisper[token.y] = splice(whisper[token.y]!, token.x, token.text);
    }
    if (token.tone === "live") {
      live[token.y] = splice(live[token.y]!, token.x, token.text);
    }
  }
  return {
    base: base.join("\n"),
    whisper: whisper.join("\n"),
    live: live.join("\n"),
  };
}

function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function quietField(slug: string): GlyphSceneArt {
  const random = mulberry32(hashSlug(slug));
  const horizon = 15 + Math.floor(random() * 6);
  const rows: string[] = [];
  for (let y = 0; y < GRID_ROWS; y += 1) {
    let row = "";
    for (let x = 0; x < GRID_COLS; x += 1) {
      let ch = " ";
      if (y < horizon) {
        const d = 0.3 * Math.pow(1 - y / horizon, 1.6) + 0.012;
        const p = x > 0 && row[x - 1] !== " " ? Math.min(0.85, d * 2.8) : d;
        if (random() < p) {
          ch = y < horizon / 3 ? ":" : y < (2 * horizon) / 3 ? "." : ",";
        }
      } else if (y === horizon) {
        if (x > 0 && x < GRID_COLS - 1 && random() < 0.9) {
          ch = random() < 0.85 ? "=" : "_";
        }
      } else if (random() < Math.max(0.02, 0.08 - (y - horizon) * 0.007)) {
        ch = ".";
      }
      row += ch;
    }
    rows.push(row.trimEnd());
  }
  const x = 16 + Math.floor(random() * 44);
  const y = 7 + Math.floor(random() * (horizon - 10));
  return {
    name: "quiet field",
    field: rows.join("\n"),
    tokens: [{ text: "|", x, y, tone: "live" }],
  };
}

export function validateScene(scene: GlyphSceneArt): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z ,]+$/.test(scene.name)) {
    errors.push(`bad name: ${scene.name}`);
  }
  const raw = fieldRows(scene.field);
  if (raw.length !== GRID_ROWS) {
    errors.push(`expected ${GRID_ROWS} rows, got ${raw.length}`);
  }
  raw.forEach((line, y) => {
    if (line.length > GRID_COLS) {
      errors.push(`row ${y} has ${line.length} cells`);
    }
    for (const ch of line) {
      if (!FIELD_CHARS.includes(ch)) {
        errors.push(`row ${y} has illegal cell ${JSON.stringify(ch)}`);
        break;
      }
    }
  });
  const cells = parseField(scene.field).join("");
  const coverage = cells.replace(/ /g, "").length / (GRID_COLS * GRID_ROWS);
  if (coverage < 0.06 || coverage > 0.45) {
    errors.push(`coverage ${coverage.toFixed(3)} outside 0.06-0.45`);
  }
  if (scene.tokens.length < 1 || scene.tokens.length > 8) {
    errors.push(`expected 1-8 tokens, got ${scene.tokens.length}`);
  }
  const live = scene.tokens.filter((token) => token.tone === "live");
  if (live.length !== 1) {
    errors.push(`expected exactly 1 live token, got ${live.length}`);
  }
  if (live[0] && live[0].text.length > 12) {
    errors.push("live token longer than 12 cells");
  }
  const whispers = scene.tokens.filter((token) => token.tone === "whisper");
  if (whispers.length > 5) {
    errors.push(`expected at most 5 whisper tokens, got ${whispers.length}`);
  }
  for (const token of scene.tokens) {
    if (token.text.length < 1 || token.text.length > 28) {
      errors.push(`token ${JSON.stringify(token.text)} length out of range`);
    }
    if (
      [...token.text].some(
        (ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) > 126,
      )
    ) {
      errors.push(`token ${JSON.stringify(token.text)} has non-ascii cells`);
    }
    if (
      token.x < 0 ||
      token.y < 0 ||
      token.y >= GRID_ROWS ||
      token.x + token.text.length > GRID_COLS
    ) {
      errors.push(`token ${JSON.stringify(token.text)} out of bounds`);
    }
    if (
      token.tone !== "ghost" &&
      (token.x < 16 ||
        token.x + token.text.length > 64 ||
        token.y < 7 ||
        token.y > 23)
    ) {
      errors.push(
        `token ${JSON.stringify(token.text)} outside the safe zone (x 16-64, y 7-23)`,
      );
    }
  }
  const spans = new Map<number, Array<[number, number]>>();
  for (const token of scene.tokens) {
    const list = spans.get(token.y) ?? [];
    for (const [start, end] of list) {
      if (token.x < end && token.x + token.text.length > start) {
        errors.push(`token overlap on row ${token.y}`);
      }
    }
    list.push([token.x, token.x + token.text.length]);
    spans.set(token.y, list);
  }
  return errors;
}

const windowLayer =
  "pointer-events-none absolute top-1/2 left-1/2 w-max -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] leading-[1.25] font-medium tracking-normal whitespace-pre select-none";
const fitLayer =
  "pointer-events-none absolute inset-0 w-max font-mono text-[calc(100cqw/48)] leading-[1.25] font-medium tracking-normal whitespace-pre select-none";

export function GlyphScene({
  scene,
  live = false,
  fit = false,
  className,
}: {
  scene: GlyphSceneArt;
  live?: boolean;
  fit?: boolean;
  className?: string;
}) {
  const layers = buildLayers(scene);
  const layerClass = fit ? fitLayer : windowLayer;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block aspect-[32/25] overflow-hidden",
        fit && "@container",
        className,
      )}
    >
      <span className="from-foreground/[0.04] absolute inset-0 bg-gradient-to-b to-transparent" />
      <pre
        className={cn(
          layerClass,
          "text-foreground/35 group-hover:text-foreground/45 transition-colors",
        )}
      >
        {layers.base}
      </pre>
      <pre className={cn(layerClass, "text-foreground/75")}>
        {layers.whisper}
      </pre>
      <pre
        className={cn(
          layerClass,
          "text-blue-500",
          live && "animate-pulse motion-reduce:animate-none",
        )}
      >
        {layers.live}
      </pre>
    </span>
  );
}

export function GlyphPlate({
  scene,
  live = false,
  fit = false,
  className,
}: {
  scene: GlyphSceneArt;
  live?: boolean;
  fit?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-foreground/10 group-hover:border-foreground/25 block border transition-colors",
        className,
      )}
    >
      <GlyphScene scene={scene} live={live} fit={fit} />
    </span>
  );
}

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";
import { getCertificatesDirectory } from "./cache-paths.js";
import {
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  getGlyph,
  hasGlyph,
} from "./certificate-glyphs.js";

export const CERTIFICATE_WIDTH = 1600;
export const CERTIFICATE_HEIGHT = 1000;
export const MAX_CERTIFICATE_NAME_LENGTH = 80;

export class CertificateError extends Error {
  override name = "CertificateError";
}

type Rgba = readonly [number, number, number, number];

const BACKGROUND: Rgba = [250, 248, 243, 255];
const INK: Rgba = [28, 35, 45, 255];
const ACCENT: Rgba = [180, 120, 64, 255];
const MUTED: Rgba = [90, 98, 110, 255];
const BORDER: Rgba = [40, 48, 60, 255];

const NAME_MAX_SCALE = 5;
const NAME_MIN_SCALE = 2;
const NAME_MAX_WIDTH = CERTIFICATE_WIDTH - 160;

function stripControlChars(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) continue;
    result += char;
  }
  return result;
}

export function sanitizeCertificateName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new CertificateError("Certificate name must be a non-empty string");
  }
  if (trimmed.length > MAX_CERTIFICATE_NAME_LENGTH) {
    throw new CertificateError(
      `Certificate name must be at most ${MAX_CERTIFICATE_NAME_LENGTH} characters`,
    );
  }
  const sanitized = stripControlChars(trimmed)
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!sanitized) {
    throw new CertificateError(
      "Certificate name must contain printable characters",
    );
  }
  for (const char of sanitized) {
    if (!hasGlyph(char)) {
      throw new CertificateError(
        "Certificate name can only contain letters, digits, spaces, and - . , ' : /",
      );
    }
  }
  return sanitized;
}

export function formatAwardDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function setPixel(png: PNG, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

function fillRect(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgba,
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      setPixel(png, col, row, color);
    }
  }
}

function strokeRect(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  color: Rgba,
): void {
  fillRect(png, x, y, width, thickness, color);
  fillRect(png, x, y + height - thickness, width, thickness, color);
  fillRect(png, x, y, thickness, height, color);
  fillRect(png, x + width - thickness, y, thickness, height, color);
}

function measureText(text: string, scale: number, tracking = 1): number {
  if (!text) return 0;
  return text.length * (GLYPH_WIDTH + tracking) * scale - tracking * scale;
}

function drawText(
  png: PNG,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: Rgba,
  tracking = 1,
): void {
  let cursor = x;
  for (const char of text) {
    const glyph = getGlyph(char);
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const line = glyph[row] ?? ".....";
      for (let col = 0; col < GLYPH_WIDTH; col++) {
        if (line[col] !== "#") continue;
        fillRect(
          png,
          cursor + col * scale,
          y + row * scale,
          scale,
          scale,
          color,
        );
      }
    }
    cursor += (GLYPH_WIDTH + tracking) * scale;
  }
}

function nameScale(name: string): number {
  for (let scale = NAME_MAX_SCALE; scale >= NAME_MIN_SCALE; scale--) {
    if (measureText(name, scale) <= NAME_MAX_WIDTH) return scale;
  }
  throw new CertificateError("Certificate name is too wide to render");
}

function drawCentered(
  png: PNG,
  text: string,
  y: number,
  scale: number,
  color: Rgba,
  tracking = 1,
): void {
  const width = measureText(text, scale, tracking);
  drawText(
    png,
    text,
    Math.floor((png.width - width) / 2),
    y,
    scale,
    color,
    tracking,
  );
}

function assertInsideCertificatesDir(
  filePath: string,
  certificatesDir: string,
): void {
  const resolvedFile = resolve(filePath);
  const resolvedDir = resolve(certificatesDir);
  const relativePath = relative(resolvedDir, resolvedFile);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new CertificateError(
      "Certificate path escapes the certificates directory",
    );
  }
}

export type WriteCertificateOptions = {
  name: string;
  courseTitle: string;
  awardDate?: string;
  certificateId?: string;
  certificatesDir?: string;
};

export type WrittenCertificate = {
  name: string;
  courseTitle: string;
  awardDate: string;
  certificateId: string;
  filePath: string;
};

export function renderCertificatePng(options: {
  name: string;
  courseTitle: string;
  awardDate: string;
  certificateId: string;
}): Buffer {
  const png = new PNG({ width: CERTIFICATE_WIDTH, height: CERTIFICATE_HEIGHT });
  fillRect(png, 0, 0, png.width, png.height, BACKGROUND);
  strokeRect(png, 36, 36, png.width - 72, png.height - 72, 4, BORDER);
  strokeRect(png, 52, 52, png.width - 104, png.height - 104, 2, ACCENT);

  drawCentered(png, "CERTIFICATE OF COMPLETION", 140, 4, INK, 1);
  drawCentered(png, "assistant-ui", 230, 3, ACCENT, 1);
  drawCentered(png, "This certifies that", 330, 2, MUTED, 1);
  drawCentered(png, options.name, 400, nameScale(options.name), INK, 1);
  drawCentered(png, "has completed", 520, 2, MUTED, 1);
  drawCentered(png, options.courseTitle, 580, 3, INK, 1);
  drawCentered(png, options.awardDate, 700, 2, MUTED, 1);
  drawCentered(png, `ID ${options.certificateId}`, 820, 2, MUTED, 1);

  return PNG.sync.write(png);
}

export function writeCourseCertificate(
  options: WriteCertificateOptions,
): WrittenCertificate {
  const name = sanitizeCertificateName(options.name);
  const courseTitle = options.courseTitle.trim();
  if (!courseTitle) {
    throw new CertificateError("Course title is required");
  }

  const awardDate = options.awardDate ?? formatAwardDate();
  const certificateId = options.certificateId ?? randomUUID();
  const certificatesDir = options.certificatesDir ?? getCertificatesDirectory();
  const filePath = join(certificatesDir, `${certificateId}.png`);
  assertInsideCertificatesDir(filePath, certificatesDir);

  mkdirSync(certificatesDir, { recursive: true });
  const png = renderCertificatePng({
    name,
    courseTitle,
    awardDate,
    certificateId,
  });
  writeFileSync(filePath, png);

  return {
    name,
    courseTitle,
    awardDate,
    certificateId,
    filePath: resolve(filePath),
  };
}

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { z } from "zod";
import { formatMCPResponse } from "../utils/mcp-format.js";

const certificateInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine(
      (name) => !name.includes("\0"),
      "Name contains an invalid character",
    ),
});

const WIDTH = 1200;
const HEIGHT = 800;

const font: Record<string, string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuffer, data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body), 0);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, body, checksum]);
}

function certificatePng(name: string): Buffer {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4, 255);
  const fill = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number],
  ) => {
    for (
      let row = Math.max(0, y);
      row < Math.min(HEIGHT, y + height);
      row += 1
    ) {
      for (
        let column = Math.max(0, x);
        column < Math.min(WIDTH, x + width);
        column += 1
      ) {
        const offset = (row * WIDTH + column) * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        pixels[offset + 3] = 255;
      }
    }
  };
  const line = (
    x: number,
    y: number,
    width: number,
    color: [number, number, number],
  ) => fill(x, y, width, 4, color);
  const drawText = (
    value: string,
    x: number,
    y: number,
    scale: number,
    color: [number, number, number],
  ) => {
    let cursor = x;
    for (const character of value.toUpperCase()) {
      const glyph = font[character] ?? font["?"];
      if (!glyph) continue;
      for (let row = 0; row < glyph.length; row += 1) {
        for (let column = 0; column < glyph[row]!.length; column += 1) {
          if (glyph[row]![column] === "1")
            fill(cursor + column * scale, y + row * scale, scale, scale, color);
        }
      }
      cursor += 6 * scale;
    }
  };

  fill(0, 0, WIDTH, HEIGHT, [248, 250, 252]);
  fill(28, 28, WIDTH - 56, HEIGHT - 56, [255, 255, 255]);
  line(48, 48, WIDTH - 96, [30, 64, 175]);
  line(48, HEIGHT - 52, WIDTH - 96, [217, 119, 6]);
  drawText("AUI", 90, 92, 12, [30, 64, 175]);
  drawText("CERTIFICATE OF COMPLETION", 276, 108, 7, [30, 41, 59]);
  drawText("ASSISTANT-UI", 418, 210, 10, [30, 64, 175]);
  drawText("PRESENTED TO", 477, 330, 6, [71, 85, 105]);
  const displayName = name
    .toUpperCase()
    .replace(/[^A-Z0-9 .,'!?-]/g, "?")
    .slice(0, 38);
  const nameWidth = displayName.length * 6 * 8;
  drawText(
    displayName,
    Math.max(90, Math.floor((WIDTH - nameWidth) / 2)),
    390,
    8,
    [15, 23, 42],
  );
  line(180, 475, WIDTH - 360, [217, 119, 6]);
  drawText(
    "FOR COMPLETING BUILD A GENERATIVE UI ASSISTANT",
    150,
    550,
    5,
    [30, 64, 175],
  );
  drawText("LOCAL MCP COURSE", 460, 650, 6, [71, 85, 105]);

  const scanlines = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let row = 0; row < HEIGHT; row += 1) {
    pixels.copy(
      scanlines,
      row * (WIDTH * 4 + 1) + 1,
      row * WIDTH * 4,
      (row + 1) * WIDTH * 4,
    );
  }
  const text = Buffer.from(`Name\0${name}`);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("tEXt", text),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const assistantUICourseCertificateTools = {
  name: "assistantUICourseCertificate",
  description:
    "Create a local PNG certificate for completing the Build a Generative UI Assistant course and return its confined file path.",
  parameters: certificateInputSchema,
  execute: async ({ name }: z.infer<typeof certificateInputSchema>) => {
    const directory = await mkdtemp(join(tmpdir(), "assistant-ui-course-"));
    const path = join(directory, "certificate.png");
    await writeFile(path, certificatePng(name));
    return formatMCPResponse({
      type: "certificate",
      courseId: "build-generative-ui-assistant",
      name,
      path,
    });
  },
};

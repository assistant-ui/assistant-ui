import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CertificateError,
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
  sanitizeCertificateName,
  writeCourseCertificate,
} from "../certificate.js";

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("certificate", () => {
  it("rejects empty, oversized, and unsupported names", () => {
    expect(() => sanitizeCertificateName("   ")).toThrow(CertificateError);
    expect(() => sanitizeCertificateName("a".repeat(81))).toThrow(
      CertificateError,
    );
    expect(() => sanitizeCertificateName("山田太郎")).toThrow(CertificateError);
  });

  it("keeps accented Latin names by stripping combining marks", () => {
    expect(sanitizeCertificateName("José Álvarez")).toBe("Jose Alvarez");
  });

  it("writes a valid 1600x1000 PNG under the certificates directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-cert-"));
    tempDirectories.push(directory);

    const result = writeCourseCertificate({
      name: "Harbor Course Eval",
      courseTitle: "Build a Generative UI Assistant",
      awardDate: "August 6, 2026",
      certificateId: "11111111-2222-3333-4444-555555555555",
      certificatesDir: directory,
    });

    expect(result.filePath.startsWith(directory)).toBe(true);
    expect(result.name).toBe("Harbor Course Eval");
    expect(result.courseTitle).toBe("Build a Generative UI Assistant");
    expect(result.awardDate).toBe("August 6, 2026");

    const bytes = readFileSync(result.filePath);
    expect([...bytes.subarray(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    // IHDR width/height are big-endian at bytes 16-23
    const width =
      (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
    const height =
      (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;
    expect(width).toBe(CERTIFICATE_WIDTH);
    expect(height).toBe(CERTIFICATE_HEIGHT);
  });

  it("writes an 80-character name without rejecting it", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-cert-"));
    tempDirectories.push(directory);
    const name = "A".repeat(80);
    const result = writeCourseCertificate({
      name,
      courseTitle: "Build a Generative UI Assistant",
      certificatesDir: directory,
    });
    expect(result.name).toBe(name);
    expect(readFileSync(result.filePath).subarray(0, 8)[0]).toBe(0x89);
  });

  it("does not write a file when the name is invalid", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcp-cert-"));
    tempDirectories.push(directory);
    expect(() =>
      writeCourseCertificate({
        name: "",
        courseTitle: "Build a Generative UI Assistant",
        certificatesDir: directory,
      }),
    ).toThrow(CertificateError);
  });
});

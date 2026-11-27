export const cloudHarnessTemplate = "templates/cloud-harness";

const excluded = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "coverage",
  "out",
  "build",
  ".vercel",
  ".DS_Store",
  "cloud.json",
  "provision.json",
  "next-env.d.ts",
]);

export function isCloudHarnessTemplateEntry(name) {
  return (
    !excluded.has(name) &&
    (!name.startsWith(".env") || name === ".env.example") &&
    !name.endsWith(".tsbuildinfo")
  );
}

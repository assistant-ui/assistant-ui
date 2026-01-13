import type { ExportedFile, ChatGPTAppManifest } from "./types";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface BundleSizeAnalysis {
  jsSize: number;
  cssSize: number;
  htmlSize: number;
  totalSize: number;
  status: "good" | "warning" | "large";
  message: string;
}

const KB = 1024;
const MB = 1024 * 1024;

const THRESHOLDS = {
  js: {
    good: 300 * KB,
    warning: 500 * KB,
    large: 1 * MB,
  },
  css: {
    warning: 100 * KB,
  },
  total: {
    warning: 500 * KB,
    large: 1 * MB,
  },
};

export function analyzeBundleSize(files: ExportedFile[]): BundleSizeAnalysis {
  const jsFile = files.find((f) => f.relativePath.endsWith(".js"));
  const cssFile = files.find((f) => f.relativePath.endsWith(".css"));
  const htmlFile = files.find((f) => f.relativePath.endsWith(".html"));

  const jsSize = jsFile?.size ?? 0;
  const cssSize = cssFile?.size ?? 0;
  const htmlSize = htmlFile?.size ?? 0;
  const totalSize = jsSize + cssSize + htmlSize;

  let status: BundleSizeAnalysis["status"] = "good";
  let message = "";

  if (jsSize > THRESHOLDS.js.large) {
    status = "large";
    message = `Bundle is ${formatSize(jsSize)} - this will load slowly, especially on mobile. Consider code splitting or removing unused dependencies.`;
  } else if (jsSize > THRESHOLDS.js.warning) {
    status = "warning";
    message = `Bundle is ${formatSize(jsSize)} - may load slowly on slower connections. Consider lazy loading non-critical code.`;
  } else if (totalSize > THRESHOLDS.total.large) {
    status = "large";
    message = `Total size is ${formatSize(totalSize)} - consider optimizing assets.`;
  } else if (totalSize > THRESHOLDS.total.warning) {
    status = "warning";
    message = `Total size is ${formatSize(totalSize)} - good, but watch for growth.`;
  } else {
    message = `Bundle size looks good (${formatSize(totalSize)} total)`;
  }

  return {
    jsSize,
    cssSize,
    htmlSize,
    totalSize,
    status,
    message,
  };
}

export function validateManifest(
  manifest: ChatGPTAppManifest,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  if (!manifest.name || manifest.name.trim() === "") {
    errors.push("Manifest missing required field: name");
  }

  if (!manifest.description || manifest.description.trim() === "") {
    warnings.push("Manifest missing recommended field: description");
  }

  if (!manifest.version) {
    info.push("Consider adding a version to your manifest");
  }

  if (manifest.widget?.url) {
    const url = manifest.widget.url;
    if (url.includes("YOUR_DEPLOYED_URL") || url.includes("localhost")) {
      warnings.push("Widget URL is a placeholder - update before deploying");
    } else if (!url.startsWith("https://")) {
      warnings.push("Widget URL should use HTTPS for production");
    }
  } else {
    errors.push("Manifest missing widget URL");
  }

  if (manifest.icon && !manifest.icon.startsWith("https://")) {
    warnings.push("Icon URL should use HTTPS");
  }

  if (manifest.tools && manifest.tools.length > 0) {
    for (const tool of manifest.tools) {
      if (!tool.description) {
        warnings.push(`Tool "${tool.name}" is missing a description`);
      }
    }
  }

  return { errors, warnings, info };
}

export function formatSize(bytes: number): string {
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)}MB`;
  }
  if (bytes >= KB) {
    return `${(bytes / KB).toFixed(0)}KB`;
  }
  return `${bytes}B`;
}

export function formatSizeWithStatus(
  bytes: number,
  thresholds?: { warning?: number; large?: number },
): string {
  const size = formatSize(bytes);
  if (!thresholds) return size;

  if (thresholds.large && bytes > thresholds.large) {
    return `${size} (too large)`;
  }
  if (thresholds.warning && bytes > thresholds.warning) {
    return `${size} (consider optimizing)`;
  }
  return size;
}

export interface ExportSummary {
  success: boolean;
  bundleAnalysis: BundleSizeAnalysis;
  manifestValidation: ValidationResult;
  files: Array<{ name: string; size: string }>;
  nextSteps: string[];
}

export function generateExportSummary(
  files: ExportedFile[],
  manifest: ChatGPTAppManifest,
  includesServer: boolean,
): ExportSummary {
  const bundleAnalysis = analyzeBundleSize(files);
  const manifestValidation = validateManifest(manifest);

  const hasErrors = manifestValidation.errors.length > 0;
  const success = !hasErrors;

  const nextSteps: string[] = [];

  if (manifestValidation.warnings.some((w) => w.includes("placeholder"))) {
    nextSteps.push(
      "Deploy widget/ folder to a static host (Vercel, Netlify, etc.)",
    );
    nextSteps.push("Update manifest.json with your deployed widget URL");
  } else {
    nextSteps.push("Your manifest looks ready for deployment");
  }

  if (includesServer) {
    nextSteps.push("Deploy server/ folder to a serverless host");
    nextSteps.push(
      "Configure your MCP server URL in the ChatGPT Apps dashboard",
    );
  }

  nextSteps.push("Register your app at: https://platform.openai.com/apps");

  const fileList = files
    .filter((f) => !f.relativePath.startsWith("server/"))
    .map((f) => ({
      name: f.relativePath,
      size: formatSize(f.size),
    }));

  return {
    success,
    bundleAnalysis,
    manifestValidation,
    files: fileList,
    nextSteps,
  };
}

export function printExportSummary(summary: ExportSummary): void {
  console.log(`\n${"─".repeat(50)}`);
  console.log("📊 Export Summary");
  console.log("─".repeat(50));

  const statusIcon =
    summary.bundleAnalysis.status === "good"
      ? "✅"
      : summary.bundleAnalysis.status === "warning"
        ? "⚠️"
        : "🔴";
  console.log(`\n${statusIcon} Bundle: ${summary.bundleAnalysis.message}`);

  console.log("\n📁 Files:");
  for (const file of summary.files) {
    console.log(`   ${file.name.padEnd(25)} ${file.size.padStart(8)}`);
  }

  if (summary.manifestValidation.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const error of summary.manifestValidation.errors) {
      console.log(`   ${error}`);
    }
  }

  if (summary.manifestValidation.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    for (const warning of summary.manifestValidation.warnings) {
      console.log(`   ${warning}`);
    }
  }

  if (summary.manifestValidation.info.length > 0) {
    console.log("\n💡 Suggestions:");
    for (const info of summary.manifestValidation.info) {
      console.log(`   ${info}`);
    }
  }

  console.log("\n📋 Next Steps:");
  summary.nextSteps.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step}`);
  });

  console.log(`\n${"─".repeat(50)}`);
}

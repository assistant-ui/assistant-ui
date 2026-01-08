#!/usr/bin/env tsx
import {
  exportWidget,
  createDefaultExportConfig,
  generateExportSummary,
  printExportSummary,
} from "../lib/export";
import type { ExportConfig } from "../lib/export";

interface ExportArgs {
  entryPoint: string;
  exportName: string;
  name: string;
  outputDir: string;
  inline: boolean;
}

function parseArgs(): ExportArgs {
  const args = process.argv.slice(2);
  const parsed: ExportArgs = {
    entryPoint: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
    name: "My ChatGPT App",
    outputDir: "export",
    inline: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "--entry":
      case "-e":
        if (next) parsed.entryPoint = next;
        i++;
        break;
      case "--export-name":
        if (next) parsed.exportName = next;
        i++;
        break;
      case "--name":
      case "-n":
        if (next) parsed.name = next;
        i++;
        break;
      case "--output":
      case "-o":
        if (next) parsed.outputDir = next;
        i++;
        break;
      case "--inline":
        parsed.inline = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
Usage: tsx scripts/export.ts [options]

Options:
  -e, --entry <path>      Widget entry point (default: lib/workbench/wrappers/poi-map-sdk.tsx)
  --export-name <name>    Export name from entry file (default: POIMapSDK)
  -n, --name <name>       Widget name for manifest (default: My ChatGPT App)
  -o, --output <dir>      Output directory (default: export)
  --inline                Inline JS/CSS into HTML
  -h, --help              Show this help message

Examples:
  tsx scripts/export.ts
  tsx scripts/export.ts --name "My Widget" --output dist
  tsx scripts/export.ts -e src/widgets/custom.tsx --export-name CustomWidget
`);
}

async function main() {
  const args = parseArgs();

  console.log("\n🚀 ChatGPT App Export\n");
  console.log(`   Entry: ${args.entryPoint}`);
  console.log(`   Export: ${args.exportName}`);
  console.log(`   Name: ${args.name}`);
  console.log(`   Output: ${args.outputDir}`);
  console.log("");

  const config: ExportConfig = {
    ...createDefaultExportConfig(args.entryPoint, args.name),
    widget: {
      entryPoint: args.entryPoint,
      exportName: args.exportName,
      name: args.name,
    },
    output: {
      dir: args.outputDir,
      inline: args.inline,
    },
  };

  const result = await exportWidget({
    config,
    projectRoot: process.cwd(),
  });

  if (!result.success) {
    console.error("\n❌ Export failed:\n");
    for (const error of result.errors) {
      console.error(`   ${error}`);
    }
    process.exit(1);
  }

  if (result.manifest) {
    const summary = generateExportSummary(result.files, result.manifest, false);
    printExportSummary(summary);

    if (summary.manifestValidation.errors.length > 0) {
      process.exit(1);
    }
  } else {
    console.log("\n📁 Generated files:");
    for (const file of result.files) {
      const sizeKb = (file.size / 1024).toFixed(1);
      console.log(`   ${file.relativePath} (${sizeKb} KB)`);
    }
  }

  console.log("\n✨ Done!\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

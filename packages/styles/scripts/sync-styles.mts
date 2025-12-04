#!/usr/bin/env tsx

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const MONO_ROOT = path.resolve(PKG_ROOT, "..", "..");

const REGISTRY_DIR = path.join(
  MONO_ROOT,
  "apps",
  "registry",
  "components",
  "assistant-ui",
);
const OUTPUT_FILE = path.join(PKG_ROOT, "src", "styles", "generated.css");

// Base aui-* class names to skip entirely
const SKIPPED_AUI_BASES = new Set(["aui-md", "aui-sr-only"]);

// Tokens to filter out from @apply rules
const SKIPPED_APPLY_TOKENS = [
  /^group(\/[a-zA-Z0-9_-]+)?$/, // group markers (e.g., group/trigger)
  /^aui-/, // aui-* classes (they're not utilities)
];

function filterSkippedTokens(utilities: string): string {
  return utilities
    .split(/\s+/)
    .filter((token) => !SKIPPED_APPLY_TOKENS.some((p) => p.test(token)))
    .join(" ");
}

interface AuiClass {
  name: string;
  twStrings: string[];
}

class SyncStyles {
  private dryRun: boolean;
  private classes = new Map<string, AuiClass>();

  constructor(options: { dryRun?: boolean }) {
    this.dryRun = options.dryRun || false;
  }

  async run() {
    console.log(chalk.cyan("🔄 Syncing styles from registry components...\n"));

    await this.parseRegistryComponents();
    await this.generateOutput();

    console.log(chalk.cyan("\n📊 Sync Summary:"));
    console.log(chalk.gray(`  • Total aui-* classes: ${this.classes.size}`));
    console.log(
      chalk.gray(`  • Ignored: ${Array.from(SKIPPED_AUI_BASES).join(", ")}`),
    );

    if (this.dryRun) {
      console.log(chalk.blue("\n✨ Dry run complete - no files were modified"));
    } else {
      console.log(chalk.green("\n✨ Sync complete!"));
    }
  }

  private async parseRegistryComponents() {
    console.log(chalk.gray("📖 Parsing registry components..."));

    const files = (await fs.readdir(REGISTRY_DIR))
      .filter((f) => f.endsWith(".tsx"))
      .sort();

    for (const file of files) {
      const content = await fs.readFile(path.join(REGISTRY_DIR, file), "utf-8");
      this.extractAuiClasses(content);
    }

    console.log(
      chalk.green(
        `✓ Parsed ${files.length} components, found ${this.classes.size} classes\n`,
      ),
    );
  }

  private extractAuiClasses(content: string) {
    const classNameMatches = content.matchAll(
      /className=(?:"([^"]*)"|{([^}]*)})/gs,
    );

    let currentAuiClass: string | null = null;

    for (const match of classNameMatches) {
      const plainString = match[1];
      const expression = match[2];

      let stringLiterals: string[] = [];

      if (plainString) {
        stringLiterals = [plainString];
      } else if (expression) {
        const strings = expression.matchAll(/["'`]([^"'`]+)["'`]/g);
        stringLiterals = Array.from(strings, (m) => m[1]).filter(
          (s): s is string => s !== undefined,
        );
      }

      for (const str of stringLiterals) {
        const tokens = str
          .trim()
          .split(/\s+/)
          .filter((t) => t.length > 0);
        const auiToken = tokens.find(
          (t) => t.startsWith("aui-") && !SKIPPED_AUI_BASES.has(t),
        );

        if (auiToken) {
          currentAuiClass = auiToken;
          const utilities = tokens
            .filter((t) => !t.startsWith("aui-"))
            .join(" ");

          if (!this.classes.has(currentAuiClass)) {
            this.classes.set(currentAuiClass, {
              name: currentAuiClass,
              twStrings: [],
            });
          }

          if (utilities.trim()) {
            this.classes.get(currentAuiClass)!.twStrings.push(utilities);
          }
        } else if (currentAuiClass && tokens.length > 0) {
          this.classes.get(currentAuiClass)!.twStrings.push(str.trim());
        }
      }
    }
  }

  private async generateOutput() {
    const lines: string[] = [
      "/* Auto-generated from registry components - DO NOT EDIT */",
      "",
    ];

    // Sort classes alphabetically for consistent output
    const sortedClasses = Array.from(this.classes.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const cls of sortedClasses) {
      lines.push(`.${cls.name} {`);
      for (const line of cls.twStrings) {
        const filtered = filterSkippedTokens(line);
        if (filtered.trim()) {
          lines.push(`  @apply ${filtered};`);
        }
      }
      lines.push(`}`);
      lines.push(``);
    }

    const output = lines.join("\n");

    if (this.dryRun) {
      console.log(chalk.blue("📄 Would generate index.css:"));
      console.log(chalk.gray("─".repeat(50)));
      console.log(`${output.slice(0, 2000)}\n... (truncated)`);
      console.log(chalk.gray("─".repeat(50)));
    } else {
      await fs.writeFile(OUTPUT_FILE, output, "utf-8");
      console.log(chalk.green(`✅ Generated ${OUTPUT_FILE}`));
    }
  }
}

const program = new Command();

program
  .name("sync-styles")
  .description("Generate styles from registry components")
  .option("--dry-run", "Preview changes without writing files")
  .action(async (options) => {
    const syncer = new SyncStyles(options);
    await syncer.run();
  });

program.parse();

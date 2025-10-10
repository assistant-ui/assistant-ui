#!/usr/bin/env tsx

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

// Resolve paths relative to this script's location to avoid CWD issues
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, ".."); // packages/styles
const MONO_ROOT = path.resolve(PKG_ROOT, "..", "..");

const REGISTRY_DIR = path.join(
  MONO_ROOT,
  "apps",
  "registry",
  "components",
  "assistant-ui",
);
const STYLES_DIR = path.join(PKG_ROOT, "src", "styles", "tailwindcss");

// Base aui-* class names to skip entirely (not their dashed variants)
const SKIPPED_AUI_BASES = new Set(["aui-root", "aui-md", "aui-sr-only"]);

interface AuiClass {
  name: string;
  tailwindClasses: string;
  twStrings: string[]; // Array of strings for multiple @apply lines
  component: string;
}

interface CssClass {
  name: string;
  tailwindClasses: string;
  twStrings: string[]; // Array of @apply line contents
  startLine: number;
  endLine: number;
}

class SyncStyles {
  private dryRun: boolean = false;
  private showUnused: boolean = false;
  // Map of aui-* class name to which CSS file it's in
  private classLocationMap = new Map<string, string>();
  // Map of CSS file to its parsed classes
  private existingCssClasses = new Map<string, CssClass[]>();
  // Map of component file to its extracted aui classes
  private componentClasses = new Map<string, AuiClass[]>();
  // Map of CSS file to unused classes in that file
  private unusedClasses = new Map<string, string[]>();

  constructor(options: { dryRun?: boolean; showUnused?: boolean }) {
    this.dryRun = options.dryRun || false;
    this.showUnused = options.showUnused || false;
  }

  async run() {
    console.log(chalk.cyan("🔄 Syncing styles from registry components...\n"));

    // Step 1: Parse existing CSS files to know where each class currently lives
    await this.parseExistingCss();

    // Step 2: Parse all registry components
    await this.parseRegistryComponents();

    // Step 3: Sync styles
    await this.syncStyles();

    // Step 4: Report results
    this.reportResults();
  }

  private async parseExistingCss() {
    console.log(chalk.gray("📖 Parsing existing CSS files..."));

    const cssFiles = (await fs.readdir(STYLES_DIR))
      .filter((f) => f.endsWith(".css"))
      .sort();

    for (const file of cssFiles) {
      const filePath = path.join(STYLES_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");
      const classes = this.parseCssFile(content);

      this.existingCssClasses.set(file, classes);

      // Build the location map
      for (const cssClass of classes) {
        this.classLocationMap.set(cssClass.name, file);
      }
    }

    console.log(chalk.green(`✓ Parsed ${cssFiles.length} CSS files\n`));
  }

  private parseCssFile(content: string): CssClass[] {
    const classes: CssClass[] = [];
    const lines = content.split("\n");
    const multipleApplyWarnings: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match .aui-* class definitions (skip base classes in SKIPPED_AUI_BASES)
      const classMatch = line.match(/^\.(aui-[a-z0-9-]+)\s*\{/);
      if (classMatch) {
        const className = classMatch[1];

        // Skip exact base class names only
        if (SKIPPED_AUI_BASES.has(className)) {
          continue;
        }

        // Find ALL @apply lines and collect their classes
        const tailwindClassesList: string[] = [];
        let endLine = i;
        let applyCount = 0;

        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];

          if (nextLine.includes("@apply")) {
            applyCount++;
            // Extract classes from @apply directive
            const applyMatch = nextLine.match(/@apply\s+([^;]+);?/);
            if (applyMatch) {
              tailwindClassesList.push(applyMatch[1].trim());
            }
          }

          if (nextLine.includes("}")) {
            endLine = j;
            break;
          }
        }

        // If multiple @apply directives found, add warning
        if (applyCount > 1) {
          multipleApplyWarnings.push(className);
        }

        // Concatenate all tailwind classes from multiple @apply directives
        const tailwindClasses = tailwindClassesList.join(" ");

        classes.push({
          name: className,
          tailwindClasses,
          twStrings: tailwindClassesList, // Store as array
          startLine: i,
          endLine,
        });
      }
    }

    // Display warnings for multiple @apply directives
    if (multipleApplyWarnings.length > 0) {
      console.log(
        chalk.yellow(`⚠️  Found classes with multiple @apply directives:`),
      );
      for (const className of multipleApplyWarnings) {
        console.log(chalk.yellow(`    • ${className}`));
      }
      console.log();
    }

    return classes;
  }

  private async parseRegistryComponents() {
    console.log(chalk.gray("📖 Parsing registry components..."));

    const componentFiles = (await fs.readdir(REGISTRY_DIR))
      .filter((f) => f.endsWith(".tsx"))
      .sort();

    for (const file of componentFiles) {
      const filePath = path.join(REGISTRY_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");

      // Extract all aui-* classes from the file content using regex
      const auiClasses = this.extractAuiClassesFromContent(content, file);

      if (auiClasses.length > 0) {
        this.componentClasses.set(file, auiClasses);
      }
    }

    console.log(chalk.green(`✓ Parsed ${componentFiles.length} components\n`));
  }

  private extractAuiClassesFromContent(
    content: string,
    componentFile: string,
  ): AuiClass[] {
    const auiClassesMap = new Map<string, string[]>(); // class name -> array of apply lines

    // Find all className attributes: className="..." or className={...}
    const classNameMatches = content.matchAll(
      /className=(?:"([^"]*)"|{([^}]*)})/gs,
    );

    for (const match of classNameMatches) {
      const plainString = match[1]; // Direct string: className="..."
      const expression = match[2]; // Expression: className={...}

      let stringLiterals: string[] = [];

      if (plainString) {
        // Plain string className
        stringLiterals = [plainString];
      } else if (expression) {
        // Extract all string literals from expression (skip variables/conditionals)
        // Matches: "...", '...', `...` but not template expressions
        const strings = expression.matchAll(/["'`]([^"'`]+)["'`]/g);
        stringLiterals = Array.from(strings, (m) => m[1]);
      }

      // Process string literals to find aui-* classes
      this.extractAuiClassesFromStrings(stringLiterals, auiClassesMap);
    }

    // Convert map to array
    const auiClasses: AuiClass[] = [];
    for (const [name, twStrings] of auiClassesMap) {
      // Filter out empty lines
      const filteredLines = twStrings.filter((line) => line.trim().length > 0);
      if (filteredLines.length > 0) {
        auiClasses.push({
          name,
          tailwindClasses: filteredLines.join(" "),
          twStrings: filteredLines,
          component: componentFile,
        });
      }
    }

    return auiClasses;
  }

  private extractAuiClassesFromStrings(
    stringLiterals: string[],
    auiClassesMap: Map<string, string[]>,
  ): void {
    let currentAuiClass: string | null = null;

    for (const str of stringLiterals) {
      const tokens = str
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      // Check if this string contains an aui-* class
      const auiClassToken = tokens.find(
        (t) => t.startsWith("aui-") && !SKIPPED_AUI_BASES.has(t),
      );

      if (auiClassToken) {
        // Found an aui-* class - this becomes our current class
        currentAuiClass = auiClassToken;

        // Extract utilities from this string (everything except aui-* classes)
        const utilities = tokens.filter((t) => !t.startsWith("aui-")).join(" ");

        if (!auiClassesMap.has(currentAuiClass)) {
          auiClassesMap.set(currentAuiClass, []);
        }

        if (utilities.trim()) {
          auiClassesMap.get(currentAuiClass)!.push(utilities);
        }
      } else if (currentAuiClass && tokens.length > 0) {
        // No aui-* class, but we have a current class - add as additional apply line
        auiClassesMap.get(currentAuiClass)!.push(str.trim());
      }
    }
  }

  private async syncStyles() {
    console.log(chalk.cyan("🔄 Syncing styles...\n"));

    // Group components by their target CSS file
    const componentToCssFile = new Map<string, string>();

    // For each component, determine which CSS file it should update
    for (const [componentFile, classes] of this.componentClasses) {
      // Find ANY aui-* class from this component that already exists in CSS
      let targetCssFile: string | undefined;

      for (const auiClass of classes) {
        const existingLocation = this.classLocationMap.get(auiClass.name);
        if (existingLocation) {
          targetCssFile = existingLocation;
          break; // Found one, that's where ALL classes from this component go
        }
      }

      // If no existing class found, prompt user to choose (or skip in dry-run)
      if (!targetCssFile) {
        console.log(
          chalk.yellow(
            `\n⚠️  Cannot determine target CSS file for ${componentFile}`,
          ),
        );
        console.log(
          chalk.yellow(
            `   Classes found: ${classes.map((c) => c.name).join(", ")}`,
          ),
        );

        // Get list of available CSS files
        const cssFiles = Array.from(this.existingCssClasses.keys()).sort();

        if (this.dryRun) {
          // In dry-run mode, skip prompting and just show what would be added
          console.log(
            chalk.blue(
              `\n   In non-dry-run mode, you will be prompted to select from:`,
            ),
          );
          cssFiles.forEach((file, index) => {
            console.log(chalk.blue(`     ${index + 1}. ${file}`));
          });
          console.log(chalk.blue(`\n   Classes that would be added:\n`));

          // Show ALL classes completely (no truncation)
          for (const cls of classes) {
            console.log(chalk.gray(`     .${cls.name} {`));
            const twStrings = cls.twStrings || [cls.tailwindClasses];
            for (const line of twStrings) {
              if (line.trim()) {
                console.log(chalk.gray(`       @apply ${line};`));
              }
            }
            console.log(chalk.gray(`     }`));
          }
          console.log();

          // Skip this component in dry-run mode
          continue;
        }

        console.log(chalk.cyan(`\n   Available CSS files:`));
        cssFiles.forEach((file, index) => {
          console.log(chalk.cyan(`   ${index + 1}. ${file}`));
        });

        const rl = readline.createInterface({ input, output });

        let choice: number;
        do {
          const answer = await rl.question(
            chalk.green(`   Select file (1-${cssFiles.length}): `),
          );
          choice = parseInt(answer);
        } while (isNaN(choice) || choice < 1 || choice > cssFiles.length);

        rl.close();

        targetCssFile = cssFiles[choice - 1];
        console.log(chalk.green(`   ✓ Will add to ${targetCssFile}\n`));
      }

      componentToCssFile.set(componentFile, targetCssFile);
    }

    // Now group all classes by their target CSS file
    const classesByCssFile = new Map<string, AuiClass[]>();

    for (const [componentFile, classes] of this.componentClasses) {
      const targetCssFile = componentToCssFile.get(componentFile);

      // Skip if no target file (can happen in dry-run mode)
      if (!targetCssFile) continue;

      const existing = classesByCssFile.get(targetCssFile) || [];
      classesByCssFile.set(targetCssFile, [...existing, ...classes]);
    }

    // Track all used classes
    const usedClasses = new Set<string>();
    for (const classes of this.componentClasses.values()) {
      for (const cls of classes) {
        usedClasses.add(cls.name);
      }
    }

    // Check for unused classes and group by CSS file
    for (const [className, cssFile] of this.classLocationMap) {
      // Skip base-components.css - these are for user codebases, not registry
      if (cssFile === "base-components.css") continue;

      if (!usedClasses.has(className)) {
        const existing = this.unusedClasses.get(cssFile) || [];
        existing.push(className);
        this.unusedClasses.set(cssFile, existing);
      }
    }

    // Update each CSS file
    for (const [cssFile, auiClasses] of classesByCssFile) {
      const existingClasses = this.existingCssClasses.get(cssFile) || [];
      const filePath = path.join(STYLES_DIR, cssFile);

      // Read the current file content
      let content = "";
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        // File doesn't exist, we'll create it
        content = "";
      }

      const lines = content.split("\n");
      const updates: Array<{
        action: "add" | "update" | "keep";
        class: AuiClass | CssClass;
      }> = [];
      const processedAuiClasses = new Set<string>();

      // Group aui classes by name and use the first occurrence
      const mergedAuiClasses = new Map<string, AuiClass>();
      for (const auiClass of auiClasses) {
        if (!mergedAuiClasses.has(auiClass.name)) {
          mergedAuiClasses.set(auiClass.name, auiClass);
        }
      }

      // Collect updates and additions
      const updatesToReport: string[] = [];
      const additionsToReport: string[] = [];

      // Check existing classes for updates
      for (const existingClass of existingClasses) {
        const auiClass = mergedAuiClasses.get(existingClass.name);

        if (auiClass) {
          processedAuiClasses.add(existingClass.name);

          // Compare twStrings arrays
          const existingLines = JSON.stringify(existingClass.twStrings);
          const newLines = JSON.stringify(auiClass.twStrings);

          // Only update if new classes are different AND not empty
          if (existingLines !== newLines && auiClass.twStrings.length > 0) {
            updates.push({
              action: "update",
              class: {
                ...existingClass,
                tailwindClasses: auiClass.tailwindClasses,
                twStrings: auiClass.twStrings,
              },
            });
            updatesToReport.push(existingClass.name);
          } else {
            updates.push({ action: "keep", class: existingClass });
          }
        } else {
          // Preserve classes not found in registry (they may be used elsewhere)
          updates.push({ action: "keep", class: existingClass });
        }
      }

      // Add new classes
      for (const [className, auiClass] of mergedAuiClasses) {
        if (!processedAuiClasses.has(className)) {
          updates.push({ action: "add", class: auiClass });
          additionsToReport.push(className);
        }
      }

      // Report updates and additions grouped by file
      if (updatesToReport.length > 0 || additionsToReport.length > 0) {
        console.log(chalk.cyan(`\n  ${cssFile}:`));

        for (const className of updatesToReport) {
          console.log(chalk.yellow(`    📝 Updating: ${className}`));
        }

        for (const className of additionsToReport) {
          console.log(chalk.green(`    ➕ Adding: ${className}`));
        }
      }

      // Generate updated content
      if (updates.some((u) => u.action !== "keep")) {
        const newContent = this.generateUpdatedCss(
          lines,
          existingClasses,
          updates,
        );

        if (this.dryRun) {
          console.log(chalk.blue(`\n📄 Would update ${cssFile}:`));
          console.log(chalk.gray("─".repeat(50)));

          // Show only the changes
          for (const update of updates) {
            if (update.action === "add") {
              console.log(chalk.green(`+ .${update.class.name} {`));
              const twStrings = update.class.twStrings || [
                update.class.tailwindClasses,
              ];
              for (const line of twStrings) {
                if (line.trim()) {
                  console.log(chalk.green(`+   @apply ${line};`));
                }
              }
              console.log(chalk.green(`+ }`));
            } else if (update.action === "update") {
              const existingClass = existingClasses.find(
                (c) => c.name === update.class.name,
              );
              if (existingClass) {
                console.log(chalk.red(`- .${update.class.name} {`));
                const existingLines = existingClass.twStrings || [
                  existingClass.tailwindClasses,
                ];
                for (const line of existingLines) {
                  if (line.trim()) {
                    console.log(chalk.red(`-   @apply ${line};`));
                  }
                }
                console.log(chalk.red(`- }`));
              }
              console.log(chalk.green(`+ .${update.class.name} {`));
              const newLines = update.class.twStrings || [
                update.class.tailwindClasses,
              ];
              for (const line of newLines) {
                if (line.trim()) {
                  console.log(chalk.green(`+   @apply ${line};`));
                }
              }
              console.log(chalk.green(`+ }`));
            }
          }

          console.log(chalk.gray("─".repeat(50)));
        } else {
          await fs.writeFile(filePath, newContent, "utf-8");
          console.log(chalk.green(`  ✅ Updated ${cssFile}`));
        }
      } else {
        console.log(chalk.gray(`  ✓ ${cssFile} is up to date`));
      }
    }
  }

  private generateUpdatedCss(
    lines: string[],
    existingClasses: CssClass[],
    updates: Array<{
      action: "add" | "update" | "keep";
      class: AuiClass | CssClass;
    }>,
  ): string {
    const result: string[] = [];
    let lastProcessedLine = -1;

    // Process existing classes
    for (const existingClass of existingClasses) {
      const update = updates.find((u) => u.class.name === existingClass.name);

      // Add any lines before this class
      for (let i = lastProcessedLine + 1; i < existingClass.startLine; i++) {
        result.push(lines[i]);
      }

      if (update) {
        if (update.action === "update") {
          // Replace with updated definition using multiple @apply lines
          result.push(`.${existingClass.name} {`);

          // Use twStrings if available, otherwise fall back to single line
          const twStrings = update.class.twStrings || [
            update.class.tailwindClasses,
          ];
          for (const line of twStrings) {
            if (line.trim()) {
              // Skip empty lines
              result.push(`  @apply ${line};`);
            }
          }

          result.push(`}`);
        } else if (update.action === "keep") {
          // Keep existing definition
          for (
            let i = existingClass.startLine;
            i <= existingClass.endLine;
            i++
          ) {
            result.push(lines[i]);
          }
        }
      }

      lastProcessedLine = existingClass.endLine;
    }

    // Add remaining lines
    for (let i = lastProcessedLine + 1; i < lines.length; i++) {
      result.push(lines[i]);
    }

    // Add new classes at the end
    const newClasses = updates.filter((u) => u.action === "add");
    if (newClasses.length > 0) {
      // Add a newline if file doesn't end with one
      if (result.length > 0 && result[result.length - 1] !== "") {
        result.push("");
      }

      result.push(`/* New classes from registry components */`);

      for (const { class: auiClass } of newClasses) {
        result.push("");
        result.push(`.${auiClass.name} {`);

        // Use twStrings if available, otherwise fall back to single line
        const twStrings = auiClass.twStrings || [auiClass.tailwindClasses];
        for (const line of twStrings) {
          if (line.trim()) {
            // Skip empty lines
            result.push(`  @apply ${line};`);
          }
        }

        result.push(`}`);
      }
    }

    return result.join("\n");
  }

  private reportResults() {
    console.log(chalk.cyan("\n📊 Sync Summary:"));

    let totalClasses = 0;
    for (const classes of this.componentClasses.values()) {
      totalClasses += classes.length;
    }

    console.log(chalk.gray(`  • Total aui-* classes found: ${totalClasses}`));
    console.log(
      chalk.gray(`  • Components processed: ${this.componentClasses.size}`),
    );
    console.log(
      chalk.gray(`  • CSS files processed: ${this.existingCssClasses.size}`),
    );
    console.log(
      chalk.gray(
        `  • Ignored base classes: ${Array.from(SKIPPED_AUI_BASES).join(", ")}`,
      ),
    );

    if (this.unusedClasses.size > 0) {
      console.log(
        chalk.yellow(
          `\n⚠️  Unused classes in styles package (not found in registry components):`,
        ),
      );

      if (this.showUnused) {
        // Verbose mode - show all classes
        for (const [cssFile, classes] of this.unusedClasses) {
          console.log(chalk.cyan(`\n  ${cssFile}:`));
          for (const className of classes) {
            console.log(chalk.yellow(`    • ${className}`));
          }
        }
      } else {
        // Concise mode - just show counts
        for (const [cssFile, classes] of this.unusedClasses) {
          console.log(
            chalk.yellow(`  • ${classes.length} unused classes in ${cssFile}`),
          );
        }
        console.log(
          chalk.gray(`\n  Use --show-unused flag to see the full list`),
        );
      }

      console.log(
        chalk.gray(`\nThese may be used in user codebases or examples.`),
      );
    }

    if (this.dryRun) {
      console.log(chalk.blue("\n✨ Dry run complete - no files were modified"));
    } else {
      console.log(chalk.green("\n✨ Sync complete!"));
    }
  }
}

// CLI
const program = new Command();

program
  .name("sync-styles")
  .description("Sync styles from registry components to styles package")
  .option("--dry-run", "Preview changes without writing files")
  .option("--show-unused", "Show full list of unused classes")
  .action(async (options) => {
    const syncer = new SyncStyles(options);
    await syncer.run();
  });

program.parse();

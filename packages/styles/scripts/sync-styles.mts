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

const REGISTRY_DIR = path.join(MONO_ROOT, "apps", "registry", "components", "assistant-ui");
const STYLES_DIR = path.join(PKG_ROOT, "src", "styles", "tailwindcss");

// Base aui-* class names to skip entirely (not their dashed variants)
const SKIPPED_AUI_BASES = new Set(["aui-root", "aui-md", "aui-sr-only"]);

interface AuiClass {
  name: string;
  tailwindClasses: string;
  component: string;
}

interface CssClass {
  name: string;
  tailwindClasses: string;
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
    
    const cssFiles = (await fs.readdir(STYLES_DIR)).filter((f) => f.endsWith(".css")).sort();
    
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
          startLine: i,
          endLine,
        });
      }
    }
    
    // Display warnings for multiple @apply directives
    if (multipleApplyWarnings.length > 0) {
      console.log(chalk.yellow(`⚠️  Found classes with multiple @apply directives:`));
      for (const className of multipleApplyWarnings) {
        console.log(chalk.yellow(`    • ${className}`));
      }
      console.log();
    }
    
    return classes;
  }

  private async parseRegistryComponents() {
    console.log(chalk.gray("📖 Parsing registry components..."));
    
    const componentFiles = (await fs.readdir(REGISTRY_DIR)).filter((f) => f.endsWith(".tsx")).sort();
    
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

  private extractAuiClassesFromContent(content: string, componentFile: string): AuiClass[] {
    const auiClasses: AuiClass[] = [];
    const processedClasses = new Set<string>();
    
    // Find all strings that might contain classes
    // This matches strings in quotes (single, double, or backtick)
    const stringMatches = content.matchAll(/["'`]([^"'`]*aui-[^"'`]*?)["'`]/g);
    
    for (const match of stringMatches) {
      const stringContent = match[1];
      
      // Extract aui-* classes and their following Tailwind classes
      const classes = stringContent.split(/\s+/);
      
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        
        // Check if this is an aui-* class, excluding exact base skips
        if (cls.startsWith("aui-") && !SKIPPED_AUI_BASES.has(cls)) {
          // Skip if we've already processed this class
          if (processedClasses.has(cls)) continue;
          processedClasses.add(cls);
          
          // Collect all following classes until the next aui-* or end
          const tailwindClasses: string[] = [];
          
          for (let j = i + 1; j < classes.length; j++) {
            const nextCls = classes[j];
            if (nextCls.startsWith("aui-")) {
              break;
            }
            tailwindClasses.push(nextCls);
          }
          
          // Only add if there are actual Tailwind classes
          const twClasses = tailwindClasses.join(" ").trim();
          if (twClasses) {
            auiClasses.push({
              name: cls,
              tailwindClasses: twClasses,
              component: componentFile,
            });
          }
        }
      }
    }
    
    return auiClasses;
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
          break;  // Found one, that's where ALL classes from this component go
        }
      }
      
      // If no existing class found, prompt user to choose
      if (!targetCssFile) {
        console.log(chalk.yellow(`\n⚠️  Cannot determine target CSS file for ${componentFile}`));
        console.log(chalk.yellow(`   Classes found: ${classes.map(c => c.name).join(", ")}`));
        
        // Get list of available CSS files
        const cssFiles = Array.from(this.existingCssClasses.keys()).sort();
        console.log(chalk.cyan(`\n   Available CSS files:`));
        cssFiles.forEach((file, index) => {
          console.log(chalk.cyan(`   ${index + 1}. ${file}`));
        });
        
        const rl = readline.createInterface({ input, output });
        
        let choice: number;
        do {
          const answer = await rl.question(chalk.green(`   Select file (1-${cssFiles.length}): `));
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
      const targetCssFile = componentToCssFile.get(componentFile)!;
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
      const updates: Array<{ action: "add" | "update" | "keep", class: AuiClass | CssClass }> = [];
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

          // Compare tailwind classes
          const existingTw = existingClass.tailwindClasses.trim();
          const newTw = auiClass.tailwindClasses.trim();

          // Only update if new classes are different AND not empty
          if (existingTw !== newTw && newTw !== "") {
            updates.push({ action: "update", class: { ...existingClass, tailwindClasses: newTw } });
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
      if (updates.some(u => u.action !== "keep")) {
        const newContent = this.generateUpdatedCss(lines, existingClasses, updates);
        
        if (this.dryRun) {
          console.log(chalk.blue(`\n📄 Would update ${cssFile}:`));
          console.log(chalk.gray("─".repeat(50)));
          
          // Show only the changes
          for (const update of updates) {
            if (update.action === "add") {
              console.log(chalk.green(`+ .${update.class.name} {`));
              console.log(chalk.green(`+   @apply ${update.class.tailwindClasses};`));
              console.log(chalk.green(`+ }`));
            } else if (update.action === "update") {
              const existingClass = existingClasses.find(c => c.name === update.class.name);
              if (existingClass) {
                console.log(chalk.red(`- .${update.class.name} {`));
                console.log(chalk.red(`-   @apply ${existingClass.tailwindClasses};`));
                console.log(chalk.red(`- }`));
              }
              console.log(chalk.green(`+ .${update.class.name} {`));
              console.log(chalk.green(`+   @apply ${update.class.tailwindClasses};`));
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
    updates: Array<{ action: "add" | "update" | "keep", class: AuiClass | CssClass }>
  ): string {
    const result: string[] = [];
    let lastProcessedLine = -1;
    
    // Process existing classes
    for (const existingClass of existingClasses) {
      const update = updates.find(u => u.class.name === existingClass.name);
      
      // Add any lines before this class
      for (let i = lastProcessedLine + 1; i < existingClass.startLine; i++) {
        result.push(lines[i]);
      }
      
      if (update) {
        if (update.action === "update") {
          // Replace with updated definition
          result.push(`.${existingClass.name} {`);
          result.push(`  @apply ${update.class.tailwindClasses};`);
          result.push(`}`);
        } else if (update.action === "keep") {
          // Keep existing definition
          for (let i = existingClass.startLine; i <= existingClass.endLine; i++) {
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
    const newClasses = updates.filter(u => u.action === "add");
    if (newClasses.length > 0) {
      // Add a newline if file doesn't end with one
      if (result.length > 0 && result[result.length - 1] !== "") {
        result.push("");
      }
      
      result.push(`/* New classes from registry components */`);
      
      for (const { class: auiClass } of newClasses) {
        result.push("");
        result.push(`.${auiClass.name} {`);
        result.push(`  @apply ${auiClass.tailwindClasses};`);
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
    console.log(chalk.gray(`  • Components processed: ${this.componentClasses.size}`));
    console.log(chalk.gray(`  • CSS files processed: ${this.existingCssClasses.size}`));
    console.log(chalk.gray(`  • Ignored base classes: ${Array.from(SKIPPED_AUI_BASES).join(", ")}`));
    
    if (this.unusedClasses.size > 0) {
      console.log(chalk.yellow(`\n⚠️  Unused classes in styles package (not found in registry components):`));
      
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
          console.log(chalk.yellow(`  • ${classes.length} unused classes in ${cssFile}`));
        }
        console.log(chalk.gray(`\n  Use --show-unused flag to see the full list`));
      }
      
      console.log(chalk.gray(`\nThese may be used in user codebases or examples.`));
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

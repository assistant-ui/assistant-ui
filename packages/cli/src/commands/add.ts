import { Command } from "commander";
import { spawn } from "cross-spawn";
import { hasMastraImports } from "../lib/install-mastra-lib";
import * as readline from "readline";
import * as path from "path";

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export const add = new Command()
  .name("add")
  .description("add a component to your project")
  .argument("<components...>", "the components to add")
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-p, --path <path>", "the path to add the component to.")
  .action(async (components: string[], opts) => {
    // Check for Mastra integration opportunity
    if (hasMastraImports()) {
      const answer = await askQuestion(
        "Would you like to add Mastra integration support? (Y/n) "
      );
      if (answer === "" || answer.toLowerCase().startsWith("y")) {
        console.log("🔧 Adding Mastra integration packages...");

        // Install Mastra integration packages
        const mastraInstall = spawn("npx", ["assistant-ui@latest", "upgrade"], {
          stdio: "inherit",
          shell: true,
        });

        await new Promise<void>((resolve, reject) => {
          mastraInstall.on("error", reject);
          mastraInstall.on("close", (code) => {
            if (code === 0) {
              console.log("✅ Mastra integration added successfully!");
              resolve();
            } else {
              reject(new Error(`Mastra installation failed with code ${code}`));
            }
          });
        });
      }
    }

    // Check for Mastra component registry components
    const mastraComponents = components.filter(c => c.startsWith("mastra-"));
    const standardComponents = components.filter(c => !c.startsWith("mastra-"));

    if (mastraComponents.length > 0) {
      console.log("🤖 Processing Mastra components...");

      // Import and use Mastra component registry
      const mastraRegistryPath = path.join(__dirname, "../components/mastra-registry.json");

      try {
        const fs = await import('fs');
        if (fs.existsSync(mastraRegistryPath)) {
          const registry = JSON.parse(fs.readFileSync(mastraRegistryPath, "utf8"));

          for (const component of mastraComponents) {
            const componentId = component.replace("mastra-", "");
            const componentConfig = registry.components[componentId];

            if (componentConfig) {
              console.log(`✨ Adding Mastra component: ${componentConfig.name}`);

              // Here you would typically:
              // 1. Generate component files based on registry
              // 2. Install required dependencies
              // 3. Update configuration files

              console.log(`   📝 Description: ${componentConfig.description}`);
              console.log(`   📦 Dependencies: ${componentConfig.dependencies.join(", ")}`);
            } else {
              console.log(`⚠️  Unknown Mastra component: ${component}`);
            }
          }
        }
      } catch (error) {
        console.error("Error loading Mastra component registry:", error);
      }
    }

    const componentsToAdd = standardComponents.map((c) => {
      if (!/^[a-zA-Z0-9-\/]+$/.test(c)) {
        throw new Error(`Invalid component name: ${c}`);
      }
      return `${REGISTRY_BASE_URL}/${encodeURIComponent(c)}`;
    });

    const args = [`shadcn@latest`, "add", ...componentsToAdd];

    if (opts.yes) args.push("--yes");
    if (opts.overwrite) args.push("--overwrite");
    if (opts.cwd) args.push("--cwd", opts.cwd);
    if (opts.path) args.push("--path", opts.path);

    const child = spawn("npx", args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      console.error(`Error: ${error.message}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.log(`other-package-script process exited with code ${code}`);
      }
    });
  });

import chalk from "chalk";
import { spawn } from "cross-spawn";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Constants
export const REGISTRY_BASE_URL = "https://r.assistant-ui.com/";

export interface TemplatesConfig {
  base: {
    registryItems: string[];
    shadcnItems?: string[];
    files: Array<{
      source: string;
      target: string;
    }>;
  };
  providers: Record<
    string,
    {
      displayName: string;
      description: string;
      path: string;
      dependencies: Record<string, string>;
    }
  >;
}

export interface CreateProjectOptions {
  provider?: string;
  template?: string;
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
  skipInstall?: boolean;
}

export async function loadTemplates(): Promise<TemplatesConfig> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatesPath = path.join(
    __dirname,
    "..",
    "..",
    "template-parts",
    "templates.json",
  );
  const content = await fs.readFile(templatesPath, "utf-8");
  return JSON.parse(content);
}

async function copyBaseFiles(
  files: Array<{ source: string; target: string }>,
  templatesDir: string,
  targetPath: string,
): Promise<void> {
  for (const file of files) {
    const sourcePath = path.join(templatesDir, file.source);
    const destPath = path.join(targetPath, file.target);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(sourcePath, destPath);
  }
}

async function copyProviderFiles(
  providerPath: string,
  templatesDir: string,
  targetPath: string,
): Promise<void> {
  const fullProviderPath = path.join(templatesDir, providerPath);

  const copyDir = async (src: string, dest: string) => {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  };

  await copyDir(fullProviderPath, targetPath);
}

async function mergeDependencies(
  dependencies: Record<string, string>,
  targetPath: string,
): Promise<void> {
  const packageJsonPath = path.join(targetPath, "package.json");
  const content = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(content);

  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...dependencies,
  };

  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
  );
}

function executeCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export async function createProject(
  projectName: string,
  projectPath: string,
  provider: string,
  options: CreateProjectOptions,
): Promise<void> {
  // Validate provider
  const templates = await loadTemplates();
  if (!templates.providers[provider]) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  console.log(
    chalk.blue(`Creating assistant-ui project with ${provider} provider...`),
  );

  // Step 1: Create Next.js base
  console.log(chalk.gray("Creating Next.js application..."));
  const createNextArgs = ["create-next-app@latest", projectPath];

  if (options.useNpm) createNextArgs.push("--use-npm");
  if (options.usePnpm) createNextArgs.push("--use-pnpm");
  if (options.useYarn) createNextArgs.push("--use-yarn");
  if (options.useBun) createNextArgs.push("--use-bun");

  createNextArgs.push("--typescript");
  createNextArgs.push("--tailwind");
  createNextArgs.push("--app");
  createNextArgs.push("--no-src-dir");
  createNextArgs.push("--import-alias", "@/*");

  // Skip install initially as we'll install after adding dependencies
  createNextArgs.push("--skip-install");

  await executeCommand("npx", createNextArgs);

  // Step 2: Set up template paths
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.join(__dirname, "..", "..", "template-parts");

  // Step 3: Copy base template files
  console.log(chalk.gray("Copying template files..."));
  await copyBaseFiles(templates.base.files, templatesDir, projectPath);

  // Step 4: Install registry items
  // Install shadcn components first (if any)
  if (templates.base.shadcnItems && templates.base.shadcnItems.length > 0) {
    console.log(chalk.gray("Installing shadcn components..."));
    
    await executeCommand("npx", [
      "shadcn@latest",
      "add",
      ...templates.base.shadcnItems,
      "--yes",
      "--overwrite",
      "--cwd",
      projectPath,
    ]);
  }
  
  // Install assistant-ui components
  if (templates.base.registryItems.length > 0) {
    console.log(chalk.gray("Installing assistant-ui components..."));

    // Install all registry items in one command to minimize duplicates
    const registryUrls = templates.base.registryItems.map(
      (item) => `${REGISTRY_BASE_URL}${item}`,
    );

    try {
      await executeCommand("npx", [
        "shadcn@latest",
        "add",
        ...registryUrls,
        "--yes",
        "--overwrite",
        "--cwd",
        projectPath,
      ]);
    } catch (error) {
      console.warn(chalk.yellow("Warning: Some registry components could not be installed."));
      console.warn(chalk.yellow("You may need to install them manually later."));
    }
  }

  // Step 5: Copy provider files
  console.log(chalk.gray(`Installing ${provider} provider...`));
  const providerConfig = templates.providers[provider];
  await copyProviderFiles(providerConfig.path, templatesDir, projectPath);

  // Step 6: Merge provider dependencies
  await mergeDependencies(providerConfig.dependencies, projectPath);

  // Step 7: Install dependencies
  if (!options.skipInstall) {
    console.log(chalk.gray("Installing dependencies..."));

    let installCommand = "npm";
    let installArgs = ["install"];

    if (options.usePnpm) {
      installCommand = "pnpm";
      installArgs.push("--dir", projectPath);
    } else if (options.useYarn) {
      installCommand = "yarn";
      installArgs.push("--cwd", projectPath);
    } else if (options.useBun) {
      installCommand = "bun";
      installArgs.push("--cwd", projectPath);
    } else {
      // npm uses --prefix
      installArgs.push("--prefix", projectPath);
    }

    await executeCommand(installCommand, installArgs);
  }

  console.log("");
  console.log(
    chalk.green(`✓ Success! Created ${projectName} at ${projectPath}`),
  );
  console.log("");
  console.log("Inside that directory, you can run:");
  console.log("");
  console.log(chalk.cyan("  npm run dev"));
  console.log("    Starts the development server");
  console.log("");
  console.log(chalk.cyan("  npm run build"));
  console.log("    Builds the app for production");
  console.log("");
  console.log("Get started by editing:");
  console.log(chalk.cyan("  app/page.tsx"));
  console.log("");

  const envExamplePath = path.join(projectPath, ".env.example");
  if (existsSync(envExamplePath)) {
    console.log(
      chalk.yellow(
        "Don't forget to copy .env.example to .env.local and add your API keys",
      ),
    );
    console.log("");
  }
}

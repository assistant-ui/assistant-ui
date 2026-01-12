#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

interface CLIOptions {
  serverId?: string;
  bundle?: string;
  manifest?: string;
  registry?: string;
  dryRun?: boolean;
}

interface ManifestData {
  version: "1.0";
  serverId: string;
  serverName?: string;
  bundleUrl: string;
  bundleHash: string;
  components: Array<{
    name: string;
    toolNames: string[];
  }>;
  permissions?: {
    network?: boolean;
    storage?: boolean;
    clipboard?: boolean;
  };
}

function parseArgs(): { command: string; options: CLIOptions } {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";
  const options: CLIOptions = {
    registry: "https://registry.assistant-ui.com",
  };

  /**
   * Get the value for a flag, validating it's not another flag.
   * Returns undefined if the next arg is missing or is a flag.
   */
  function getFlagValue(flagName: string, next: string | undefined): string {
    if (next === undefined || next.startsWith("-")) {
      console.error(`Error: ${flagName} requires a value`);
      process.exit(1);
    }
    return next;
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "-s":
      case "--server-id":
        options.serverId = getFlagValue("--server-id", next);
        i++;
        break;
      case "-b":
      case "--bundle":
        options.bundle = getFlagValue("--bundle", next);
        i++;
        break;
      case "-m":
      case "--manifest":
        options.manifest = getFlagValue("--manifest", next);
        i++;
        break;
      case "--registry":
        options.registry = getFlagValue("--registry", next);
        i++;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
    }
  }

  return { command, options };
}

function printHelp(): void {
  console.log(`
@assistant-ui/tool-ui-server CLI

Commands:
  publish     Publish UI bundle to registry
  hash        Calculate bundle hash
  validate    Validate manifest file
  help        Show this help message

Options:
  -s, --server-id <id>     Server ID (required for publish)
  -b, --bundle <path>      Path to bundle file (required for publish)
  -m, --manifest <path>    Path to manifest file (required for publish)
  --registry <url>         Registry URL (default: https://registry.assistant-ui.com)
  --dry-run                Validate without publishing

Examples:
  npx @assistant-ui/tool-ui-server publish -s weather-mcp -b dist/bundle.js -m manifest.json
  npx @assistant-ui/tool-ui-server hash -b dist/bundle.js
  npx @assistant-ui/tool-ui-server validate -m manifest.json
`);
}

function calculateBundleHash(bundlePath: string): string {
  const absolutePath = resolve(process.cwd(), bundlePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Bundle file not found: ${absolutePath}`);
  }

  const bundleContent = readFileSync(absolutePath);
  const hash = createHash("sha256").update(bundleContent).digest("hex");
  return `sha256:${hash}`;
}

function validateManifest(manifestPath: string): ManifestData {
  const absolutePath = resolve(process.cwd(), manifestPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Manifest file not found: ${absolutePath}`);
  }

  const content = readFileSync(absolutePath, "utf-8");
  let manifest: ManifestData;

  try {
    manifest = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON in manifest file");
  }

  // Basic validation
  if (manifest.version !== "1.0") {
    throw new Error(`Unsupported manifest version: ${manifest.version}`);
  }

  if (!manifest.serverId || typeof manifest.serverId !== "string") {
    throw new Error("Missing or invalid serverId in manifest");
  }

  if (!manifest.bundleUrl || typeof manifest.bundleUrl !== "string") {
    throw new Error("Missing or invalid bundleUrl in manifest");
  }

  if (
    !manifest.bundleHash ||
    typeof manifest.bundleHash !== "string" ||
    !manifest.bundleHash.startsWith("sha256:")
  ) {
    throw new Error("Missing or invalid bundleHash in manifest");
  }

  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    throw new Error("Manifest must have at least one component");
  }

  for (const component of manifest.components) {
    if (!component.name || typeof component.name !== "string") {
      throw new Error("Component missing name");
    }
    if (
      !Array.isArray(component.toolNames) ||
      component.toolNames.length === 0
    ) {
      throw new Error(
        `Component ${component.name} must have at least one toolName`,
      );
    }
  }

  return manifest;
}

async function publishCommand(options: CLIOptions): Promise<void> {
  const { serverId, bundle, manifest, registry, dryRun } = options;

  if (!serverId) {
    console.error("Error: --server-id is required");
    process.exit(1);
  }

  if (!bundle) {
    console.error("Error: --bundle is required");
    process.exit(1);
  }

  if (!manifest) {
    console.error("Error: --manifest is required");
    process.exit(1);
  }

  console.log(`Publishing ${serverId}...`);

  // Calculate bundle hash
  const bundleHash = calculateBundleHash(bundle);
  console.log(`Bundle hash: ${bundleHash}`);

  // Validate manifest
  const manifestData = validateManifest(manifest);
  console.log(`Manifest valid: ${manifestData.components.length} component(s)`);

  // Verify hash matches
  if (manifestData.bundleHash !== bundleHash) {
    console.error(
      `Error: Bundle hash mismatch\n  Manifest: ${manifestData.bundleHash}\n  Actual:   ${bundleHash}`,
    );
    console.error("Update the bundleHash in your manifest file and try again.");
    process.exit(1);
  }

  // Verify server ID matches
  if (manifestData.serverId !== serverId) {
    console.error(
      `Error: Server ID mismatch\n  Option: ${serverId}\n  Manifest: ${manifestData.serverId}`,
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("\n[Dry run] Would publish:");
    console.log(`  Server ID: ${serverId}`);
    console.log(`  Bundle: ${bundle}`);
    console.log(
      `  Components: ${manifestData.components.map((c) => c.name).join(", ")}`,
    );
    console.log(`  Registry: ${registry}`);
    return;
  }

  // Read bundle for upload
  const bundleContent = readFileSync(resolve(process.cwd(), bundle));

  // Upload to registry
  try {
    const response = await fetch(`${registry}/v1/servers/${serverId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Auth token would be added from environment or config
        ...(process.env["ASSISTANT_UI_TOKEN"]
          ? { Authorization: `Bearer ${process.env["ASSISTANT_UI_TOKEN"]}` }
          : {}),
      },
      body: JSON.stringify({
        manifest: manifestData,
        bundle: bundleContent.toString("base64"),
        bundleHash,
      }),
    });

    if (response.ok) {
      console.log("\nPublished successfully!");
      console.log(
        `Bundle URL: https://${serverId}.auiusercontent.com/bundle.js`,
      );
      console.log(`Render URL: https://${serverId}.auiusercontent.com/render`);
    } else {
      const errorText = await response.text();
      console.error(
        `\nPublish failed: ${response.status} ${response.statusText}`,
      );
      console.error(errorText);
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "\nPublish failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.error("\nNote: The registry service may not be available yet.");
    console.error(
      "Use --dry-run to validate your bundle and manifest locally.",
    );
    process.exit(1);
  }
}

function hashCommand(options: CLIOptions): void {
  const { bundle } = options;

  if (!bundle) {
    console.error("Error: --bundle is required");
    process.exit(1);
  }

  try {
    const hash = calculateBundleHash(bundle);
    console.log(hash);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

function validateCommand(options: CLIOptions): void {
  const { manifest } = options;

  if (!manifest) {
    console.error("Error: --manifest is required");
    process.exit(1);
  }

  try {
    const manifestData = validateManifest(manifest);
    console.log("Manifest is valid!");
    console.log(`  Version: ${manifestData.version}`);
    console.log(`  Server ID: ${manifestData.serverId}`);
    console.log(`  Server Name: ${manifestData.serverName ?? "(not set)"}`);
    console.log(`  Bundle URL: ${manifestData.bundleUrl}`);
    console.log(`  Bundle Hash: ${manifestData.bundleHash}`);
    console.log(`  Components: ${manifestData.components.length}`);
    for (const component of manifestData.components) {
      console.log(`    - ${component.name}: ${component.toolNames.join(", ")}`);
    }
    console.log(`  Permissions:`);
    console.log(`    - network: ${manifestData.permissions?.network ?? false}`);
    console.log(`    - storage: ${manifestData.permissions?.storage ?? false}`);
    console.log(
      `    - clipboard: ${manifestData.permissions?.clipboard ?? false}`,
    );
  } catch (error) {
    console.error("Manifest validation failed:");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const { command, options } = parseArgs();

  switch (command) {
    case "publish":
      await publishCommand(options);
      break;
    case "hash":
      hashCommand(options);
      break;
    case "validate":
      validateCommand(options);
      break;
    case "-h":
    default:
      printHelp();
      break;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

import { Build } from "@assistant-ui/x-buildutils";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface BuildValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    bundleSize: number;
    fileCount: number;
    buildTime: number;
  };
}

async function validateProductionBuild(): Promise<BuildValidationResult> {
  const result: BuildValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    metrics: {
      bundleSize: 0,
      fileCount: 0,
      buildTime: 0,
    },
  };

  const startTime = Date.now();
  console.log("🔍 Validating production build...");

  try {
    // Build the package
    console.log("📦 Building package...");
    await Build.start().transpileTypescript();

    // Validate build output
    const distPath = join(process.cwd(), "dist");

    try {
      const files = readdirSync(distPath);
      result.metrics.fileCount = files.length;
      console.log(`📁 Found ${files.length} files in dist/`);

      // Check required files exist
      const requiredFiles = ["index.js", "index.d.ts"];
      const missingFiles = requiredFiles.filter(file => !files.includes(file));

      if (missingFiles.length > 0) {
        result.errors.push(`Missing required build files: ${missingFiles.join(", ")}`);
        result.success = false;
      }

      // Validate bundle sizes
      for (const file of files) {
        const filePath = join(distPath, file);
        const stats = statSync(filePath);

        if (stats.isFile() && file.endsWith('.js')) {
          const content = readFileSync(filePath, "utf-8");
          const sizeKB = content.length / 1024;

          if (file === 'index.js') {
            result.metrics.bundleSize = sizeKB;

            // Warn for large bundles
            if (sizeKB > 1000) {
              result.warnings.push(`Large main bundle: ${sizeKB.toFixed(2)}KB`);
            } else if (sizeKB > 500) {
              result.warnings.push(`Moderate bundle size: ${sizeKB.toFixed(2)}KB`);
            } else {
              console.log(`✅ Bundle size: ${sizeKB.toFixed(2)}KB`);
            }
          }

          // Error for extremely large files
          if (sizeKB > 5000) {
            result.errors.push(`Extremely large bundle: ${file} (${sizeKB.toFixed(2)}KB)`);
            result.success = false;
          }
        }
      }

      // Check for proper exports in package.json
      const packageJsonPath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

      if (!packageJson.exports) {
        result.warnings.push("No exports field in package.json");
      }

      if (!packageJson.main && !packageJson.exports?.["."]) {
        result.errors.push("No main export defined in package.json");
        result.success = false;
      }

      // Validate TypeScript declarations
      const dtsFiles = files.filter(file => file.endsWith('.d.ts'));
      if (dtsFiles.length === 0) {
        result.errors.push("No TypeScript declaration files found");
        result.success = false;
      } else {
        console.log(`✅ Found ${dtsFiles.length} TypeScript declaration files`);
      }

      // Check for common issues
      if (files.includes('index.js') && !files.includes('index.cjs')) {
        result.warnings.push("No CommonJS build found for compatibility");
      }

    } catch (distError) {
      result.errors.push(`Failed to validate dist/ directory: ${distError instanceof Error ? distError.message : 'Unknown error'}`);
      result.success = false;
    }

  } catch (buildError) {
    result.errors.push(`Build failed: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`);
    result.success = false;
  }

  result.metrics.buildTime = Date.now() - startTime;

  // Print results
  if (result.success) {
    console.log("✅ Production build validation passed!");
    console.log(`📊 Build metrics:`);
    console.log(`   - Bundle size: ${result.metrics.bundleSize.toFixed(2)}KB`);
    console.log(`   - File count: ${result.metrics.fileCount}`);
    console.log(`   - Build time: ${result.metrics.buildTime}ms`);
  } else {
    console.log("❌ Production build validation failed!");
    console.log(`🚨 Errors:`);
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️  Warnings:`);
    result.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  return result;
}

// Run validation if this file is executed directly
import { fileURLToPath } from "url";
import { resolve as resolvePath } from "path";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = resolvePath(process.argv[1] || "");

if (currentFilePath === scriptPath) {
  validateProductionBuild()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Validation script failed:", error);
      process.exit(1);
    });
}

export { validateProductionBuild };
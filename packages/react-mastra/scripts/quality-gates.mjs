import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const qualityChecks = [
  {
    name: "TypeScript Compilation",
    check: () => {
      execSync("pnpm build", { stdio: "pipe" });
      return true;
    },
  },
  {
    name: "All Tests Pass",
    check: () => {
      execSync("pnpm test", { stdio: "pipe" });
      return true;
    },
  },
  {
    name: "No TypeScript Errors",
    check: () => {
      execSync("pnpm typecheck", { stdio: "pipe" });
      return true;
    },
  },
  {
    name: "Linting Passes",
    check: () => {
      execSync("pnpm lint", { stdio: "pipe" });
      return true;
    },
  },
  {
    name: "Bundle Size Check",
    check: () => {
      const distPath = join(process.cwd(), "dist");
      if (!existsSync(distPath)) {
        console.log("No dist/ directory found");
        return false;
      }

      const indexPath = join(distPath, "index.js");
      if (!existsSync(indexPath)) {
        console.log("No index.js file found");
        return false;
      }

      const content = readFileSync(indexPath, "utf-8");
      const sizeKB = content.length / 1024;

      console.log(`Bundle size: ${sizeKB.toFixed(2)}KB`);

      // Check if bundle size is reasonable (less than 1MB)
      if (sizeKB > 1024) {
        console.log("Bundle too large (>1MB)");
        return false;
      }

      return true;
    },
  },
  {
    name: "Performance Tests Pass",
    check: () => {
      try {
        execSync("pnpm test:performance", { stdio: "pipe" });
        return true;
      } catch (error) {
        console.warn("Performance test issues detected:", error.message);
        return false;
      }
    },
  },
];

async function runQualityGates() {
  console.log("🚀 Running quality gates...");

  const results = {
    passed: [],
    failed: [],
    skipped: [],
  };

  for (const check of qualityChecks) {
    try {
      console.log(`\n🔍 Running: ${check.name}`);
      const startTime = Date.now();
      const passed = await check.check();
      const duration = Date.now() - startTime;

      if (passed) {
        console.log(`✅ ${check.name} (${duration}ms)`);
        results.passed.push({ name: check.name, duration });
      } else {
        console.log(`❌ ${check.name} (${duration}ms)`);
        results.failed.push({ name: check.name, duration });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(`💥 ${check.name} - Error: ${errorMessage}`);
      results.failed.push({ name: check.name, error: errorMessage });
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 QUALITY GATES SUMMARY");
  console.log("=".repeat(50));

  const totalPassed = results.passed.length;
  const totalFailed = results.failed.length;
  const totalChecks = totalPassed + totalFailed;

  console.log(`✅ Passed: ${totalPassed}/${totalChecks}`);
  console.log(`❌ Failed: ${totalFailed}/${totalChecks}`);

  if (totalPassed > 0) {
    console.log("\n🎉 PASSED CHECKS:");
    results.passed.forEach(check => {
      console.log(`   ✅ ${check.name} (${check.duration}ms)`);
    });
  }

  if (totalFailed > 0) {
    console.log("\n💥 FAILED CHECKS:");
    results.failed.forEach(check => {
      const duration = check.duration ? ` (${check.duration}ms)` : "";
      const error = check.error ? ` - ${check.error}` : "";
      console.log(`   ❌ ${check.name}${duration}${error}`);
    });

    console.log("\n🚨 QUALITY GATES FAILED!");
    console.log("Please fix the failing checks before proceeding with deployment.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL QUALITY GATES PASSED!");
    console.log("Ready for production deployment! 🚀");
  }
}

// Run quality gates if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQualityGates().catch((error) => {
    console.error("Quality gates script failed:", error);
    process.exit(1);
  });
}

export { runQualityGates };
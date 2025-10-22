#!/usr/bin/env tsx

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024), // MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
}

async function runTests() {
  console.log("Starting memory-monitored test run...\n");

  const initialMemory = await getMemoryUsage();
  console.log("Initial memory:", initialMemory);

  try {
    const { stdout, stderr } = await execAsync(
      'pnpm vitest run --config vitest.memory.config.ts',
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: "test",
          NODE_OPTIONS: "--max-old-space-size=4096 --expose-gc",
        },
      },
    );

    const finalMemory = await getMemoryUsage();

    console.log("\n" + stdout);
    if (stderr) console.error(stderr);

    console.log("\nFinal memory:", finalMemory);
    console.log("\nMemory delta:");
    console.log("  RSS:", finalMemory.rss - initialMemory.rss, "MB");
    console.log(
      "  Heap Used:",
      finalMemory.heapUsed - initialMemory.heapUsed,
      "MB",
    );

    // Note: Memory usage shown is for this wrapper script only, not the child vitest process
    // The child process runs with --max-old-space-size=4096
    const actualMemoryLimit = 4096; // MB - actual limit passed to vitest
    const warningThreshold = 2048; // MB - threshold for warnings

    console.log(
      `\n⚠️  Note: Memory metrics reflect wrapper process only, not child vitest process`,
    );
    console.log(`Vitest runs with ${actualMemoryLimit}MB heap limit`);
    console.log(`Warning threshold: ${warningThreshold}MB`);

    console.log("\n✅ Test execution completed successfully");
  } catch (error: any) {
    console.error("\n❌ Test execution failed:");
    console.error(error.message);

    if (error.message.includes("heap out of memory")) {
      console.error(
        "\n💡 This indicates a memory leak or insufficient memory.",
      );
      console.error("   - Check test cleanup in testSetup.ts");
      console.error("   - Consider increasing maxForks in vitest.config.ts");
      console.error(
        "   - Run with: pnpm test:memory to diagnose specific tests",
      );
    }

    process.exit(1);
  }
}

runTests();

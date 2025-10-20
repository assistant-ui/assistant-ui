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
      'NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" pnpm vitest run --config vitest.memory.config.ts',
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: "test",
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

    const memoryLimit = 2048; // MB
    const memoryUsagePercent = (finalMemory.heapUsed / memoryLimit) * 100;

    console.log(
      `\nMemory usage: ${finalMemory.heapUsed}MB / ${memoryLimit}MB (${memoryUsagePercent.toFixed(1)}%)`,
    );

    if (memoryUsagePercent > 80) {
      console.warn("\n⚠️  WARNING: Memory usage exceeds 80% of limit!");
      console.warn("Consider optimizing tests or increasing memory limit.");
    } else {
      console.log("\n✅ Memory usage is within acceptable limits");
    }
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

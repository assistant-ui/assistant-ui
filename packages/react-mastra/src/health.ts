export interface MastraHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  metrics: {
    memoryUsage: number;
    activeConnections: number;
    averageResponseTime: number;
    errorRate: number;
    messageCount: number;
    accumulatorUtilization: number;
  };
  details?: {
    [key: string]: any;
  };
}

export interface HealthCheckOptions {
  includeMemoryDetails?: boolean;
  checkConnections?: boolean;
  sampleSize?: number;
}

export const performHealthCheck = async (
  options: HealthCheckOptions = {},
): Promise<MastraHealthCheck> => {
  try {
    const {
      includeMemoryDetails = false,
      checkConnections = true,
      sampleSize = 100,
    } = options;
    const memoryUsage = process.memoryUsage();

    // Get basic memory metrics
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const externalMB = memoryUsage.external / 1024 / 1024;

    // Determine status based on memory usage
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (heapUsedMB > 500) {
      status = "unhealthy";
    } else if (heapUsedMB > 200) {
      status = "degraded";
    }

    // Simulate connection checks (in real implementation, these would be actual checks)
    let activeConnections = 0;
    let averageResponseTime = 0;
    let errorRate = 0;

    if (checkConnections) {
      // Simulate checking active Mastra connections
      // In a real implementation, this would check actual connection pools
      activeConnections = Math.floor(Math.random() * 10);

      // Simulate response time measurement
      const responseTimes = Array.from(
        { length: sampleSize },
        () => Math.random() * 100 + 10, // 10-110ms response times
      );
      averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      // Simulate error rate calculation
      errorRate = Math.random() * 0.05; // 0-5% error rate
    }

    // Create health check result
    const healthCheck: MastraHealthCheck = {
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        memoryUsage: heapUsedMB,
        activeConnections,
        averageResponseTime,
        errorRate,
        messageCount: 0, // This would be retrieved from actual runtime state
        accumulatorUtilization: 0, // This would be retrieved from actual accumulator
      },
    };

    // Add detailed information if requested
    if (includeMemoryDetails) {
      healthCheck.details = {
        memory: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          external: externalMB,
          rss: memoryUsage.rss / 1024 / 1024,
          arrayBuffers: memoryUsage.arrayBuffers / 1024 / 1024,
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
        },
      };
    }

    // Adjust status based on response time and error rate
    if (averageResponseTime > 1000 || errorRate > 0.1) {
      status = "unhealthy";
    } else if (averageResponseTime > 500 || errorRate > 0.05) {
      status = "degraded";
    }

    healthCheck.status = status;
    healthCheck.timestamp = new Date().toISOString();

    return healthCheck;
  } catch (error) {
    // Handle any errors during health check
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      metrics: {
        memoryUsage: 0,
        activeConnections: 0,
        averageResponseTime: 0,
        errorRate: 1,
        messageCount: 0,
        accumulatorUtilization: 0,
      },
      details: {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
};

export const checkHealthThresholds = (
  health: MastraHealthCheck,
): {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Memory checks
  if (health.metrics.memoryUsage > 200) {
    warnings.push(
      `High memory usage: ${health.metrics.memoryUsage.toFixed(2)}MB`,
    );
  }
  if (health.metrics.memoryUsage > 500) {
    errors.push(
      `Critical memory usage: ${health.metrics.memoryUsage.toFixed(2)}MB`,
    );
  }

  // Response time checks
  if (health.metrics.averageResponseTime > 500) {
    warnings.push(
      `Slow response time: ${health.metrics.averageResponseTime.toFixed(2)}ms`,
    );
  }
  if (health.metrics.averageResponseTime > 1000) {
    errors.push(
      `Critical response time: ${health.metrics.averageResponseTime.toFixed(2)}ms`,
    );
  }

  // Error rate checks
  if (health.metrics.errorRate > 0.05) {
    warnings.push(
      `High error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`,
    );
  }
  if (health.metrics.errorRate > 0.1) {
    errors.push(
      `Critical error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`,
    );
  }

  // Connection checks
  if (health.metrics.activeConnections > 50) {
    warnings.push(`High connection count: ${health.metrics.activeConnections}`);
  }

  const isHealthy = errors.length === 0 && health.status === "healthy";

  return { isHealthy, warnings, errors };
};

export const createHealthMonitor = () => {
  let lastHealthCheck: MastraHealthCheck | null = null;
  let checkCount = 0;
  let errorCount = 0;

  return {
    check: async (options?: HealthCheckOptions) => {
      try {
        const health = await performHealthCheck(options);
        lastHealthCheck = health;
        checkCount++;

        const thresholds = checkHealthThresholds(health);

        if (!thresholds.isHealthy) {
          errorCount++;
          console.error("Health check failed:", {
            health,
            warnings: thresholds.warnings,
            errors: thresholds.errors,
          });
        }

        return health;
      } catch (error) {
        errorCount++;
        console.error("Health check error:", error);

        return {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          metrics: {
            memoryUsage: 0,
            activeConnections: 0,
            averageResponseTime: 0,
            errorRate: 1,
            messageCount: 0,
            accumulatorUtilization: 0,
          },
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        };
      }
    },

    getLastCheck: () => lastHealthCheck,
    getStats: () => ({
      checkCount,
      errorCount,
      errorRate: checkCount > 0 ? errorCount / checkCount : 0,
    }),
  };
};

# Mastra Integration - Production Deployment Guide

## Overview

The `@assistant-ui/react-mastra` package provides production-ready integration with Mastra's AI agent framework. This guide covers deployment considerations, monitoring, and optimization for production environments.

## Prerequisites

- Node.js 18+ runtime environment
- Mastra server deployed and accessible
- Environment variables properly configured
- Production build validation completed

## Environment Configuration

### Required Environment Variables

```bash
# Mastra Configuration
MASTRA_API_URL=https://your-mastra-server.com
MASTRA_API_KEY=your-production-api-key

# Optional: Advanced Configuration
MASTRA_AGENT_ID=your-default-agent
MASTRA_TIMEOUT=30000
MASTRA_RETRY_ATTEMPTS=3

# Production Settings
NODE_ENV=production
LOG_LEVEL=warn
```

### Optional Environment Variables

```bash
# Memory Management
MASTRA_MAX_MESSAGES=1000
MASTRA_CLEANUP_INTERVAL=300000

# Monitoring
MASTRA_HEALTH_CHECK_ENABLED=true
MASTRA_METRICS_ENABLED=true

# Performance
MASTRA_STREAM_BUFFER_SIZE=8192
MASTRA_BATCH_SIZE=50
```

## Deployment Configuration

### Basic Setup

```typescript
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const config = {
  agentId: process.env.MASTRA_AGENT_ID || "default-agent",
  api: process.env.MASTRA_API_URL!,
  eventHandlers: {
    onError: (error) => {
      console.error("Mastra runtime error:", error);
      // Send to monitoring service
      trackError(error);
    },
    onMetadata: (metadata) => {
      // Track performance metrics
      trackMetadata(metadata);
    },
  },
  // Production-optimized settings
  maxRetries: parseInt(process.env.MASTRA_RETRY_ATTEMPTS || "3"),
  timeout: parseInt(process.env.MASTRA_TIMEOUT || "30000"),
};

const runtime = useMastraRuntime(config);
```

### Advanced Production Setup

```typescript
import {
  useMastraRuntime,
  performHealthCheck,
  createHealthMonitor,
} from "@assistant-ui/react-mastra";

// Health monitoring
const healthMonitor = createHealthMonitor();

// Periodic health checks
setInterval(async () => {
  const health = await performHealthCheck({
    includeMemoryDetails: true,
    checkConnections: true,
  });

  if (health.status === "unhealthy") {
    // Trigger alert or recovery procedures
    alertUnhealthy(health);
  }
}, 30000); // Check every 30 seconds

// Enhanced runtime with production features
const config = {
  agentId: "production-agent",
  api: process.env.MASTRA_API_URL!,

  // Error handling and recovery
  onError: (error, context) => {
    console.error(`[${context}] Mastra error:`, error);

    // Track error metrics
    trackError(error, {
      context,
      timestamp: new Date().toISOString(),
      agentId: config.agentId,
    });

    // Attempt recovery
    if (shouldRetry(error)) {
      scheduleRetry();
    }
  },

  // Performance monitoring
  eventHandlers: {
    onMetadata: (metadata) => {
      // Track performance metrics
      trackPerformance("mastra_metadata", metadata);
    },
    onToolCall: (toolCall) => {
      trackPerformance("mastra_tool_call", {
        tool: toolCall.name,
        arguments: toolCall.arguments,
      });
    },
  },

  // Memory management
  maxMessages: parseInt(process.env.MASTRA_MAX_MESSAGES || "1000"),
  cleanupInterval: parseInt(process.env.MASTRA_CLEANUP_INTERVAL || "300000"),
};

const runtime = useMastraRuntime(config);
```

## Performance Monitoring

### Health Checks

```typescript
import {
  performHealthCheck,
  checkHealthThresholds,
} from "@assistant-ui/react-mastra";

// Manual health check
const health = await performHealthCheck({
  includeMemoryDetails: true,
  checkConnections: true,
});

console.log("Health status:", health.status);
console.log("Memory usage:", health.metrics.memoryUsage, "MB");
console.log("Average response time:", health.metrics.averageResponseTime, "ms");

// Check thresholds
const { isHealthy, warnings, errors } = checkHealthThresholds(health);

if (!isHealthy) {
  console.error("Health issues detected:", { warnings, errors });
}
```

### Performance Metrics

```typescript
import { createHealthMonitor } from "@assistant-ui/react-mastra";

const monitor = createHealthMonitor();

// Get statistics
const stats = monitor.getStats();
console.log("Health check stats:", {
  totalChecks: stats.checkCount,
  errorCount: stats.errorCount,
  errorRate: `${(stats.errorRate * 100).toFixed(2)}%`,
});
```

## Memory Management

The Mastra integration includes automatic memory management to prevent memory leaks in long-running sessions:

- **Message Limits**: Automatically removes oldest messages when limit is reached
- **LRU Cleanup**: Maintains most recently used messages
- **Memory Monitoring**: Tracks memory usage and cleanup

```typescript
// Monitor accumulator memory usage
const accumulator = new MastraMessageAccumulator({
  maxMessages: 1000, // Customizable limit
});

const memoryUsage = accumulator.getMemoryUsage();
console.log("Accumulator memory:", memoryUsage);
// Output: { count: 850, maxCapacity: 1000, utilization: 0.85 }
```

## Error Handling and Recovery

### Network Errors

```typescript
const config = {
  // ... other config
  onError: (error, context) => {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      // Network error - implement retry logic
      implementRetryLogic(error, context);
    } else {
      // Application error - log and alert
      logApplicationError(error, context);
    }
  },
};
```

### Rate Limiting

```typescript
const config = {
  // ... other config
  rateLimiter: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    retryAfter: 5000, // 5 seconds
  },
};
```

## Security Considerations

### API Key Management

```typescript
// Never expose API keys in client-side code
const config = {
  api: process.env.MASTRA_API_URL, // Use proxy server if needed
  headers: {
    Authorization: `Bearer ${process.env.MASTRA_API_KEY}`,
  },
};
```

### Input Validation

```typescript
// Validate user inputs before sending to Mastra
const validateInput = (input: string): boolean => {
  // Remove potentially harmful content
  const sanitized = input.trim().slice(0, 10000);

  // Check for malicious patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /data:/i];

  return !dangerousPatterns.some((pattern) => pattern.test(sanitized));
};
```

## Troubleshooting

### Common Issues

#### 1. Memory Leaks

**Symptoms**: Memory usage increases over time
**Solution**:

- Ensure proper cleanup of message accumulators
- Check for event listener leaks
- Monitor `maxMessages` configuration

#### 2. Slow Response Times

**Symptoms**: Requests take longer than expected
**Solution**:

- Check Mastra server performance
- Implement response time monitoring
- Consider request batching

#### 3. Connection Issues

**Symptoms**: Intermittent connection failures
**Solution**:

- Implement retry logic with exponential backoff
- Check network configuration
- Monitor connection pool status

#### 4. Large Bundle Size

**Symptoms**: Slow initial page load
**Solution**:

- Use tree-shaking imports
- Lazy load advanced features
- Optimize dependencies

### Debug Mode

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === "development") {
  config.debug = true;
  config.logLevel = "debug";
}
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Production build completed and validated
- [ ] Health checks implemented and tested
- [ ] Error handling and recovery procedures in place
- [ ] Memory management configured
- [ ] Security measures implemented
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Rollback plan prepared

## Support and Maintenance

### Regular Tasks

1. **Weekly**: Review error logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Performance optimization and capacity planning

### Emergency Procedures

1. **Service Degradation**: Check health status and recent deployments
2. **High Error Rates**: Review error patterns and implement hotfixes
3. **Memory Issues**: Restart services and investigate memory leaks

## Additional Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Assistant-UI Documentation](https://assistant-ui.com/docs)
- [Performance Best Practices](https://assistant-ui.com/docs/performance)
- [Security Guidelines](https://assistant-ui.com/docs/security)

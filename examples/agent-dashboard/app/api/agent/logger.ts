/**
 * Server-side logging utility for the agent dashboard.
 * Provides structured logging with timestamps and log levels.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

class ServerLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });

    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";
    const prefix = this.getPrefix(entry.level);

    return `${timestamp} [${prefix}] [${entry.category}] ${entry.message}${dataStr}`;
  }

  private getConsoleColor(level: LogLevel): string {
    switch (level) {
      case "error":
        return "\x1b[31m";
      case "warn":
        return "\x1b[33m";
      case "debug":
        return "\x1b[36m";
      case "info":
      default:
        return "\x1b[32m";
    }
  }

  private getPrefix(level: LogLevel): string {
    return level.toUpperCase();
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      category,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    const formatted = this.formatLog(entry);
    const color = this.getConsoleColor(level);
    const reset = "\x1b[0m";

    if (this.isDevelopment) {
      console.log(`${color}${formatted}${reset}`);
    } else {
      console.log(formatted);
    }
  }

  info(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.log("info", category, message, data);
  }

  warn(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.log("warn", category, message, data);
  }

  error(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.log("error", category, message, data);
  }

  debug(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.log("debug", category, message, data);
  }
}

// Export singleton instance
export const logger = new ServerLogger();

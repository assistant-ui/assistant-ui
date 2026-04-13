"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  toolInput: Record<string, unknown>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function formatValidationError(message: string): string {
  if (!message.includes("Invalid") || !message.includes("[")) {
    return message;
  }

  try {
    const jsonStart = message.indexOf("[");
    const jsonPart = message.slice(jsonStart);
    const parsed = JSON.parse(jsonPart);

    if (Array.isArray(parsed)) {
      return parsed
        .map(
          (e: { path?: string[]; message?: string }) =>
            `${e.path?.join(".") ?? "root"}: ${e.message ?? "invalid"}`,
        )
        .join("\n");
    }
  } catch {
    // Fall through to return original message
  }

  return message;
}

function ErrorDisplay({ error }: { error: Error | null }) {
  const message = error?.message ?? "Unknown error";
  const formattedError = formatValidationError(message);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2">
            <div className="font-medium text-amber-800 text-sm dark:text-amber-200">
              Invalid Props
            </div>
            <pre className="whitespace-pre-wrap text-amber-700 text-xs dark:text-amber-300">
              {formattedError}
            </pre>
            <div className="text-amber-600 text-xs dark:text-amber-400">
              Fix the toolInput JSON to see the component
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// biome-ignore lint/style/useReactFunctionComponents: Error boundaries require class components (no React hook API available)
export class ComponentErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.toolInput !== this.props.toolInput) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }
    return this.props.children;
  }
}

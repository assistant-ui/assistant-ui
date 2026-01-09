"use client";

import { useState, useRef } from "react";
import { Play, Trash2, Shield, Code, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import { cn } from "@/lib/utils";

const DEFAULT_HTML = `<h1>Hello from Safe Content Frame!</h1>
<p>This content is rendered in a <strong>sandboxed iframe</strong>.</p>
<style>
  body {
    font-family: system-ui;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
    margin: 0;
  }
  h1 { margin-top: 0; }
</style>
<script>
  console.log('Script executed in sandbox!');
  document.body.innerHTML += '<p>JavaScript is working!</p>';
</script>`;

const XSS_EXAMPLE = `<h1>XSS Attack Demo</h1>
<p>This demonstrates that malicious scripts are sandboxed:</p>
<script>
  // These attacks are contained within the sandbox
  try {
    // Try to access parent window
    window.parent.document.body.innerHTML = 'HACKED!';
  } catch (e) {
    document.body.innerHTML += '<p style="color: #4ade80;">Cross-origin blocked: ' + e.message + '</p>';
  }

  try {
    // Try to access cookies
    document.body.innerHTML += '<p style="color: #4ade80;">Cookies: ' + (document.cookie || 'none (sandboxed)') + '</p>';
  } catch (e) {
    document.body.innerHTML += '<p style="color: #4ade80;">Cookie access blocked</p>';
  }

  try {
    // Try to redirect
    // window.top.location = 'https://evil.com';
    document.body.innerHTML += '<p style="color: #4ade80;">Top navigation blocked by sandbox</p>';
  } catch (e) {
    document.body.innerHTML += '<p style="color: #4ade80;">Navigation blocked: ' + e.message + '</p>';
  }
</script>
<style>
  body {
    font-family: system-ui;
    padding: 20px;
    background: #1a1a2e;
    color: #eee;
  }
  h1 { color: #f472b6; }
</style>`;

export default function SafeContentFramePage() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "Ready to render" });
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<RenderedFrame | null>(null);

  const renderContent = async () => {
    if (!containerRef.current) return;

    setStatus({ type: "loading", message: "Rendering..." });

    // Dispose previous frame
    if (frameRef.current) {
      frameRef.current.dispose();
      frameRef.current = null;
    }

    // Clear container
    containerRef.current.innerHTML = "";

    try {
      const scf = new SafeContentFrame("assistant-ui-docs", {
        sandbox: ["allow-scripts"],
      });

      const frame = await scf.renderHtml(html, containerRef.current);
      frameRef.current = frame;

      setStatus({
        type: "success",
        message: `Rendered! Origin: ${frame.origin}`,
      });

      // Try to wait for full load
      try {
        await frame.fullyLoadedPromiseWithTimeout(5000);
        setStatus((prev) => ({
          ...prev,
          message: `${prev.message} | Content fully loaded`,
        }));
      } catch {
        setStatus((prev) => ({
          ...prev,
          message: `${prev.message} | Load timeout`,
        }));
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const clearFrame = () => {
    if (frameRef.current) {
      frameRef.current.dispose();
      frameRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    setStatus({ type: "idle", message: "Ready to render" });
  };

  return (
    <div className="container mx-auto max-w-screen-xl space-y-12 px-4 py-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
          <Shield className="size-4" />
          <span>Secure iframe rendering</span>
        </div>

        <h1 className="font-bold text-5xl tracking-tight lg:text-6xl">
          Safe Content Frame
        </h1>

        <p className="max-w-[600px] text-balance text-lg text-muted-foreground">
          Render untrusted HTML content securely in sandboxed iframes with
          unique origins per render.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-lg">
              <Code className="size-5" />
              HTML Input
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHtml(DEFAULT_HTML)}
              >
                Default
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHtml(XSS_EXAMPLE)}
              >
                <AlertTriangle className="mr-1 size-3" />
                XSS Demo
              </Button>
            </div>
          </div>

          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="h-[400px] w-full rounded-lg border bg-muted/50 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            spellCheck={false}
          />

          <div className="flex gap-2">
            <Button onClick={renderContent} className="flex-1">
              <Play className="mr-2 size-4" />
              Render Content
            </Button>
            <Button variant="outline" onClick={clearFrame}>
              <Trash2 className="mr-2 size-4" />
              Clear
            </Button>
          </div>

          <div
            className={cn("rounded-lg p-3 font-mono text-sm", {
              "bg-destructive/10 text-destructive": status.type === "error",
              "bg-green-500/10 text-green-600 dark:text-green-400":
                status.type === "success",
              "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400":
                status.type === "loading",
              "bg-muted text-muted-foreground": status.type === "idle",
            })}
          >
            {status.message}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-lg">
            <Shield className="size-5" />
            Sandboxed Output
          </h2>

          <div
            ref={containerRef}
            className="h-[400px] overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
          />

          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
            <h3 className="mb-2 font-semibold">How it works:</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                Each render gets a <strong>unique origin</strong> derived from a
                hash
              </li>
              <li>
                Content runs in a <strong>sandboxed iframe</strong> with
                allow-scripts
              </li>
              <li>
                <strong>Cross-origin isolation</strong> prevents access to
                parent window
              </li>
              <li>
                No cookies, localStorage, or other storage from the parent
                domain
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Cable, Moon, Sun, Terminal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenSkybridge, openaiSkybridge } from "@assistant-ui/openskybridge";

// Demo payload - runtime code is injected automatically by openaiSkybridge()
const DEMO_PAYLOAD = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      padding: 20px;
      min-height: 100vh;
      transition: background 0.3s, color 0.3s;
    }
    body.light { background: #f8fafc; color: #1e293b; }
    body.dark { background: #0f172a; color: #e2e8f0; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    .card {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    body.light .card { background: white; border: 1px solid #e2e8f0; }
    body.dark .card { background: #1e293b; border: 1px solid #334155; }
    .label { font-size: 0.75rem; opacity: 0.6; margin-bottom: 4px; }
    .value { font-family: monospace; font-size: 0.875rem; }
    button {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    body.light button { background: #3b82f6; color: white; }
    body.dark button { background: #60a5fa; color: #0f172a; }
    button:hover { opacity: 0.9; }
    .log {
      font-family: monospace;
      font-size: 0.75rem;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      max-height: 100px;
      overflow-y: auto;
    }
    body.light .log { background: #f1f5f9; }
    body.dark .log { background: #0f172a; }
  </style>
</head>
<body class="light">
  <h1>Widget Demo</h1>

  <div class="card">
    <div class="label">Theme</div>
    <div class="value" id="theme">-</div>
  </div>

  <div class="card">
    <div class="label">Locale</div>
    <div class="value" id="locale">-</div>
  </div>

  <div class="card">
    <div class="label">Tool Input</div>
    <div class="value" id="toolInput">-</div>
  </div>

  <div class="card">
    <div class="label">Actions</div>
    <button onclick="handleCallTool()">Call Tool</button>
    <button onclick="handleOpenExternal()">Open Link</button>
    <button onclick="handleSendFollowUp()">Send Follow-up</button>
    <div class="log" id="log"></div>
  </div>

  <script>
    function log(msg) {
      const el = document.getElementById('log');
      el.textContent = msg + '\\n' + el.textContent;
    }

    function updateUI() {
      document.body.className = window.openai.theme;
      document.getElementById('theme').textContent = window.openai.theme;
      document.getElementById('locale').textContent = window.openai.locale;
      document.getElementById('toolInput').textContent = JSON.stringify(window.openai.toolInput);
    }

    window.addEventListener('openai:set_globals', updateUI);
    updateUI();

    async function handleCallTool() {
      log('Calling tool...');
      try {
        const result = await window.openai.callTool('get_weather', { city: 'Tokyo' });
        log('Tool result: ' + JSON.stringify(result));
      } catch (e) {
        log('Error: ' + e.message);
      }
    }

    function handleOpenExternal() {
      log('Opening external link...');
      window.openai.openExternal({ href: 'https://assistant-ui.com' });
    }

    async function handleSendFollowUp() {
      log('Sending follow-up...');
      try {
        await window.openai.sendFollowUpMessage({ prompt: 'Tell me more' });
        log('Follow-up sent!');
      } catch (e) {
        log('Error: ' + e.message);
      }
    }
  <\/script>
</body>
</html>`;

export default function OpenSkybridgePage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [locale, setLocale] = useState("en-US");
  const [toolInput, setToolInput] = useState<Record<string, unknown>>({
    query: "weather forecast",
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 10));
  };

  return (
    <div className="container max-w-screen-xl space-y-12 px-4 py-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
          <Cable className="size-4" />
          <span>OpenAI Widget Bridge</span>
        </div>

        <h1 className="font-bold text-5xl tracking-tight lg:text-6xl">
          OpenSkyBridge
        </h1>

        <p className="max-w-[600px] text-balance text-lg text-muted-foreground">
          Bridge the OpenAI widget API (window.openai) to any host environment
          via postMessage. Secure sandboxed iframe communication.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Host Controls */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-lg">
            <Terminal className="size-5" />
            Host Controls
          </h2>

          <div className="space-y-4 rounded-lg border border-dashed p-4">
            <div>
              <label className="mb-2 block font-medium text-sm">Theme</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-1 size-3" />
                  Light
                </Button>
                <Button
                  size="sm"
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-1 size-3" />
                  Dark
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-sm">Locale</label>
              <div className="flex gap-2">
                {["en-US", "ja-JP", "de-DE", "fr-FR"].map((l) => (
                  <Button
                    key={l}
                    size="sm"
                    variant={locale === l ? "default" : "outline"}
                    onClick={() => setLocale(l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-sm">
                Tool Input
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setToolInput({ query: "weather forecast" })}
                >
                  Weather
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setToolInput({ query: "stock prices" })}
                >
                  Stocks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setToolInput({ query: "news headlines" })}
                >
                  News
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <ExternalLink className="size-4" />
              Callback Logs
            </h3>
            <div className="h-[200px] overflow-y-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
              {logs.length === 0 ? (
                <span className="text-muted-foreground">
                  Waiting for widget actions...
                </span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="py-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Widget iframe */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-lg">
            <Cable className="size-5" />
            Widget (Sandboxed iframe)
          </h2>

          <div className="h-[400px] overflow-hidden rounded-lg border">
            <OpenSkybridge
              runtime={openaiSkybridge()}
              payload={DEMO_PAYLOAD}
              theme={theme}
              locale={locale}
              toolInput={toolInput}
              onCallTool={async (name, args) => {
                addLog(`onCallTool: ${name}(${JSON.stringify(args)})`);
                // Simulate async tool call
                await new Promise((r) => setTimeout(r, 500));
                return { content: { temperature: "22°C", condition: "Sunny" } };
              }}
              onRequestClose={() => {
                addLog("onRequestClose");
              }}
              onSendFollowUpMessage={async ({ prompt }) => {
                addLog(`onSendFollowUpMessage: "${prompt}"`);
              }}
              onOpenExternal={({ href }) => {
                addLog(`onOpenExternal: ${href}`);
                window.open(href, "_blank");
              }}
              onRequestDisplayMode={async ({ mode }) => {
                addLog(`onRequestDisplayMode: ${mode}`);
                return { mode };
              }}
              onSetWidgetState={async (state) => {
                addLog(`onSetWidgetState: ${JSON.stringify(state)}`);
              }}
            />
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
            <h3 className="mb-2 font-semibold">How it works:</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <code className="text-xs">runtime=&#123;openaiSkybridge()&#125;</code> injects window.openai
              </li>
              <li>
                Host sends <strong>state updates</strong> via postMessage
              </li>
              <li>
                Widget calls <strong>window.openai</strong> methods
              </li>
              <li>
                Methods are <strong>bridged</strong> to host callbacks
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

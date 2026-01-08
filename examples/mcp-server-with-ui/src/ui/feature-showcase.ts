import {
  getGlobals,
  onGlobalsChange,
  setWidgetState,
  requestDisplayMode,
  sendFollowUpMessage,
  notifyIntrinsicHeight,
  callTool,
  requestModal,
  requestClose,
  openExternal,
  uploadFile,
  getFileDownloadUrl,
} from "@assistant-ui/tool-ui-server";
import { z } from "zod";

const FeatureShowcaseSchema = z.object({
  title: z.string().default("AUI Feature Showcase"),
});

type FeatureShowcaseProps = z.infer<typeof FeatureShowcaseSchema>;

function renderFeatureShowcase(props: FeatureShowcaseProps): HTMLElement {
  const container = document.createElement("div");
  container.id = "feature-showcase";

  const globals = getGlobals();
  const theme = globals?.theme ?? "light";
  const isDark = theme === "dark";

  const userLocation = globals?.userLocation;
  const userAgent = globals?.userAgent;
  const safeArea = globals?.safeArea;
  const maxHeight = globals?.maxHeight;
  const locale = globals?.locale;
  const displayMode = globals?.displayMode;
  const toolResponseMetadata = globals?.toolResponseMetadata;

  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const textColor = isDark ? "#eaeaea" : "#1a1a2e";
  const cardBg = isDark ? "#16213e" : "#f8f9fa";
  const borderColor = isDark ? "#0f3460" : "#e9ecef";
  const accentColor = "#3b82f6";
  const successColor = "#10b981";
  const warningColor = "#f59e0b";
  const errorColor = "#ef4444";

  container.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      background: ${bgColor};
      color: ${textColor};
      border-radius: 16px;
      border: 1px solid ${borderColor};
      max-width: 700px;
    ">
      <h2 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; text-align: center;">
        ${props.title}
      </h2>
      
      <!-- Context Information Section -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          📊 Context Information
        </h3>
        <div style="
          display: grid;
          gap: 8px;
          padding: 16px;
          background: ${cardBg};
          border-radius: 12px;
          font-size: 14px;
          border: 1px solid ${borderColor};
        ">
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 4px;">
            <strong>Theme:</strong> <span id="theme-value" style="color: ${theme === "dark" ? "#60a5fa" : "#1e40af"};">${theme}</span>
            <strong>Display Mode:</strong> <span id="display-mode-value" style="color: ${accentColor};">${displayMode}</span>
            <strong>Locale:</strong> <span>${locale}</span>
            <strong>Max Height:</strong> <span>${maxHeight}px</span>
          </div>
          <div style="margin-top: 8px;">
            <strong>Device Capabilities:</strong><br>
            <span style="margin-left: 8px;">
              Type: ${userAgent?.device?.type ?? "unknown"} | 
              Input: ${userAgent?.capabilities?.hover ? "🖱️ hover" : ""}${userAgent?.capabilities?.touch ? "👆 touch" : ""}
            </span>
          </div>
          <div style="margin-top: 8px;">
            <strong>Safe Area Insets:</strong><br>
            <span style="margin-left: 8px;">
              Top: ${safeArea?.insets?.top ?? 0}px | 
              Right: ${safeArea?.insets?.right ?? 0}px | 
              Bottom: ${safeArea?.insets?.bottom ?? 0}px | 
              Left: ${safeArea?.insets?.left ?? 0}px
            </span>
          </div>
          <div style="margin-top: 8px;">
            <strong>User Location:</strong><br>
            <span style="margin-left: 8px;">
              ${
                userLocation
                  ? `${userLocation.city ?? "?"}, ${userLocation.country ?? "?"} (${userLocation?.timezone ?? "?"})`
                  : "📍 Not available"
              }
            </span>
          </div>
          ${
            toolResponseMetadata?.widgetSessionId
              ? `
            <div style="margin-top: 8px;">
              <strong>Widget Session:</strong> <code style="background: ${borderColor}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${toolResponseMetadata.widgetSessionId}</code>
            </div>
          `
              : ""
          }
        </div>
      </section>
      
      <!-- Display Mode Actions -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          🖼️ Display Modes
        </h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="mode-inline" class="action-btn" data-mode="inline" style="border-color: ${accentColor};">📱 Inline</button>
          <button id="mode-pip" class="action-btn" data-mode="pip" style="border-color: ${accentColor};">📺 Picture-in-Picture</button>
        </div>
      </section>
      
      <!-- Widget State Demo -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          💾 Widget State (Persistent)
        </h3>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button id="state-decrement" class="action-btn">➖</button>
          <span id="state-counter" style="
            min-width: 80px;
            text-align: center;
            padding: 12px 20px;
            background: ${accentColor};
            color: white;
            border-radius: 12px;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          ">${(globals?.widgetState as any)?.counter ?? 0}</span>
          <button id="state-increment" class="action-btn">➕</button>
          <button id="state-reset" class="action-btn" style="margin-left: 8px; background: ${errorColor}; color: white; border-color: ${errorColor};">🔄 Reset</button>
        </div>
        <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
          ⚡ State persists across page loads and display mode changes
        </div>
      </section>
      
      <!-- Communication Actions -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          💬 Communication & Navigation
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
          <button id="action-followup" class="action-btn" style="border-color: ${successColor};">💭 Send Follow-up</button>
          <button id="action-modal" class="action-btn" style="border-color: ${warningColor};">🔍 Open Modal</button>
          <button id="action-close" class="action-btn" style="border-color: ${errorColor}; color: ${errorColor};">❌ Close Widget</button>
          <button id="action-external" class="action-btn" style="border-color: ${accentColor};">🌐 External Link</button>
        </div>
      </section>
      
      <!-- Tool Calling -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          🔧 Call Tool from Widget
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px;">
          <button id="action-call-tool" class="action-btn" style="border-color: ${successColor};">🌤️ Call get_weather</button>
          <button id="action-call-private" class="action-btn" style="border-color: ${accentColor};">🔄 Call Private Tool</button>
        </div>
        <div id="tool-result" style="
          margin-top: 12px;
          padding: 16px;
          background: ${cardBg};
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid ${borderColor};
          display: none;
          max-height: 200px;
          overflow-y: auto;
        ">
          <div style="font-family: monospace; white-space: pre-wrap;"></div>
        </div>
      </section>
      
      <!-- File Handling -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor}; display: flex; align-items: center; gap: 8px;">
          📁 File Upload & Download
        </h3>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <input type="file" id="file-input" style="display: none;" accept="image/*,.pdf,.txt" />
          <button id="action-upload" class="action-btn" style="border-color: ${successColor};">📤 Upload File</button>
          <span id="file-status" style="font-size: 13px; opacity: 0.8;"></span>
        </div>
        <div id="file-result" style="
          margin-top: 12px;
          padding: 16px;
          background: ${cardBg};
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid ${borderColor};
          display: none;
        "></div>
      </section>
      
      <!-- Status Display -->
      <section style="margin-bottom: 16px;">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: ${cardBg};
          border-radius: 8px;
          font-size: 12px;
          border: 1px solid ${borderColor};
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: ${successColor};
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
          <span>All AUI client APIs demonstrated ✅</span>
        </div>
      </section>
      
      <style>
        .action-btn {
          padding: 10px 16px;
          background: ${isDark ? "#0f3460" : "#ffffff"};
          color: ${textColor};
          border: 2px solid ${borderColor};
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .action-btn:hover {
          background: ${accentColor};
          color: white;
          border-color: ${accentColor};
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .action-btn:active {
          transform: scale(0.98) translateY(0);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        code {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        }
        #tool-result pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        a {
          color: ${accentColor};
          text-decoration: none;
          transition: color 0.2s;
        }
        a:hover {
          text-decoration: underline;
          color: ${isDark ? "#60a5fa" : "#1e40af"};
        }
      </style>
    </div>
  `;

  setTimeout(() => {
    try {
      document.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const mode = (e.target as HTMLElement).dataset.mode as
            | "inline"
            | "fullscreen"
            | "pip";
          try {
            await requestDisplayMode(mode);
            console.log(`[Feature Showcase] Display mode changed to: ${mode}`);
          } catch (err) {
            console.error(
              `[Feature Showcase] Failed to change display mode to ${mode}:`,
              err,
            );
          }
        });
      });
      const counterEl = document.getElementById("state-counter");
      const getCounter = () => (getGlobals()?.widgetState as any)?.counter ?? 0;

      document
        .getElementById("state-increment")
        ?.addEventListener("click", () => {
          const newVal = getCounter() + 1;
          setWidgetState({ counter: newVal });
          if (counterEl) counterEl.textContent = String(newVal);
          console.log("[Feature Showcase] Counter incremented to:", newVal);
        });

      document
        .getElementById("state-decrement")
        ?.addEventListener("click", () => {
          const newVal = Math.max(0, getCounter() - 1);
          setWidgetState({ counter: newVal });
          if (counterEl) counterEl.textContent = String(newVal);
          console.log("[Feature Showcase] Counter decremented to:", newVal);
        });

      document.getElementById("state-reset")?.addEventListener("click", () => {
        setWidgetState({ counter: 0 });
        if (counterEl) counterEl.textContent = "0";
        console.log("[Feature Showcase] Counter reset to 0");
      });

      document
        .getElementById("action-followup")
        ?.addEventListener("click", async () => {
          try {
            await sendFollowUpMessage(
              "User requested a follow-up from the feature showcase widget. This demonstrates the sendFollowUpMessage API.",
            );
            console.log("[Feature Showcase] Follow-up message sent");
          } catch (err) {
            console.error("[Feature Showcase] Failed to send follow-up:", err);
          }
        });

      document
        .getElementById("action-modal")
        ?.addEventListener("click", async () => {
          try {
            await requestModal({
              title: "🎯 Feature Showcase Modal",
              params: {
                message:
                  "This demonstrates the requestModal API. You can customize modals with titles, parameters, and various content types.",
                demo: "Modal demonstration successful",
              },
            });
            console.log("[Feature Showcase] Modal requested");
          } catch (err) {
            console.error("[Feature Showcase] Failed to request modal:", err);
          }
        });

      document.getElementById("action-close")?.addEventListener("click", () => {
        try {
          requestClose();
          console.log("[Feature Showcase] Widget close requested");
        } catch (err) {
          console.error("[Feature Showcase] Failed to close widget:", err);
        }
      });

      document
        .getElementById("action-external")
        ?.addEventListener("click", () => {
          try {
            openExternal("https://assistant-ui.com/docs/getting-started");
            console.log("[Feature Showcase] External link opened");
          } catch (err) {
            console.error(
              "[Feature Showcase] Failed to open external link:",
              err,
            );
          }
        });

      const toolResultEl = document.getElementById("tool-result");
      const showToolResult = (message: string, isError: boolean = false) => {
        if (toolResultEl) {
          toolResultEl.style.display = "block";
          toolResultEl.style.borderColor = isError ? errorColor : borderColor;
          toolResultEl.querySelector("div")!.textContent = message;
        }
      };

      document
        .getElementById("action-call-tool")
        ?.addEventListener("click", async () => {
          showToolResult("🌤️ Calling get_weather tool...");
          try {
            const result = await callTool("get_weather", {
              location: "San Francisco, CA",
              aui: false,
            });
            showToolResult(
              "✅ get_weather result:\n\n" + JSON.stringify(result, null, 2),
            );
            console.log("[Feature Showcase] get_weather result:", result);
          } catch (err) {
            showToolResult(
              "❌ Error calling get_weather: " +
                (err instanceof Error ? err.message : String(err)),
              true,
            );
            console.error("[Feature Showcase] get_weather error:", err);
          }
        });

      document
        .getElementById("action-call-private")
        ?.addEventListener("click", async () => {
          showToolResult("🔄 Calling refresh_weather_data (private tool)...");
          try {
            const result = await callTool("refresh_weather_data", {
              location: "San Francisco, CA",
              force: true,
            });
            showToolResult(
              "✅ refresh_weather_data result:\n\n" +
                JSON.stringify(result, null, 2),
            );
            console.log(
              "[Feature Showcase] refresh_weather_data result:",
              result,
            );
          } catch (err) {
            showToolResult(
              "❌ Error calling refresh_weather_data: " +
                (err instanceof Error ? err.message : String(err)),
              true,
            );
            console.error(
              "[Feature Showcase] refresh_weather_data error:",
              err,
            );
          }
        });

      const fileInput = document.getElementById(
        "file-input",
      ) as HTMLInputElement;
      const fileStatus = document.getElementById("file-status");
      const fileResult = document.getElementById("file-result");

      document
        .getElementById("action-upload")
        ?.addEventListener("click", () => {
          fileInput?.click();
          console.log("[Feature Showcase] File upload dialog opened");
        });

      fileInput?.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (fileStatus)
          fileStatus.textContent = `📤 Uploading ${file.name} (${(file.size / 1024).toFixed(1)}KB)...`;
        if (fileResult) {
          fileResult.style.display = "block";
          fileResult.textContent = "⏳ Uploading and processing...";
        }

        try {
          console.log("[Feature Showcase] Uploading file:", file.name);
          const uploadResult = await uploadFile(file);
          if (fileStatus) fileStatus.textContent = `✅ Uploaded: ${file.name}`;

          console.log(
            "[Feature Showcase] Getting download URL for:",
            uploadResult.fileId,
          );
          const urlResult = await getFileDownloadUrl(uploadResult.fileId);

          if (fileResult) {
            fileResult.innerHTML = `
              <div><strong>📁 File Name:</strong> ${file.name}</div>
              <div><strong>🆔 File ID:</strong> <code>${uploadResult.fileId}</code></div>
              <div><strong>📊 File Size:</strong> ${(file.size / 1024).toFixed(1)}KB</div>
              <div><strong>🔗 Download URL:</strong> <a href="${urlResult.downloadUrl}" target="_blank">Open in new tab</a></div>
              <div><strong>✅ Upload Status:</strong> <span style="color: ${successColor};">Success</span></div>
            `;
            fileResult.style.borderColor = successColor;
          }
          console.log("[Feature Showcase] File upload complete:", uploadResult);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (fileStatus) fileStatus.textContent = `❌ Error: ${errorMsg}`;
          if (fileResult) {
            fileResult.textContent = `❌ Upload failed: ${errorMsg}`;
            fileResult.style.borderColor = errorColor;
          }
          console.error("[Feature Showcase] File upload error:", err);
        }
      });

      notifyIntrinsicHeight(container.scrollHeight);
      console.log("[Feature Showcase] Component loaded and initialized");
    } catch (err) {
      console.error(
        "[Feature Showcase] Error during component initialization:",
        err,
      );
    }
  }, 0);

  return container;
}

onGlobalsChange((changed) => {
  console.log("[Feature Showcase] Globals changed:", changed);

  if (changed.theme) {
    updateTheme(changed.theme);
  }

  if (changed.displayMode) {
    updateDisplayModeValue(changed.displayMode);
  }

  if (changed.widgetState) {
    updateCounterDisplay(
      (changed.widgetState as { counter?: number })?.counter ?? 0,
    );
  }
});

function updateTheme(theme: "light" | "dark") {
  const container = document.getElementById("feature-showcase");
  if (!container) return;

  const isDark = theme === "dark";
  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const textColor = isDark ? "#eaeaea" : "#1a1a2e";
  const cardBg = isDark ? "#16213e" : "#f8f9fa";
  const borderColor = isDark ? "#0f3460" : "#e9ecef";

  const innerDiv = container.firstElementChild as HTMLElement | null;
  if (innerDiv) {
    innerDiv.style.background = bgColor;
    innerDiv.style.color = textColor;
    innerDiv.style.borderColor = borderColor;
  }

  container
    .querySelectorAll<HTMLElement>('section > div[style*="background"]')
    .forEach((el) => {
      if (
        el.style.background &&
        !el.style.background.includes("rgb(59, 130, 246)")
      ) {
        el.style.background = cardBg;
        el.style.borderColor = borderColor;
      }
    });

  const themeValueEl = document.getElementById("theme-value");
  if (themeValueEl) {
    themeValueEl.style.color = isDark ? "#60a5fa" : "#1e40af";
    themeValueEl.textContent = theme;
  }

  container.querySelectorAll<HTMLElement>(".action-btn").forEach((btn) => {
    btn.style.background = isDark ? "#0f3460" : "#ffffff";
    btn.style.color = textColor;
  });

  const toolResult = document.getElementById("tool-result");
  if (toolResult) {
    toolResult.style.background = cardBg;
    toolResult.style.borderColor = borderColor;
  }

  const fileResult = document.getElementById("file-result");
  if (fileResult) {
    fileResult.style.background = cardBg;
    fileResult.style.borderColor = borderColor;
  }

  const statusSection = container.querySelector("section:last-of-type > div");
  if (statusSection) {
    (statusSection as HTMLElement).style.background = cardBg;
    (statusSection as HTMLElement).style.borderColor = borderColor;
  }
}

function updateDisplayModeValue(mode: string) {
  const displayModeEl = document.getElementById("display-mode-value");
  if (displayModeEl) {
    displayModeEl.textContent = mode;
  }
}

function updateCounterDisplay(counter: number) {
  const counterEl = document.getElementById("state-counter");
  if (counterEl) {
    counterEl.textContent = String(counter);
  }
}

export const FeatureShowcaseComponent = {
  name: "FeatureShowcase",
  schema: FeatureShowcaseSchema,
  render: renderFeatureShowcase,
};

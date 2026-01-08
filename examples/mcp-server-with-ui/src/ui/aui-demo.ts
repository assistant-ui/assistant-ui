import {
  getGlobals,
  onGlobalsChange,
  setWidgetState,
  requestDisplayMode,
  sendFollowUpMessage,
  notifyIntrinsicHeight,
} from "@assistant-ui/tool-ui-server";
import { z } from "zod";

const AUIDemoSchema = z.object({
  title: z.string().default("AUI Protocol Demo"),
  message: z.string().optional(),
});

type AUIDemoProps = z.infer<typeof AUIDemoSchema>;

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderAUIDemo(props: AUIDemoProps): HTMLElement {
  const container = document.createElement("div");
  container.id = "aui-demo-container";

  const globals = getGlobals();
  const theme = globals?.theme ?? "light";
  const widgetState = (globals?.widgetState as { counter?: number }) ?? {
    counter: 0,
  };
  const displayMode = globals?.displayMode ?? "inline";

  const bgColor = theme === "dark" ? "#1f2937" : "#f9fafb";
  const textColor = theme === "dark" ? "#f9fafb" : "#1f2937";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const buttonBg = theme === "dark" ? "#3b82f6" : "#2563eb";
  const isFullscreen = displayMode === "fullscreen";

  if (isFullscreen) {
    container.style.cssText =
      "width: 100%; height: 100%; margin: 0; padding: 0;";
  }

  container.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      background: ${bgColor};
      color: ${textColor};
      border-radius: ${isFullscreen ? "0" : "16px"};
      border: ${isFullscreen ? "none" : `1px solid ${borderColor}`};
      ${isFullscreen ? "width: 100%; height: 100%; box-sizing: border-box;" : "max-width: 500px;"}
    ">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
        ${escapeHtml(props.title)}
      </h2>
      
      ${props.message ? `<p style="margin: 0 0 16px 0; opacity: 0.8;">${escapeHtml(props.message)}</p>` : `<p style="margin: 0 0 16px 0; opacity: 0.8;">Here's an AUI demo showcasing rich UI components, theme awareness, widget state, display modes, and follow-ups.</p>`}
      
      <div style="
        display: grid;
        gap: 12px;
        padding: 16px;
        background: ${theme === "dark" ? "#111827" : "#ffffff"};
        border-radius: 12px;
        margin-bottom: 16px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500;">Display Mode:</span>
          <span id="display-mode-value" style="
            padding: 4px 12px;
            background: ${theme === "dark" ? "#374151" : "#e5e7eb"};
            border-radius: 9999px;
            font-size: 14px;
          ">${displayMode}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500;">Counter (Widget State):</span>
          <span id="counter-value" style="
            padding: 4px 12px;
            background: ${buttonBg};
            color: white;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
          ">${widgetState.counter ?? 0}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500;">Locale:</span>
          <span style="
            padding: 4px 12px;
            background: ${theme === "dark" ? "#374151" : "#e5e7eb"};
            border-radius: 9999px;
            font-size: 14px;
          ">${globals?.locale ?? "en-US"}</span>
        </div>
      </div>
      
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <button id="increment-btn" style="
          padding: 8px 16px;
          background: ${buttonBg};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          Increment Counter
        </button>
        
        <button id="fullscreen-btn" style="
          padding: 8px 16px;
          background: ${theme === "dark" ? "#059669" : "#10b981"};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          ${isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
        </button>
        
        <button id="followup-btn" style="
          padding: 8px 16px;
          background: ${theme === "dark" ? "#7c3aed" : "#8b5cf6"};
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          Send Follow-up
        </button>
      </div>
      

    </div>
  `;

  setTimeout(() => {
    const incrementBtn = document.getElementById("increment-btn");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const followupBtn = document.getElementById("followup-btn");
    const counterValue = document.getElementById("counter-value");

    incrementBtn?.addEventListener("click", () => {
      const currentState = (getGlobals()?.widgetState as {
        counter?: number;
      }) ?? { counter: 0 };
      const newCounter = (currentState.counter ?? 0) + 1;
      setWidgetState({ counter: newCounter });
      if (counterValue) {
        counterValue.textContent = String(newCounter);
      }
    });

    fullscreenBtn?.addEventListener("click", async () => {
      const currentMode = getGlobals()?.displayMode ?? "inline";
      const newMode = currentMode === "fullscreen" ? "inline" : "fullscreen";
      await requestDisplayMode(newMode);
    });

    followupBtn?.addEventListener("click", async () => {
      await sendFollowUpMessage(
        "The user clicked the follow-up button in the AUI demo widget. Please acknowledge this action.",
      );
    });

    notifyIntrinsicHeight(container.scrollHeight);
  }, 0);

  return container;
}

function updateDisplayModeDisplay(mode: string) {
  const displayModeValue = document.getElementById("display-mode-value");
  if (displayModeValue) {
    displayModeValue.textContent = mode;
  }

  const container = document.getElementById("aui-demo-container");
  const innerDiv = container?.firstElementChild as HTMLElement | null;
  if (container && innerDiv) {
    const isFullscreen = mode === "fullscreen";
    container.style.cssText = isFullscreen
      ? "width: 100%; height: 100%; margin: 0; padding: 0;"
      : "";
    innerDiv.style.borderRadius = isFullscreen ? "0" : "16px";
    innerDiv.style.border = isFullscreen ? "none" : "";
    innerDiv.style.width = isFullscreen ? "100%" : "";
    innerDiv.style.height = isFullscreen ? "100%" : "";
    innerDiv.style.maxWidth = isFullscreen ? "100%" : "500px";
    innerDiv.style.boxSizing = isFullscreen ? "border-box" : "";
  }

  const fullscreenBtn = document.getElementById("fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.textContent =
      mode === "fullscreen" ? "Exit Fullscreen" : "Go Fullscreen";
  }
}

function updateCounterDisplay(state: { counter?: number }) {
  const counterValue = document.getElementById("counter-value");
  if (counterValue && state.counter !== undefined) {
    counterValue.textContent = String(state.counter);
  }
}

function updateTheme(theme: "light" | "dark") {
  const container = document.getElementById("aui-demo-container");
  const innerDiv = container?.firstElementChild as HTMLElement | null;
  if (!innerDiv) return;

  const bgColor = theme === "dark" ? "#1f2937" : "#f9fafb";
  const textColor = theme === "dark" ? "#f9fafb" : "#1f2937";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const cardBg = theme === "dark" ? "#111827" : "#ffffff";
  const pillBg = theme === "dark" ? "#374151" : "#e5e7eb";
  const buttonBg = theme === "dark" ? "#3b82f6" : "#2563eb";
  const greenBg = theme === "dark" ? "#059669" : "#10b981";
  const purpleBg = theme === "dark" ? "#7c3aed" : "#8b5cf6";

  innerDiv.style.background = bgColor;
  innerDiv.style.color = textColor;
  innerDiv.style.borderColor = borderColor;

  const cardDiv = innerDiv.querySelector(
    "div > div:nth-child(3)",
  ) as HTMLElement | null;
  if (cardDiv) {
    cardDiv.style.background = cardBg;
  }

  const displayModePill = document.getElementById(
    "display-mode-value",
  ) as HTMLElement | null;
  if (displayModePill) {
    displayModePill.style.background = pillBg;
  }

  const localePill = innerDiv.querySelector(
    "div > div:nth-child(3) > div:nth-child(3) > span:last-child",
  ) as HTMLElement | null;
  if (localePill) {
    localePill.style.background = pillBg;
  }

  const counterValue = document.getElementById(
    "counter-value",
  ) as HTMLElement | null;
  if (counterValue) {
    counterValue.style.background = buttonBg;
  }

  const incrementBtn = document.getElementById(
    "increment-btn",
  ) as HTMLElement | null;
  if (incrementBtn) {
    incrementBtn.style.background = buttonBg;
  }

  const fullscreenBtn = document.getElementById(
    "fullscreen-btn",
  ) as HTMLElement | null;
  if (fullscreenBtn) {
    fullscreenBtn.style.background = greenBg;
  }

  const followupBtn = document.getElementById(
    "followup-btn",
  ) as HTMLElement | null;
  if (followupBtn) {
    followupBtn.style.background = purpleBg;
  }
}

onGlobalsChange((changed) => {
  console.log("[AUI Demo] Globals changed:", changed);

  if (changed.theme) {
    updateTheme(changed.theme);
  }

  if (changed.displayMode) {
    updateDisplayModeDisplay(changed.displayMode);
  }

  if (changed.widgetState) {
    updateCounterDisplay(changed.widgetState as { counter?: number });
  }
});

export const AUIDemoComponent = {
  name: "AUIDemo",
  schema: AUIDemoSchema,
  render: renderAUIDemo,
};

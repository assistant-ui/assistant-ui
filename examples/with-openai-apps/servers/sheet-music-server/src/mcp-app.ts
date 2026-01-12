/**
 * @file Sheet Music App - renders ABC notation with abcjs and provides audio playback
 */
import { App } from "@modelcontextprotocol/ext-apps";
import ABCJS from "abcjs";
import "abcjs/abcjs-audio.css";
import "./global.css";
import "./mcp-app.css";

const log = {
  info: console.log.bind(console, "[APP]"),
  error: console.error.bind(console, "[APP]"),
};

// State management
interface AppState {
  visualObj: ABCJS.TuneObject[] | null;
  synthControl: ABCJS.SynthObjectController | null;
}

const state: AppState = {
  visualObj: null,
  synthControl: null,
};

// DOM element references
const mainEl = document.querySelector(".main") as HTMLElement;
const statusEl = document.getElementById("status")!;
const sheetMusicEl = document.getElementById("sheet-music")!;
const audioControlsEl = document.getElementById("audio-controls")!;

/**
 * Updates the status display.
 */
function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

/**
 * Renders ABC notation to sheet music and sets up audio playback
 */
async function renderAbc(abcNotation: string): Promise<void> {
  try {
    setStatus("Rendering...");

    // Clear previous content
    sheetMusicEl.innerHTML = "";
    audioControlsEl.innerHTML = "";

    // Render the sheet music visually
    state.visualObj = ABCJS.renderAbc(sheetMusicEl, abcNotation, {
      responsive: "resize",
      add_classes: true,
    });

    if (!state.visualObj || state.visualObj.length === 0) {
      throw new Error("Failed to parse music notation");
    }

    if (!ABCJS.synth.supportsAudio()) {
      throw new Error("Audio not supported in this browser");
    }

    // Create synth controller with UI controls
    state.synthControl = new ABCJS.synth.SynthController();
    state.synthControl.load(audioControlsEl, null, {
      displayLoop: true,
      // displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      // displayWarp: true,
    });

    // Connect synth to the rendered tune
    await state.synthControl.setTune(state.visualObj[0], false, {});

    setStatus("Ready to play!");
  } catch (error) {
    log.error("Render error:", error);
    setStatus(`Error: ${(error as Error).message}`, true);
    audioControlsEl.innerHTML = "";
  }
}

// Create app instance
const app = new App({ name: "Sheet Music App", version: "1.0.0" });

// Handle tool input - receives ABC notation from the host
app.ontoolinput = (params) => {
  log.info("Received tool input:", params);

  const abcNotation = params.arguments?.abcNotation as string | undefined;

  if (abcNotation) {
    renderAbc(abcNotation);
  } else {
    setStatus("No ABC notation provided", true);
  }
};

// Error handler
app.onerror = log.error;

app.onhostcontextchanged = (params) => {
  if (params.safeAreaInsets) {
    mainEl.style.paddingTop = `${params.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${params.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${params.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${params.safeAreaInsets.left}px`;
  }
};

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    app.onhostcontextchanged(ctx);
  }
});

# Comprehensive Example Update Plan

## Overview

Update the `examples/mcp-server-with-ui/` example to demonstrate **all** implemented features of `@assistant-ui/tool-ui-server`, including the new ChatGPT Apps SDK parity features and OAuth support.

## Current State

The example currently demonstrates:
- Basic tool registration with `toolWithUI()`
- Component rendering with `createToolUIRuntime()`
- Theme awareness (light/dark)
- Widget state persistence
- Display mode switching (inline/fullscreen)
- Follow-up messages
- Height notification

**Missing**: File APIs, tool annotations, OAuth, modals, external links, user context, and more.

## Desired End State

After this update:
1. Example demonstrates **every** exported feature
2. Each new feature has a dedicated tool or UI interaction
3. Comments explain each feature's purpose
4. README documents all demonstrated features
5. Serves as comprehensive reference implementation

## Implementation Phases

### Phase 1: Server-Side Tool Enhancements
Add new tools demonstrating server-side features.

### Phase 2: UI Component Enhancements  
Update UI to demonstrate all client-side APIs.

### Phase 3: OAuth Example
Add OAuth-protected tool demonstration.

### Phase 4: Documentation
Update README with feature catalog.

---

## Phase 1: Server-Side Tool Enhancements

### Overview
Add new tools that demonstrate tool annotations, metadata, invocation messages, and file handling.

### Changes Required

#### 1. Add Tool with Annotations

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: delete_location (Demonstrates Tool Annotations)
// =============================================================================

toolWithUI({
  name: "delete_location",
  description: "Delete a saved location from favorites. Demonstrates destructive tool annotation.",
  parameters: z.object({
    locationId: z.string().describe("ID of the location to delete"),
  }),
  component: "DeleteConfirmation",
  // NEW: Tool annotations for ChatGPT Apps SDK compatibility
  annotations: {
    destructiveHint: true,
    completionMessage: "Location deleted successfully",
  },
  execute: async ({ locationId }) => {
    // Simulate deletion
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      deleted: true,
      locationId,
      message: `Location ${locationId} has been removed from your favorites.`,
    };
  },
});
```

#### 2. Add Read-Only Tool with Invocation Messages

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: get_weather_alerts (Demonstrates Invocation Messages + Read-Only)
// =============================================================================

toolWithUI({
  name: "get_weather_alerts",
  description: "Get active weather alerts for a region. Demonstrates invocation messages and read-only annotation.",
  parameters: z.object({
    region: z.string().describe("Region code (e.g., 'US-CA')"),
  }),
  component: "WeatherAlerts",
  // NEW: Read-only annotation
  annotations: {
    readOnlyHint: true,
  },
  // NEW: Invocation status messages (max 64 chars each)
  invocationMessages: {
    invoking: "Checking weather alerts...",
    invoked: "Weather alerts retrieved",
  },
  execute: async ({ region }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      region,
      alerts: [
        { type: "Heat Advisory", severity: "moderate", expires: "2024-01-15T18:00:00Z" },
        { type: "Air Quality Alert", severity: "low", expires: "2024-01-14T12:00:00Z" },
      ],
    };
  },
});
```

#### 3. Add File Upload Tool

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: analyze_weather_image (Demonstrates File Handling)
// =============================================================================

toolWithUI({
  name: "analyze_weather_image",
  description: "Analyze a weather-related image (satellite, radar, etc.). Demonstrates file parameter handling.",
  parameters: z.object({
    imageFile: z.string().describe("File ID of the uploaded image"),
    analysisType: z.enum(["satellite", "radar", "forecast"]).default("satellite"),
  }),
  component: "ImageAnalysis",
  // NEW: File params declaration
  fileParams: ["imageFile"],
  // NEW: Tool metadata
  visibility: "public",
  widgetAccessible: true,
  execute: async ({ imageFile, analysisType }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      fileId: imageFile,
      analysisType,
      result: {
        clouds: "scattered cumulus",
        precipitation: "none detected",
        confidence: 0.87,
      },
    };
  },
});
```

#### 4. Add Private Tool (Widget-Only)

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: refresh_weather_data (Private Tool - Widget Accessible Only)
// =============================================================================

toolWithUI({
  name: "refresh_weather_data",
  description: "Refresh weather data for a location. Hidden from model, callable from widget only.",
  parameters: z.object({
    location: z.string(),
    force: z.boolean().default(false),
  }),
  component: "RefreshIndicator",
  // NEW: Private tool accessible from widget
  visibility: "private",
  widgetAccessible: true,
  execute: async ({ location, force }) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      location,
      refreshed: true,
      timestamp: new Date().toISOString(),
      forced: force,
    };
  },
});
```

#### 5. Add OAuth-Protected Tool

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: save_favorite_location (OAuth Protected)
// =============================================================================

toolWithUI({
  name: "save_favorite_location",
  description: "Save a location to your favorites. Requires authentication.",
  parameters: z.object({
    location: z.string().describe("Location to save"),
    nickname: z.string().optional().describe("Custom name for this location"),
  }),
  component: "SaveConfirmation",
  // NEW: OAuth security scheme
  securitySchemes: [
    { type: "oauth2", scopes: ["favorites:write"] },
  ],
  execute: async ({ location, nickname }, context) => {
    // Check authentication
    if (!context?.auth?.isAuthenticated) {
      // In real implementation, would return MCP auth error
      return {
        error: "Authentication required",
        requiresAuth: true,
      };
    }
    
    return {
      saved: true,
      location,
      nickname: nickname ?? location,
      userId: context.auth.claims?.sub,
    };
  },
});

// Tool with optional authentication (public read, auth for personalization)
toolWithUI({
  name: "get_personalized_forecast",
  description: "Get weather forecast. Anonymous users get basic forecast, authenticated users get personalized recommendations.",
  parameters: z.object({
    location: z.string(),
  }),
  component: "PersonalizedForecast",
  // NEW: Mixed security - works anonymous, enhanced when authenticated
  securitySchemes: [
    { type: "noauth" },
    { type: "oauth2", scopes: ["profile:read"] },
  ],
  execute: async ({ location }, context) => {
    const isAuthenticated = context?.auth?.isAuthenticated ?? false;
    
    const baseForecast = await fetchWeather(location);
    
    if (isAuthenticated) {
      return {
        ...baseForecast,
        personalized: true,
        recommendations: [
          "Based on your preferences, bring a light jacket",
          "Good day for outdoor activities you enjoy",
        ],
        userId: context?.auth?.claims?.sub,
      };
    }
    
    return {
      ...baseForecast,
      personalized: false,
      recommendations: null,
    };
  },
});
```

#### 6. Update Server Configuration with OAuth

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// Create the UI-enabled MCP server with OAuth support
const { toolWithUI, getUICapability, generateManifest, start } =
  createToolUIServer({
    serverId: "weather-mcp",
    name: "Weather MCP Server",
    version: "1.0.0",
    bundleHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    // NEW: OAuth configuration (optional - for demonstration)
    // In production, uncomment and configure with real auth server
    // oauth: {
    //   resource: "https://weather-mcp.example.com",
    //   authorizationServers: ["https://auth.example.com"],
    //   scopesSupported: ["favorites:read", "favorites:write", "profile:read"],
    //   resourceDocumentation: "https://docs.example.com/weather-mcp",
    // },
  });
```

### Success Criteria

- [ ] All new tools compile without errors
- [ ] Tool annotations are properly typed
- [ ] Invocation messages are under 64 characters
- [ ] Security schemes are valid
- [ ] File params are declared correctly

---

## Phase 2: UI Component Enhancements

### Overview
Add new UI components and update existing ones to demonstrate all client-side APIs.

### Changes Required

#### 1. Create Comprehensive Feature Demo Component

**File**: `examples/mcp-server-with-ui/src/ui/feature-showcase.ts` (NEW)

```typescript
/**
 * Feature Showcase Component
 * 
 * Demonstrates ALL client-side AUI APIs in a single interactive component.
 */

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
  
  // Extract all context information
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
  
  container.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      background: ${bgColor};
      color: ${textColor};
      border-radius: 16px;
      border: 1px solid ${borderColor};
      max-width: 600px;
    ">
      <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">
        ${props.title}
      </h2>
      
      <!-- Context Information Section -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          Context Information
        </h3>
        <div style="
          display: grid;
          gap: 8px;
          padding: 16px;
          background: ${cardBg};
          border-radius: 12px;
          font-size: 14px;
        ">
          <div><strong>Theme:</strong> ${theme}</div>
          <div><strong>Display Mode:</strong> ${displayMode}</div>
          <div><strong>Locale:</strong> ${locale}</div>
          <div><strong>Max Height:</strong> ${maxHeight}px</div>
          <div><strong>Device:</strong> ${userAgent?.device?.type ?? "unknown"} (hover: ${userAgent?.capabilities?.hover}, touch: ${userAgent?.capabilities?.touch})</div>
          <div><strong>Safe Area:</strong> T:${safeArea?.insets?.top ?? 0} R:${safeArea?.insets?.right ?? 0} B:${safeArea?.insets?.bottom ?? 0} L:${safeArea?.insets?.left ?? 0}</div>
          <div><strong>User Location:</strong> ${userLocation ? `${userLocation.city ?? "?"}, ${userLocation.country ?? "?"} (${userLocation.timezone ?? "?"})` : "Not available"}</div>
          <div><strong>Widget Session:</strong> ${toolResponseMetadata?.widgetSessionId ?? "N/A"}</div>
        </div>
      </section>
      
      <!-- Display Mode Actions -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          Display Modes
        </h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="mode-inline" class="action-btn" data-mode="inline">Inline</button>
          <button id="mode-fullscreen" class="action-btn" data-mode="fullscreen">Fullscreen</button>
          <button id="mode-pip" class="action-btn" data-mode="pip">Picture-in-Picture</button>
        </div>
      </section>
      
      <!-- Widget State Demo -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          Widget State
        </h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="state-decrement" class="action-btn">-</button>
          <span id="state-counter" style="
            min-width: 60px;
            text-align: center;
            padding: 8px 16px;
            background: ${accentColor};
            color: white;
            border-radius: 8px;
            font-weight: 600;
          ">${(globals?.widgetState as any)?.counter ?? 0}</span>
          <button id="state-increment" class="action-btn">+</button>
          <button id="state-reset" class="action-btn" style="margin-left: 8px;">Reset</button>
        </div>
      </section>
      
      <!-- Communication Actions -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          Communication
        </h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="action-followup" class="action-btn">Send Follow-up</button>
          <button id="action-modal" class="action-btn">Open Modal</button>
          <button id="action-close" class="action-btn">Close Widget</button>
          <button id="action-external" class="action-btn">Open External Link</button>
        </div>
      </section>
      
      <!-- Tool Calling -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          Call Tool from Widget
        </h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="action-call-tool" class="action-btn">Call get_weather</button>
          <button id="action-call-private" class="action-btn">Call Private Tool (refresh)</button>
        </div>
        <div id="tool-result" style="
          margin-top: 12px;
          padding: 12px;
          background: ${cardBg};
          border-radius: 8px;
          font-size: 13px;
          display: none;
        "></div>
      </section>
      
      <!-- File Handling -->
      <section style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${accentColor};">
          File Handling
        </h3>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <input type="file" id="file-input" style="display: none;" />
          <button id="action-upload" class="action-btn">Upload File</button>
          <span id="file-status" style="font-size: 13px; opacity: 0.8;"></span>
        </div>
        <div id="file-result" style="
          margin-top: 12px;
          padding: 12px;
          background: ${cardBg};
          border-radius: 8px;
          font-size: 13px;
          display: none;
        "></div>
      </section>
      
      <style>
        .action-btn {
          padding: 8px 16px;
          background: ${isDark ? "#0f3460" : "#e9ecef"};
          color: ${textColor};
          border: 1px solid ${borderColor};
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: ${accentColor};
          color: white;
          border-color: ${accentColor};
        }
        .action-btn:active {
          transform: scale(0.98);
        }
      </style>
    </div>
  `;
  
  // Wire up event handlers
  setTimeout(() => {
    // Display mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as "inline" | "fullscreen" | "pip";
        await requestDisplayMode(mode);
      });
    });
    
    // Widget state
    const counterEl = document.getElementById('state-counter');
    const getCounter = () => ((getGlobals()?.widgetState as any)?.counter ?? 0);
    
    document.getElementById('state-increment')?.addEventListener('click', () => {
      const newVal = getCounter() + 1;
      setWidgetState({ counter: newVal });
      if (counterEl) counterEl.textContent = String(newVal);
    });
    
    document.getElementById('state-decrement')?.addEventListener('click', () => {
      const newVal = Math.max(0, getCounter() - 1);
      setWidgetState({ counter: newVal });
      if (counterEl) counterEl.textContent = String(newVal);
    });
    
    document.getElementById('state-reset')?.addEventListener('click', () => {
      setWidgetState({ counter: 0 });
      if (counterEl) counterEl.textContent = "0";
    });
    
    // Communication actions
    document.getElementById('action-followup')?.addEventListener('click', async () => {
      await sendFollowUpMessage("User requested a follow-up from the feature showcase widget.");
    });
    
    document.getElementById('action-modal')?.addEventListener('click', async () => {
      await requestModal({ title: "Example Modal", params: { message: "Hello from the showcase!" } });
    });
    
    document.getElementById('action-close')?.addEventListener('click', () => {
      requestClose();
    });
    
    document.getElementById('action-external')?.addEventListener('click', () => {
      openExternal({ href: "https://assistant-ui.com" });
    });
    
    // Tool calling
    const toolResultEl = document.getElementById('tool-result');
    
    document.getElementById('action-call-tool')?.addEventListener('click', async () => {
      if (toolResultEl) {
        toolResultEl.style.display = 'block';
        toolResultEl.textContent = 'Calling get_weather...';
      }
      try {
        const result = await callTool('get_weather', { location: 'San Francisco, CA', aui: false });
        if (toolResultEl) {
          toolResultEl.textContent = JSON.stringify(result, null, 2);
        }
      } catch (err) {
        if (toolResultEl) {
          toolResultEl.textContent = `Error: ${err}`;
        }
      }
    });
    
    document.getElementById('action-call-private')?.addEventListener('click', async () => {
      if (toolResultEl) {
        toolResultEl.style.display = 'block';
        toolResultEl.textContent = 'Calling refresh_weather_data (private tool)...';
      }
      try {
        const result = await callTool('refresh_weather_data', { location: 'San Francisco, CA' });
        if (toolResultEl) {
          toolResultEl.textContent = JSON.stringify(result, null, 2);
        }
      } catch (err) {
        if (toolResultEl) {
          toolResultEl.textContent = `Error: ${err}`;
        }
      }
    });
    
    // File handling
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const fileStatus = document.getElementById('file-status');
    const fileResult = document.getElementById('file-result');
    
    document.getElementById('action-upload')?.addEventListener('click', () => {
      fileInput?.click();
    });
    
    fileInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      if (fileStatus) fileStatus.textContent = `Uploading ${file.name}...`;
      if (fileResult) {
        fileResult.style.display = 'block';
        fileResult.textContent = 'Uploading...';
      }
      
      try {
        const uploadResult = await uploadFile(file);
        if (fileStatus) fileStatus.textContent = `Uploaded: ${uploadResult.fileId}`;
        
        // Get download URL
        const urlResult = await getFileDownloadUrl(uploadResult.fileId);
        if (fileResult) {
          fileResult.innerHTML = `
            <div><strong>File ID:</strong> ${uploadResult.fileId}</div>
            <div><strong>Download URL:</strong> <a href="${urlResult.downloadUrl}" target="_blank" style="color: ${accentColor};">Link</a></div>
          `;
        }
      } catch (err) {
        if (fileStatus) fileStatus.textContent = `Error: ${err}`;
        if (fileResult) fileResult.textContent = `Upload failed: ${err}`;
      }
    });
    
    // Notify height
    notifyIntrinsicHeight(container.scrollHeight);
  }, 0);
  
  return container;
}

// Listen for global changes
onGlobalsChange((changed) => {
  console.log('[Feature Showcase] Globals changed:', changed);
  // In a real implementation, would re-render affected sections
});

export const FeatureShowcaseComponent = {
  name: "FeatureShowcase",
  schema: FeatureShowcaseSchema,
  render: renderFeatureShowcase,
};
```

#### 2. Add Delete Confirmation Component

**File**: `examples/mcp-server-with-ui/src/ui/delete-confirmation.ts` (NEW)

```typescript
/**
 * Delete Confirmation Component
 * 
 * Demonstrates handling destructive actions with confirmation UI.
 */

import { z } from "zod";

const DeleteConfirmationSchema = z.object({
  deleted: z.boolean(),
  locationId: z.string(),
  message: z.string(),
});

function renderDeleteConfirmation(props: z.infer<typeof DeleteConfirmationSchema>): string {
  return `
    <div style="
      padding: 20px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border-radius: 12px;
      text-align: center;
    ">
      <div style="font-size: 32px; margin-bottom: 12px;">🗑️</div>
      <div style="font-weight: 600; margin-bottom: 8px;">${props.message}</div>
      <div style="font-size: 12px; opacity: 0.8;">ID: ${props.locationId}</div>
    </div>
  `;
}

export const DeleteConfirmationComponent = {
  name: "DeleteConfirmation",
  schema: DeleteConfirmationSchema,
  render: renderDeleteConfirmation,
};
```

#### 3. Add Weather Alerts Component

**File**: `examples/mcp-server-with-ui/src/ui/weather-alerts.ts` (NEW)

```typescript
/**
 * Weather Alerts Component
 * 
 * Demonstrates read-only data display.
 */

import { z } from "zod";

const WeatherAlertsSchema = z.object({
  region: z.string(),
  alerts: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low", "moderate", "high", "extreme"]),
    expires: z.string(),
  })),
});

const severityColors: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  extreme: "#ef4444",
};

function renderWeatherAlerts(props: z.infer<typeof WeatherAlertsSchema>): string {
  const alertsHtml = props.alerts.map(alert => `
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      border-left: 4px solid ${severityColors[alert.severity]};
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: ${severityColors[alert.severity]};
        border-radius: 50%;
      "></div>
      <div style="flex: 1;">
        <div style="font-weight: 600;">${alert.type}</div>
        <div style="font-size: 12px; opacity: 0.8;">
          Expires: ${new Date(alert.expires).toLocaleString()}
        </div>
      </div>
      <div style="
        padding: 4px 8px;
        background: ${severityColors[alert.severity]};
        border-radius: 4px;
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 600;
      ">${alert.severity}</div>
    </div>
  `).join('');

  return `
    <div style="
      padding: 20px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      border-radius: 12px;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      ">
        <span style="font-size: 24px;">⚠️</span>
        <h3 style="margin: 0; font-size: 18px;">Weather Alerts - ${props.region}</h3>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${alertsHtml || '<div style="opacity: 0.6;">No active alerts</div>'}
      </div>
    </div>
  `;
}

export const WeatherAlertsComponent = {
  name: "WeatherAlerts",
  schema: WeatherAlertsSchema,
  render: renderWeatherAlerts,
};
```

#### 4. Update UI Index to Register All Components

**File**: `examples/mcp-server-with-ui/src/ui/index.ts`

```typescript
/**
 * Weather UI Components Bundle
 * 
 * Comprehensive example demonstrating ALL @assistant-ui/tool-ui-server features.
 */

import { createToolUIRuntime } from "@assistant-ui/tool-ui-server";
import { z } from "zod";

// Import all components
import { AUIDemoComponent } from "./aui-demo";
import { FeatureShowcaseComponent } from "./feature-showcase";
import { DeleteConfirmationComponent } from "./delete-confirmation";
import { WeatherAlertsComponent } from "./weather-alerts";

// ... existing WeatherCard and WeatherComparison schemas and renders ...

// Inject Tailwind CSS
function loadTailwind(): Promise<void> {
  return new Promise((resolve) => {
    const tailwindScript = document.createElement("script");
    tailwindScript.src = "https://cdn.tailwindcss.com";
    tailwindScript.onload = () => setTimeout(resolve, 50);
    tailwindScript.onerror = () => resolve();
    document.head.appendChild(tailwindScript);
  });
}

const runtime = createToolUIRuntime();

// Register existing components
runtime.register({
  name: "WeatherCard",
  schema: WeatherCardSchema,
  render: renderWeatherCard,
});

runtime.register({
  name: "WeatherComparison",
  schema: WeatherComparisonSchema,
  render: renderWeatherComparison,
});

// Register new components
runtime.register(AUIDemoComponent);
runtime.register(FeatureShowcaseComponent);
runtime.register(DeleteConfirmationComponent);
runtime.register(WeatherAlertsComponent);

// Add placeholder components for other tools
runtime.register({
  name: "ImageAnalysis",
  schema: z.object({
    fileId: z.string(),
    analysisType: z.string(),
    result: z.object({
      clouds: z.string(),
      precipitation: z.string(),
      confidence: z.number(),
    }),
  }),
  render: (props) => `
    <div style="padding: 20px; background: #1e293b; color: white; border-radius: 12px;">
      <h3 style="margin: 0 0 12px 0;">Image Analysis Result</h3>
      <div>File: ${props.fileId}</div>
      <div>Type: ${props.analysisType}</div>
      <div>Clouds: ${props.result.clouds}</div>
      <div>Precipitation: ${props.result.precipitation}</div>
      <div>Confidence: ${(props.result.confidence * 100).toFixed(1)}%</div>
    </div>
  `,
});

runtime.register({
  name: "RefreshIndicator",
  schema: z.object({
    location: z.string(),
    refreshed: z.boolean(),
    timestamp: z.string(),
    forced: z.boolean(),
  }),
  render: (props) => `
    <div style="padding: 16px; background: #065f46; color: white; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">✓</span>
      <div>
        <div style="font-weight: 600;">Data Refreshed</div>
        <div style="font-size: 12px; opacity: 0.8;">${props.location} at ${new Date(props.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  `,
});

runtime.register({
  name: "SaveConfirmation",
  schema: z.object({
    saved: z.boolean().optional(),
    error: z.string().optional(),
    requiresAuth: z.boolean().optional(),
    location: z.string().optional(),
    nickname: z.string().optional(),
    userId: z.string().optional(),
  }),
  render: (props) => {
    if (props.requiresAuth) {
      return `
        <div style="padding: 20px; background: #fef3c7; color: #92400e; border-radius: 12px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 12px;">🔐</div>
          <div style="font-weight: 600;">Authentication Required</div>
          <div style="font-size: 14px; margin-top: 8px;">Please sign in to save favorites.</div>
        </div>
      `;
    }
    return `
      <div style="padding: 20px; background: #065f46; color: white; border-radius: 12px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">⭐</div>
        <div style="font-weight: 600;">Saved to Favorites</div>
        <div style="font-size: 14px; margin-top: 8px;">${props.nickname ?? props.location}</div>
      </div>
    `;
  },
});

runtime.register({
  name: "PersonalizedForecast",
  schema: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    personalized: z.boolean(),
    recommendations: z.array(z.string()).nullable(),
    unit: z.string().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    windDirection: z.string().optional(),
  }),
  render: (props) => `
    <div style="padding: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <div style="font-size: 14px; opacity: 0.8;">${props.location}</div>
          <div style="font-size: 36px; font-weight: 700;">${props.temperature}°</div>
          <div>${props.condition}</div>
        </div>
        ${props.personalized ? '<div style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 12px;">✨ Personalized</div>' : ''}
      </div>
      ${props.recommendations ? `
        <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 12px;">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">Recommendations for you:</div>
          ${props.recommendations.map(r => `<div style="font-size: 14px; margin-bottom: 4px;">• ${r}</div>`).join('')}
        </div>
      ` : ''}
    </div>
  `,
});

loadTailwind().then(() => {
  runtime.start();
});
```

### Success Criteria

- [ ] All components render correctly
- [ ] Feature showcase demonstrates all APIs
- [ ] File upload/download UI works
- [ ] Tool calling from widget works
- [ ] Modal, close, and external link actions work

---

## Phase 3: Add Feature Showcase Tool

### Overview
Add a server-side tool that triggers the comprehensive feature showcase component.

### Changes Required

**File**: `examples/mcp-server-with-ui/src/server.ts`

```typescript
// =============================================================================
// Tool: feature_showcase (Comprehensive Feature Demo)
// =============================================================================

toolWithUI({
  name: "feature_showcase",
  description: "Launch the comprehensive AUI feature showcase. Demonstrates ALL client-side APIs including file handling, tool calling, modals, and more.",
  parameters: z.object({
    title: z.string().optional().default("AUI Feature Showcase"),
  }),
  component: "FeatureShowcase",
  // Include all feature annotations for demonstration
  annotations: {
    readOnlyHint: true,
  },
  invocationMessages: {
    invoking: "Loading feature showcase...",
    invoked: "Feature showcase ready!",
  },
  execute: async ({ title }) => {
    return {
      component: "FeatureShowcase",
      props: { title },
      text: `AUI Feature Showcase: ${title}`,
    };
  },
  transformResult: (result, _args) => {
    if (typeof result === "object" && "component" in result) {
      return result as Record<string, unknown>;
    }
    return { content: [{ type: "text", text: String(result) }] };
  },
});
```

---

## Phase 4: Documentation Update

### Overview
Update README to document all demonstrated features.

### Changes Required

**File**: `examples/mcp-server-with-ui/README.md`

```markdown
# MCP Server With UI Example

Comprehensive example demonstrating **ALL** features of `@assistant-ui/tool-ui-server`.

## Features Demonstrated

### Server-Side Features

| Feature | Tool | Description |
|---------|------|-------------|
| Basic Tool | `get_weather` | Standard tool with UI component |
| Tool Annotations | `delete_location` | `destructiveHint`, `completionMessage` |
| Invocation Messages | `get_weather_alerts` | `invoking`/`invoked` status messages |
| Read-Only Hint | `get_weather_alerts` | `readOnlyHint` annotation |
| File Parameters | `analyze_weather_image` | `fileParams` declaration |
| Private Tool | `refresh_weather_data` | `visibility: "private"` |
| Widget Accessible | `refresh_weather_data` | `widgetAccessible: true` |
| OAuth Security | `save_favorite_location` | `securitySchemes` with OAuth2 |
| Mixed Security | `get_personalized_forecast` | Both `noauth` and `oauth2` |
| Feature Showcase | `feature_showcase` | Comprehensive demo tool |

### Client-Side Features

| Feature | API | Demonstrated In |
|---------|-----|-----------------|
| Theme Awareness | `getGlobals().theme` | AUI Demo, Feature Showcase |
| Widget State | `setWidgetState()` | AUI Demo, Feature Showcase |
| Display Modes | `requestDisplayMode()` | AUI Demo, Feature Showcase |
| Follow-up Messages | `sendFollowUpMessage()` | AUI Demo, Feature Showcase |
| Height Notification | `notifyIntrinsicHeight()` | All components |
| Global Changes | `onGlobalsChange()` | AUI Demo, Feature Showcase |
| Locale | `getGlobals().locale` | Feature Showcase |
| User Agent | `getGlobals().userAgent` | Feature Showcase |
| Safe Area | `getGlobals().safeArea` | Feature Showcase |
| Max Height | `getGlobals().maxHeight` | Feature Showcase |
| User Location | `getGlobals().userLocation` | Feature Showcase |
| Widget Session ID | `getGlobals().toolResponseMetadata` | Feature Showcase |
| Call Tool | `callTool()` | Feature Showcase |
| Request Modal | `requestModal()` | Feature Showcase |
| Request Close | `requestClose()` | Feature Showcase |
| Open External | `openExternal()` | Feature Showcase |
| Upload File | `uploadFile()` | Feature Showcase |
| Get Download URL | `getFileDownloadUrl()` | Feature Showcase |

### OAuth Features (Server Configuration)

```typescript
createToolUIServer({
  // ... other options ...
  oauth: {
    resource: "https://your-mcp.example.com",
    authorizationServers: ["https://auth.example.com"],
    scopesSupported: ["favorites:read", "favorites:write", "profile:read"],
  },
});
```

## Tools

### `get_weather`
Get current weather and 5-day forecast for a location.

### `compare_weather`
Compare weather between two locations side by side.

### `aui_demo`
Basic AUI protocol demo showing theme, state, and display modes.

### `feature_showcase`
**Comprehensive feature demo** - shows ALL client-side APIs in one interactive component.

### `delete_location`
Delete a saved location. Demonstrates `destructiveHint` annotation.

### `get_weather_alerts`
Get active weather alerts. Demonstrates `readOnlyHint` and invocation messages.

### `analyze_weather_image`
Analyze weather images. Demonstrates file parameter handling.

### `refresh_weather_data`
Private tool callable only from widgets. Demonstrates `visibility` and `widgetAccessible`.

### `save_favorite_location`
OAuth-protected tool. Demonstrates `securitySchemes`.

### `get_personalized_forecast`
Mixed auth tool. Works anonymously but enhanced when authenticated.

## Getting Started

```bash
# Install dependencies
pnpm install

# Build server and UI
pnpm build
pnpm build:ui

# Run the server
pnpm start
```

## Testing All Features

1. **Basic Tools**: Ask for weather in any city
2. **Feature Showcase**: Ask to "show the feature showcase" or "demo all AUI features"
3. **Destructive Action**: Ask to "delete location X" 
4. **Weather Alerts**: Ask for "weather alerts in US-CA"
5. **File Analysis**: Upload an image and ask to analyze it
6. **OAuth Flow**: Try to save a favorite location (requires auth setup)

## File Structure

```
mcp-server-with-ui/
├── src/
│   ├── server.ts              # MCP server with all tool definitions
│   ├── ui-server.ts           # Development UI server
│   └── ui/
│       ├── index.ts           # Runtime setup and component registration
│       ├── aui-demo.ts        # Basic AUI demo component
│       ├── feature-showcase.ts # Comprehensive feature demo
│       ├── delete-confirmation.ts
│       └── weather-alerts.ts
├── manifest.json
├── package.json
└── README.md
```

## Security

- UI components run in sandboxed iframes (`allow-scripts` only)
- Communication via postMessage with origin validation
- PSL-isolated hosting prevents cross-component data access
- Bundle integrity verified via SHA-256 hash
- OAuth tokens validated server-side

## Related Documentation

- [Tool UI Server Package](../../packages/tool-ui-server/README.md)
- [ChatGPT Apps SDK Parity](../../packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md)
- [OAuth Implementation](../../notes/plans/oauth-implementation.md)
```

---

## Testing Strategy

### Manual Testing Checklist

#### Server-Side Features
- [ ] `get_weather` returns weather data with UI
- [ ] `compare_weather` shows side-by-side comparison
- [ ] `delete_location` shows destructive hint in client
- [ ] `get_weather_alerts` shows invocation messages
- [ ] `analyze_weather_image` accepts file parameter
- [ ] `refresh_weather_data` is hidden from model but callable from widget
- [ ] `save_favorite_location` requires authentication
- [ ] `get_personalized_forecast` works both anonymous and authenticated
- [ ] `feature_showcase` loads comprehensive demo

#### Client-Side Features (via Feature Showcase)
- [ ] Theme toggle reflects immediately
- [ ] Widget state persists across re-renders
- [ ] Display mode buttons work (inline, fullscreen, pip)
- [ ] Follow-up message triggers assistant response
- [ ] Modal opens successfully
- [ ] Close button dismisses widget
- [ ] External link opens in new tab
- [ ] Call tool returns result in UI
- [ ] Private tool is callable from widget
- [ ] File upload shows file ID
- [ ] Download URL is retrievable
- [ ] All context info displays correctly

---

## Success Criteria

### Automated
- [ ] All code compiles: `pnpm build`
- [ ] UI bundle builds: `pnpm build:ui`
- [ ] Server starts without errors: `pnpm start`

### Manual
- [ ] All 10 tools are callable
- [ ] Feature showcase demonstrates all 16+ client APIs
- [ ] OAuth flow shows proper auth required message
- [ ] README accurately documents all features

---

## Implementation Order

1. **Phase 1**: Add server-side tools (30 min)
2. **Phase 2**: Add UI components (45 min)
3. **Phase 3**: Add feature showcase tool (10 min)
4. **Phase 4**: Update documentation (20 min)
5. **Testing**: Manual verification (30 min)

**Total estimated time**: ~2.5 hours

---

## References

- [ChatGPT Apps SDK Parity Doc](../../packages/tool-ui-server/CHAGPT_APPS_SDK_PARITY.md)
- [OAuth Implementation Plan](./oauth-implementation.md)
- [Original Feature Parity Research](../research/chatgpt-apps-feature-parity.md)

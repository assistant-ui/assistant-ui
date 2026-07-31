import {
  frontendTools,
  unstable_injectInteractableContext as injectInteractableContext,
  type FrontendTools,
} from "@assistant-ui/react-ai-sdk";
import { NextResponse } from "next/server";
import { tool, zodSchema, type ToolSet } from "ai";
import { z } from "zod";
import type { XuluxAgentDefinition } from "../chat/agents";

const previewStageIds = new Set(["S1", "S2", "S3", "S4", "S5", "S6", "S7"]);
const weatherStageIds = new Set(["S3", "S4", "S5", "S6", "S7"]);
const interactableStageIds = new Set(["S5", "S6", "S7"]);

const locations = {
  "san francisco": {
    name: "San Francisco",
    country: "United States",
    latitude: 37.7749,
    longitude: -122.4194,
    temperature: 16,
    condition: "Partly cloudy",
    windSpeed: 18,
  },
  singapore: {
    name: "Singapore",
    country: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    temperature: 29,
    condition: "Light rain",
    windSpeed: 11,
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    temperature: 22,
    condition: "Clear",
    windSpeed: 9,
  },
  london: {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    temperature: 13,
    condition: "Overcast",
    windSpeed: 21,
  },
} as const;

function findLocation(query: string) {
  const normalized = query.trim().toLowerCase();
  return Object.values(locations).find(
    ({ name }) => name.toLowerCase() === normalized,
  );
}

const weatherTools: ToolSet = {
  geocode_location: tool({
    description:
      "Resolve San Francisco, Singapore, Tokyo, or London to coordinates before calling get_weather.",
    inputSchema: zodSchema(
      z.object({ query: z.string().describe("A supported city name") }),
    ),
    execute: async ({ query }) => {
      const location = findLocation(query);
      if (!location) {
        return { success: false as const, error: `No fixture for ${query}` };
      }
      return {
        success: true as const,
        result: {
          name: location.name,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      };
    },
  }),
  get_weather: tool({
    description:
      "Return deterministic current weather after geocode_location provides coordinates.",
    inputSchema: zodSchema(
      z.object({
        location: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    ),
    execute: async ({ location, latitude, longitude }) => {
      const fixture = findLocation(location);
      if (!fixture) {
        return { success: false as const, error: `No fixture for ${location}` };
      }
      return {
        success: true as const,
        id: `course-weather-${fixture.name.toLowerCase().replaceAll(" ", "-")}`,
        location: fixture.name,
        coordinates: { latitude, longitude },
        widget: {
          units: { temperature: "celsius" as const, windSpeed: "km/h" },
          current: {
            temperature: fixture.temperature,
            conditionCode: fixture.condition,
            windSpeed: fixture.windSpeed,
          },
        },
      };
    },
  }),
};

const notepadTool: ToolSet = {
  notepad: tool({
    description:
      "Create a visible editable note for writing tasks. Revise the active note with update_notepad instead of creating a replacement.",
    inputSchema: zodSchema(
      z.object({
        title: z.string().describe("A short title for the note"),
        content: z.string().describe("The complete plain-text note"),
      }),
    ),
  }),
};

export function getLearnPreviewStageId(routeUrl: string): string | null {
  const segments = new URL(routeUrl).pathname.split("/").filter(Boolean);
  const previewIndex = segments.lastIndexOf("preview");
  const stageId = previewIndex === -1 ? undefined : segments[previewIndex + 1];
  const suffix = previewIndex === -1 ? undefined : segments[previewIndex + 2];
  return stageId &&
    suffix === "chat" &&
    segments.length === previewIndex + 3 &&
    previewStageIds.has(stageId)
    ? stageId
    : null;
}

function getUploadedUpdateTools(
  clientTools: FrontendTools,
): ToolSet | NextResponse {
  if (
    !clientTools ||
    typeof clientTools !== "object" ||
    Array.isArray(clientTools)
  ) {
    return {};
  }

  const updateNotepad = clientTools.update_notepad;
  if (!updateNotepad) return {};

  try {
    return frontendTools({ update_notepad: updateNotepad });
  } catch {
    return NextResponse.json(
      { error: "Invalid preview tool definition." },
      { status: 400 },
    );
  }
}

export function createLearnPreviewTools({
  clientTools,
  routeUrl,
}: {
  clientTools: FrontendTools;
  routeUrl: string;
}): ToolSet | NextResponse {
  const stageId = getLearnPreviewStageId(routeUrl);
  if (!stageId) {
    return NextResponse.json(
      { error: "Preview stage not found." },
      { status: 404 },
    );
  }
  if (!weatherStageIds.has(stageId)) return {};
  if (!interactableStageIds.has(stageId)) return { ...weatherTools };

  const updateTools = getUploadedUpdateTools(clientTools);
  if (updateTools instanceof NextResponse) return updateTools;
  return { ...weatherTools, ...notepadTool, ...updateTools };
}

export const learnPreviewAgent: XuluxAgentDefinition = {
  systemPrompt:
    "You are a concise, helpful assistant. Use only the tools available in this course stage.",
  maxSteps: 5,
  maxOutputTokens: 4_096,
  modelName: "gpt-5.4-mini",
  traceName: "xulux_learn_preview",
  getTraceMetadata: ({ routeUrl }) => ({
    course_id: "build-generative-ui-assistant",
    stage_id: getLearnPreviewStageId(routeUrl) ?? "unknown",
  }),
  allowRequestSystemPrompt: false,
  resolveSessionId: ({ routeUrl }) =>
    new URL(routeUrl).searchParams.get("sessionId"),
  prepareMessages: ({ messages, routeUrl }) => {
    const stageId = getLearnPreviewStageId(routeUrl);
    return stageId && interactableStageIds.has(stageId)
      ? injectInteractableContext(messages)
      : messages;
  },
  prepareTools: ({ clientTools, routeUrl }) =>
    createLearnPreviewTools({ clientTools, routeUrl }),
};

import type { CallToolResponse } from "./types";
import type { MockConfigState, MockResponse } from "./mock-config";

type MockHandler = (args: Record<string, unknown>) => Promise<CallToolResponse>;

export interface MockToolCallResult extends CallToolResponse {
  _mockVariant?: string;
}

const mockHandlers: Record<string, MockHandler> = {
  search: async (args) => {
    await simulateDelay(500);
    return {
      structuredContent: {
        results: [
          {
            id: "1",
            title: `Result for "${args.query || "search"}"`,
            score: 0.95,
          },
          { id: "2", title: "Another result", score: 0.87 },
          { id: "3", title: "Third result", score: 0.72 },
        ],
        total: 3,
      },
    };
  },

  get_weather: async (args) => {
    await simulateDelay(300);
    const location = (args.location as string) || "San Francisco";
    return {
      structuredContent: {
        location,
        temperature: 72,
        condition: "sunny",
        humidity: 45,
        forecast: [
          { day: "Today", high: 75, low: 58 },
          { day: "Tomorrow", high: 73, low: 56 },
        ],
      },
    };
  },

  create_item: async (args) => {
    await simulateDelay(400);
    return {
      structuredContent: {
        success: true,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...args,
      },
    };
  },

  delete_item: async (args) => {
    await simulateDelay(200);
    return {
      structuredContent: {
        success: true,
        deleted_id: args.id,
      },
    };
  },

  list_items: async () => {
    await simulateDelay(350);
    return {
      structuredContent: {
        items: [
          { id: "1", name: "Item 1", status: "active" },
          { id: "2", name: "Item 2", status: "pending" },
          { id: "3", name: "Item 3", status: "completed" },
        ],
        total: 3,
        page: 1,
      },
    };
  },

  refresh: async () => {
    await simulateDelay(600);
    return {
      structuredContent: {
        refreshed: true,
        timestamp: new Date().toISOString(),
      },
    };
  },

  refresh_pois: async (args) => {
    await simulateDelay(800);
    return {
      structuredContent: {
        pois: [
          {
            id: "1",
            name: "Golden Gate Bridge",
            category: "landmark",
            lat: 37.8199,
            lng: -122.4783,
            description:
              "Iconic suspension bridge spanning the Golden Gate strait",
            rating: 4.8,
            imageUrl:
              "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400",
          },
          {
            id: "2",
            name: "Fisherman's Wharf",
            category: "entertainment",
            lat: 37.808,
            lng: -122.4177,
            description: "Historic waterfront with restaurants and attractions",
            rating: 4.3,
          },
          {
            id: "3",
            name: "Alcatraz Island",
            category: "museum",
            lat: 37.8267,
            lng: -122.4233,
            description: "Former federal prison, now a museum",
            rating: 4.7,
          },
          {
            id: "4",
            name: "Chinatown",
            category: "shopping",
            lat: 37.7941,
            lng: -122.4078,
            description: "Oldest Chinatown in North America",
            rating: 4.4,
          },
          {
            id: "5",
            name: "Golden Gate Park",
            category: "park",
            lat: 37.7694,
            lng: -122.4862,
            description: "Large urban park with gardens and museums",
            rating: 4.6,
          },
          {
            id: "6",
            name: "Pier 39",
            category: "entertainment",
            lat: 37.8087,
            lng: -122.4098,
            description: "Waterfront shopping and entertainment complex",
            rating: 4.2,
          },
        ],
        timestamp: new Date().toISOString(),
        center: args.center,
        zoom: args.zoom,
      },
    };
  },

  get_poi_details: async (args) => {
    await simulateDelay(400);
    const poiId = args.poi_id as string;
    return {
      structuredContent: {
        id: poiId,
        name: `Details for POI ${poiId}`,
        description: "Full detailed description with more information...",
        address: "123 Main St, San Francisco, CA 94102",
        hours: "9am - 10pm",
        phone: "(555) 123-4567",
        website: "https://example.com",
      },
    };
  },

  toggle_favorite: async (args) => {
    await simulateDelay(200);
    return {
      structuredContent: {
        poi_id: args.poi_id,
        is_favorite: args.is_favorite,
        timestamp: new Date().toISOString(),
      },
    };
  },
};

const defaultHandler: MockHandler = async (args) => {
  await simulateDelay(300);
  return {
    structuredContent: {
      success: true,
      message: "Mock response from Workbench",
      receivedArgs: args,
      timestamp: new Date().toISOString(),
    },
  };
};

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertMockResponse(response: MockResponse): CallToolResponse {
  const result: CallToolResponse = {};

  if (response.structuredContent) {
    result.structuredContent = response.structuredContent;
  }
  if (response.content) {
    result.content = response.content;
  }
  if (response.isError) {
    result.isError = response.isError;
  }
  if (response._meta) {
    result._meta = response._meta;
  }

  return result;
}

export async function handleMockToolCall(
  toolName: string,
  args: Record<string, unknown>,
  mockConfig?: MockConfigState,
): Promise<MockToolCallResult> {
  if (mockConfig?.globalEnabled) {
    const toolConfig = mockConfig.tools[toolName];

    if (toolConfig?.activeVariantId) {
      const variant = toolConfig.variants.find(
        (v) => v.id === toolConfig.activeVariantId,
      );

      if (variant) {
        await simulateDelay(variant.delay);
        const response = convertMockResponse(variant.response);
        return {
          ...response,
          _mockVariant: variant.name,
        };
      }
    }
  }

  const handler = mockHandlers[toolName] || defaultHandler;
  return handler(args);
}

export function registerMockHandler(
  toolName: string,
  handler: MockHandler,
): void {
  mockHandlers[toolName] = handler;
}

export function getAvailableMockTools(): string[] {
  return Object.keys(mockHandlers);
}

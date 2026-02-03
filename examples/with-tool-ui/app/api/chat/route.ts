import { openai } from "@ai-sdk/openai";
import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: await convertToModelMessages(messages),
    tools: {
      get_weather: tool({
        description:
          "Get the current weather for a location. Use this when the user asks about weather.",
        inputSchema: z.object({
          location: z
            .string()
            .describe("The city or location to get weather for"),
        }),
        execute: async ({ location }) => {
          // Simulate API call delay
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Generate realistic mock weather data
          const conditions = [
            "clear",
            "partly-cloudy",
            "cloudy",
            "rain",
            "thunderstorm",
            "snow",
            "fog",
            "windy",
          ] as const;
          const condition =
            conditions[Math.floor(Math.random() * conditions.length)];
          const temperature = Math.floor(Math.random() * 35) + 45;
          const humidity = Math.floor(Math.random() * 40) + 40;
          const windSpeed = Math.floor(Math.random() * 20) + 5;

          const days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          const forecast = days.map((day) => ({
            day,
            tempMin: temperature - Math.floor(Math.random() * 10) - 5,
            tempMax: temperature + Math.floor(Math.random() * 10) + 5,
            condition:
              conditions[Math.floor(Math.random() * conditions.length)],
          }));

          return {
            location: location.charAt(0).toUpperCase() + location.slice(1),
            temperature,
            condition,
            humidity,
            windSpeed,
            current: {
              temp: temperature,
              tempMin: temperature - 5,
              tempMax: temperature + 8,
              condition,
            },
            forecast,
          };
        },
      }),

      get_stock_price: tool({
        description:
          "Get the current stock price for a given ticker symbol. Use this when the user asks about stock prices.",
        inputSchema: z.object({
          symbol: z
            .string()
            .describe("The stock ticker symbol (e.g., AAPL, GOOGL, MSFT)"),
        }),
        execute: async ({ symbol }) => {
          // Simulate API call delay
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Generate realistic mock stock data
          const basePrice = Math.random() * 500 + 50;
          const change = (Math.random() - 0.5) * 20;
          const changePercent = (change / basePrice) * 100;

          return {
            symbol: symbol.toUpperCase(),
            price: basePrice.toFixed(2),
            change: change.toFixed(2),
            changePercent: changePercent.toFixed(2),
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            marketCap: `${(Math.random() * 2 + 0.5).toFixed(2)}T`,
          };
        },
      }),

      // CRYPTO PRICES - Demonstrates live-updating dashboard
      get_crypto_prices: tool({
        description:
          "Get current cryptocurrency prices for Bitcoin, Ethereum, and Solana. Use when user asks about crypto prices.",
        inputSchema: z.object({
          includeHistory: z
            .boolean()
            .optional()
            .describe("Whether to include price history"),
        }),
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return {
            btc: 45000 + (Math.random() - 0.5) * 2000,
            eth: 2500 + (Math.random() - 0.5) * 200,
            sol: 100 + (Math.random() - 0.5) * 20,
            timestamp: new Date().toISOString(),
          };
        },
      }),

      // HTML PREVIEW TOOL - Only Tool UI Runtime can do this!
      // This tool returns raw HTML that gets rendered in a secure sandbox.
      // makeAssistantToolUI CANNOT safely render arbitrary HTML.
      generate_ui: tool({
        description:
          "Generate a custom UI component. Use when user asks to create, generate, or build a UI, widget, card, or visual component.",
        inputSchema: z.object({
          description: z.string().describe("What UI to generate"),
          style: z
            .enum(["minimal", "colorful", "dark"])
            .optional()
            .describe("Visual style"),
        }),
        execute: async ({ description, style = "minimal" }) => {
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Simulate LLM-generated HTML (in production, this could come from an LLM or MCP server)
          const styles = {
            minimal:
              "background: #f8f9fa; color: #333; border: 1px solid #dee2e6;",
            colorful:
              "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;",
            dark: "background: #1a1a2e; color: #eee; border: 1px solid #333;",
          };

          const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 20px;
                ${styles[style]}
                border-radius: 12px;
                min-height: 150px;
              }
              .container { 
                display: flex; 
                flex-direction: column; 
                gap: 12px; 
              }
              .header { 
                font-size: 18px; 
                font-weight: 600; 
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .badge {
                font-size: 10px;
                padding: 2px 6px;
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
                text-transform: uppercase;
              }
              .content { 
                font-size: 14px; 
                opacity: 0.9;
                line-height: 1.5;
              }
              .meta {
                font-size: 11px;
                opacity: 0.6;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid currentColor;
                display: flex;
                justify-content: space-between;
              }
              @keyframes pulse { 
                0%, 100% { opacity: 1; } 
                50% { opacity: 0.7; } 
              }
              .live-dot {
                width: 6px;
                height: 6px;
                background: #4ade80;
                border-radius: 50%;
                animation: pulse 2s infinite;
                display: inline-block;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                ✨ Generated UI
                <span class="badge">${style}</span>
              </div>
              <div class="content">
                ${description}
              </div>
              <div class="meta">
                <span><span class="live-dot"></span> Rendered in sandbox</span>
                <span>Tool UI Runtime</span>
              </div>
            </div>
          </body>
          </html>`;

          return { html, style, description };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

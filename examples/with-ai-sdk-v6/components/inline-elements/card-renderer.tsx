import type { InlineElementPrimitive } from "@assistant-ui/react";

// Card data structure
export interface CardData {
  title: string;
  description: string;
  imageUrl?: string;
  price?: string;
  url?: string;
}

// Card payload
interface CardPayload {
  type: "card";
  data: CardData;
}

/**
 * Card Renderer for inline elements.
 *
 * Matches pattern: %(displayText)[{type: "card", data: {...}}]
 *
 * Example: %(iPhone 15 Pro)[{type: "card", data: {title: "iPhone 15 Pro", price: "$999", ...}}]
 */
export const cardRenderer: InlineElementPrimitive.Renderer<CardPayload> = {
  type: "card",

  match: (text) => {
    // Pattern: %(displayText)[{...}]
    // We need to handle nested braces in the JSON
    const matches: InlineElementPrimitive.Match<CardPayload>[] = [];

    // Find all occurrences of %(...)
    const startRegex = /%\(([^)]+)\)\[\{/g;
    let startMatch;

    while ((startMatch = startRegex.exec(text)) !== null) {
      const displayText = startMatch[1];
      const jsonStart = startMatch.index + startMatch[0].length - 1; // Position of the opening {

      // Find the matching closing brace
      let braceCount = 1;
      let jsonEnd = jsonStart + 1;

      while (jsonEnd < text.length && braceCount > 0) {
        if (text[jsonEnd] === "{") braceCount++;
        if (text[jsonEnd] === "}") braceCount--;
        jsonEnd++;
      }

      // Check if we found the closing bracket after the brace
      if (jsonEnd < text.length && text[jsonEnd] === "]") {
        const jsonStr = text.substring(jsonStart, jsonEnd);

        try {
          const parsed = JSON.parse(jsonStr);

          // Only match if type is "card"
          if (parsed.type === "card" && parsed.data) {
            matches.push({
              index: startMatch.index,
              length: jsonEnd - startMatch.index + 1,
              payload: parsed as CardPayload,
              displayText,
            });
          }
        } catch (e) {
          // Skip invalid JSON
          console.warn("Failed to parse inline element JSON:", jsonStr, e);
        }
      }
    }

    return matches;
  },

  render: ({ payload }) => {
    const { data } = payload;

    return (
      <div className="my-2 inline-block max-w-sm">
        <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-md transition-shadow hover:shadow-lg">
          {data.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={data.imageUrl}
                alt={data.title}
                className="h-20 w-20 rounded-lg object-cover"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h4 className="font-bold text-gray-900 text-sm leading-tight">
                {data.title}
              </h4>
              {data.price && (
                <span className="whitespace-nowrap font-bold text-blue-600 text-sm">
                  {data.price}
                </span>
              )}
            </div>
            {data.description && (
              <p className="mb-2 line-clamp-2 text-gray-600 text-xs">
                {data.description}
              </p>
            )}
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center font-medium text-blue-600 text-xs hover:text-blue-700 hover:underline"
              >
                View details
                <svg
                  className="ml-1 h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  },
};

"use client";

import { getToolUI, registerTool } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import { useChat } from "@ai-sdk/react";
import { z } from "zod";
// import { webSearchTool } from "@/lib/tools";

// const WebSearchToolUI = getToolUI({
//   tool: webSearchTool,
//   render: ({ status, result, addResult }) => {
//     return (
//       <div className="rounded-lg border p-4">
//         status: {status.type}
//         {/* <button
//           onClick={() =>
//             addResult({
//               location: "sf",
//               temperature: 100,
//             })
//           }
//         >
//           complete
//         </button> */}
//         {status.type === "complete" ? (
//           <div className="space-y-2">
//             <p>
//               <strong>Location:</strong> {result?.location}
//             </p>
//             <p>
//               <strong>Temperature:</strong> {result?.temperature}°C
//             </p>
//           </div>
//         ) : (
//           <p>Loading weather data...</p>
//         )}
//       </div>
//     );
//   },
// });

// Proposal for registering individual tools in codebase
// const Confirm = registerTool({
//   tool: confirmationInput,
// });

// Proposal for registering individual tools in codebase
// const Tools = auiToolbox({
//    weather: {...}
// })
// ...
// return (
//    <Tools />
// )
// This allows a user to register everything in one place and ensure they don't create duplicate tools.

// Another implementation option, this however is harder to implement and harder to re-use around a codebase
// const WebSearchToolUI = auiTool({
//   toolName: "weather",
//   parameters: z.object({
//     location: z.string(),
//     temperature: z.number(),
//   }),
//   client: () => ({
//     location: "sf",
//     temperature: 100,
//   }),
//   render: ({ status, result, addResult }) => {
//     return (
//       <div className="rounded-lg border p-4">
//         status: {status.type}
//         <button
//           onClick={() =>
//             addResult({
//               location: "sf",
//               temperature: 100,
//             })
//           }
//         >
//           complete
//         </button>
//         {status.type === "complete" ? (
//           <div className="space-y-2">
//             <p>
//               <strong>Location:</strong> {result?.location}
//             </p>
//             <p>
//               <strong>Temperature:</strong> {result?.temperature}°C
//             </p>
//           </div>
//         ) : (
//           <p>Loading weather data...</p>
//         )}
//       </div>
//     );
//   },
// }).getUI();

export default function Home() {
  return (
    <main className="h-full">
      {/* <Tools /> */}
      {/* <WebSearchToolUI /> */}
      <Thread />
    </main>
  );
}

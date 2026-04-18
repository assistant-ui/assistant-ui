import { Client } from "@langchain/langgraph-sdk";

export const createClient = () => {
  const apiUrl =
    process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ||
    (typeof window !== "undefined"
      ? new URL("/api", window.location.href).href
      : "/api");
  return new Client({ apiUrl });
};

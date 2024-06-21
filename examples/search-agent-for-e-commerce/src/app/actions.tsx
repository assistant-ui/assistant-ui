"use server";

import { openai } from "@ai-sdk/openai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import { nanoid } from "nanoid";
import type { ReactNode } from "react";
import { z } from "zod";
import { CarouselPlugin } from "../components/ui/productcarousel";
import fs from "fs";
import path from "path";
import { streamText } from "ai";

export interface ServerMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientMessage {
  id: string;
  role: "user" | "assistant";
  display: ReactNode;
}

export async function continueConversation(
  input: string,
  indexId: string,
): Promise<ClientMessage> {
  "use server";

  const history = getMutableAIState();

  const result = await streamUI({
    model: openai("gpt-3.5-turbo"),
    temperature: 0,
    system: `\
    You are a friendly assistant that helps the user with shopping on a ecommerce website ('DUMMY SHOP'). You help users with end-to-end shopping experience
    starting from general information about the brands and products, and helping with product discovery, search, and product details, as well as
    product purchase, customer support, fitting questions, technical questions.
    Your responses are solely based on the provided context about the store and its products.
    Right now, the user clicked on the AI assistant widget and your job is to determine their intent.
    The user intent migth not be clear, in this case you ask clarifications questions.
    The user quesiton might not be complete, in this case you ask for follow up questions.
      
    Here's a list of user intents to pick from: 
    - Product search
    - Guideline for clothes fitting
    - Product specific questions
    - Customer support questions (e.g. track purchase, payment issues, order issues)
    - Escalate to human agent
    - Ask a clarification/follow up question
    - Product comparison
    - Promotions, hot deals
    `,
    messages: [...history.get(), { role: "user", content: input, indexId }],
    text: ({ content, done }) => {
      if (done) {
        history.done((messages: ServerMessage[]) => [
          ...messages,
          { role: "assistant", content },
        ]);
      }
      return <div>{content}</div>;
    },
    // toolChoice: 'required', // force the model to call a tool
    // maxToolRoundtrips: 5, // allow up to 5 tool roundtrips
    tools: {
      product_search: {
        description:
          "Search for products on this website using pre-built indices",
        parameters: z.object({
          query: z
            .string()
            .describe(
              "A clear factual product query, potentially including type, name, qualities, characteristics of the product",
            ),
        }),
        generate: async ({ query }) => {
          try {
            console.log("query=", query);
            const response = await fetch(
              `https://dummyjson.com/products/search?q=${query}`,
            );
            const data = await response.json();
            console.log("data=", data);
            if (data.products && data.products.length > 0) {
              const products = data.products.map((item: any) => ({
                thumbnail: item.thumbnail,
                title: item.title,
                description: item.description,
                metadata_3: item.price,
                link: item.url,
              }));
              return <CarouselPlugin products={products} />;
            } else {
              return <p>No products found.</p>;
            }
          } catch (error) {
            return (
              <p>
                Sorry, we are experiencing some error. Please refresh the chat
                and try again.
              </p>
            );
          }
        },
      },
      general_question: {
        description: "User questions not related to products directly",
        parameters: z.object({
          user_question: z
            .string()
            .describe("User questions not related to products directly"),
        }),
        generate: async function* ({ user_question }) {
          const filePath = path.resolve(process.cwd(), "public/shop_info.txt");
          const generalInfo = fs.readFileSync(filePath, "utf-8");
          const result = await streamText({
            model: openai("gpt-3.5-turbo"),
            temperature: 0,
            prompt: `Generate response to user question ${user_question} based on the context ${generalInfo}`,
          });
          let textContent = "";

          for await (const textPart of result.textStream) {
            textContent += textPart;
            yield textContent;
          }
          return textContent;
        },
      },
      clothes_fitting: {
        description:
          "Send to user link to guidelines for clothes fitting https://images.app.goo.gl/LECaeXJfXa7gzYCC8 ",
        parameters: z.object({}),
        generate: async ({}) => {
          const fittingGuidelinesLink =
            "https://images.app.goo.gl/LECaeXJfXa7gzYCC8 ";
          const formattedLink = `<a href="${fittingGuidelinesLink}" target="_blank">Guidelines for clothes fitting</a>`;
          const linkStyle = {
            color: "blue",
            textDecoration: "underline",
          };
          history.done((messages: ServerMessage[]) => [
            ...messages,
            {
              role: "assistant",
              content: formattedLink,
            },
          ]);

          return (
            <a href={fittingGuidelinesLink} target="_blank" style={linkStyle}>
              Guidelines for clothes fitting
            </a>
          );
        },
      },
      escalate: {
        description:
          "Escalate to human agent if none of the other tools seem relevant or the interaction is repetative, or if the user is getting upset",
        parameters: z.object({
          identifiable_info: z
            .string()
            .describe(
              "Email, full name, or order number to make the request identifiable",
            ),
          summary: z.string().describe("Summarize user request concisely"),
        }),
        generate: async function* ({ identifiable_info, summary }) {
          let textContent =
            "I am escalating your question to the human assistant\n\n";
          yield textContent;
          console.log(
            "generating answer while escalating, ",
            identifiable_info,
          );
          const filePath = path.resolve(process.cwd(), "public/shop_info.txt");
          const generalInfo = fs.readFileSync(filePath, "utf-8");
          const result = await streamText({
            model: openai("gpt-3.5-turbo"),
            temperature: 0,
            system: `Generate response to user question ${summary} based on the context ${generalInfo}. Your answer begins with: "While we wait for the human assistant,`,
            messages: [
              {
                role: "user",
                content: summary,
              },
              {
                role: "assistant",
                content: textContent,
              },
            ],
          });

          for await (const textPart of result.textStream) {
            textContent += textPart;
            yield textContent;
          }
          return textContent;
        },
      },
    },
  });

  return {
    id: nanoid(),
    role: "assistant",
    display: result.value,
  };
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    continueConversation,
  },
  initialAIState: [],
  initialUIState: [],
});

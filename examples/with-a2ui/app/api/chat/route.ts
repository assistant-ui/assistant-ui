import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a helpful assistant that can show interactive UI surfaces to help users accomplish tasks. You have 4 capabilities:

1. **Restaurant Finder** - When a user wants to find restaurants, use the show_restaurants tool. Ask for cuisine preferences and location if not provided.
2. **Quiz Game** - When a user wants to play a quiz or trivia game, use the start_quiz tool. Ask for a topic if not provided.
3. **Recipe Assistant** - When a user wants to cook something or find a recipe, use the show_recipe tool. Ask what they want to cook if not provided.
4. **Task Planner** - When a user wants to organize tasks or plan work, use the create_task_board tool. Ask what tasks they need to manage if not provided.

You can also dismiss any surface using dismiss_surface when the user is done with it.

Be conversational and helpful. When showing surfaces, briefly describe what you're showing. Keep your text responses concise.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      show_restaurants: tool({
        description:
          "Show a restaurant finder UI with restaurant options. Use when the user wants to find places to eat.",
        inputSchema: zodSchema(
          z.object({
            cuisine: z
              .string()
              .describe(
                "Type of cuisine, e.g. 'Italian', 'Japanese', 'Mexican'",
              ),
            location: z.string().describe("Location or area to search"),
          }),
        ),
        execute: async ({ cuisine, location }) => {
          const restaurants = [
            {
              id: "r1",
              name: `${cuisine} Garden`,
              rating: 4.8,
              distance: "0.3 mi",
              price: "$$",
              specialty: `Authentic ${cuisine} cuisine`,
            },
            {
              id: "r2",
              name: `The ${cuisine} Place`,
              rating: 4.5,
              distance: "0.7 mi",
              price: "$$$",
              specialty: `Modern ${cuisine} fusion`,
            },
            {
              id: "r3",
              name: `Casa ${cuisine}`,
              rating: 4.3,
              distance: "1.2 mi",
              price: "$",
              specialty: `Traditional family recipes`,
            },
          ];
          return { cuisine, location, restaurants };
        },
      }),

      start_quiz: tool({
        description:
          "Start an interactive quiz game. Use when the user wants to play trivia or test their knowledge.",
        inputSchema: zodSchema(
          z.object({
            topic: z
              .string()
              .describe("Quiz topic, e.g. 'Science', 'History', 'Movies'"),
          }),
        ),
        execute: async ({ topic }) => {
          const questions = [
            {
              question:
                topic === "Science"
                  ? "What planet is known as the Red Planet?"
                  : topic === "History"
                    ? "In what year did the Berlin Wall fall?"
                    : topic === "Movies"
                      ? "Who directed the movie Inception?"
                      : `What is a fundamental concept in ${topic}?`,
              options:
                topic === "Science"
                  ? ["Venus", "Mars", "Jupiter", "Saturn"]
                  : topic === "History"
                    ? ["1987", "1989", "1991", "1993"]
                    : topic === "Movies"
                      ? [
                          "Steven Spielberg",
                          "Christopher Nolan",
                          "Martin Scorsese",
                          "James Cameron",
                        ]
                      : ["Option A", "Option B", "Option C", "Option D"],
              correct: 1,
            },
          ];
          return {
            topic,
            questions,
            currentQuestion: 0,
            score: 0,
            total: questions.length,
          };
        },
      }),

      show_recipe: tool({
        description:
          "Show a recipe with ingredients and cooking steps. Use when the user wants to cook something.",
        inputSchema: zodSchema(
          z.object({
            dish: z.string().describe("Name of the dish to show recipe for"),
          }),
        ),
        execute: async ({ dish }) => {
          const recipes: Record<
            string,
            {
              ingredients: string[];
              steps: string[];
              time: string;
              servings: string;
            }
          > = {
            default: {
              ingredients: [
                "2 cups flour",
                "1 cup sugar",
                "3 eggs",
                "1 cup milk",
                "2 tbsp butter",
                "1 tsp vanilla extract",
              ],
              steps: [
                "Preheat oven to 350F (175C)",
                "Mix dry ingredients in a large bowl",
                "Whisk wet ingredients separately",
                "Combine wet and dry, mix until smooth",
                "Pour into greased pan",
                "Bake for 25-30 minutes until golden",
              ],
              time: "45 min",
              servings: "4",
            },
            pasta: {
              ingredients: [
                "400g spaghetti",
                "200g pancetta",
                "4 egg yolks",
                "100g Pecorino Romano",
                "Black pepper",
                "Salt",
              ],
              steps: [
                "Boil salted water, cook pasta al dente",
                "Crisp pancetta in a pan over medium heat",
                "Whisk egg yolks with grated Pecorino",
                "Drain pasta, reserve 1 cup pasta water",
                "Toss hot pasta with pancetta off heat",
                "Add egg mixture, toss quickly with pasta water",
              ],
              time: "25 min",
              servings: "4",
            },
            salad: {
              ingredients: [
                "1 head romaine lettuce",
                "1 cup croutons",
                "1/2 cup Parmesan",
                "2 anchovy fillets",
                "1 egg yolk",
                "2 tbsp lemon juice",
                "1/3 cup olive oil",
              ],
              steps: [
                "Wash and chop romaine into bite-size pieces",
                "Make dressing: blend anchovy, egg yolk, lemon juice",
                "Slowly whisk in olive oil until emulsified",
                "Toss lettuce with dressing",
                "Top with croutons and shaved Parmesan",
                "Season with black pepper, serve immediately",
              ],
              time: "15 min",
              servings: "2",
            },
          };

          const key = dish.toLowerCase().includes("pasta")
            ? "pasta"
            : dish.toLowerCase().includes("salad")
              ? "salad"
              : "default";
          const recipe = recipes[key]!;
          return { dish, ...recipe };
        },
      }),

      create_task_board: tool({
        description:
          "Create a task planner board to organize work. Use when the user wants to plan or manage tasks.",
        inputSchema: zodSchema(
          z.object({
            title: z.string().describe("Name of the project or task board"),
            tasks: z.array(z.string()).describe("List of tasks to add"),
          }),
        ),
        execute: async ({ title, tasks }) => {
          const taskItems = tasks.map((text, i) => ({
            id: `task-${i}`,
            text,
            status:
              i === 0
                ? "in-progress"
                : ("todo" as "todo" | "in-progress" | "done"),
          }));
          return { title, tasks: taskItems };
        },
      }),

      dismiss_surface: tool({
        description:
          "Dismiss/close an active UI surface. Use when the user is done with a surface or asks to close it.",
        inputSchema: zodSchema(
          z.object({
            surfaceId: z
              .string()
              .describe(
                "The surface to dismiss: 'restaurants', 'quiz', 'recipe', or 'tasks'",
              ),
          }),
        ),
        execute: async ({ surfaceId }) => {
          return { dismissed: surfaceId };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

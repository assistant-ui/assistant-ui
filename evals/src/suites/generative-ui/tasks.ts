import type { Task } from "./types.ts";

/**
 * The six demos OpenAI used to introduce Intelligent UI, rewritten as user
 * requests, and three everyday requests whose best answer is a composed plan
 * rather than a tool. `computed` marks a task whose answer must recompute
 * values as the user changes an input, which spec mode does with `$calc`
 * formulas and a widget with its own code.
 */
export const tasks: Task[] = [
  {
    id: "bike-rear-wheel",
    description: "a step-by-step repair guide",
    prompt:
      "My bike's rear tire is flat. Walk me through taking the rear wheel off, patching the tube, and putting the wheel back on. I have tire levers, a patch kit, and a floor pump.",
    computed: false,
  },
  {
    id: "brisket-planner",
    description: "quantities and timings that scale with the guest count",
    prompt:
      "I'm smoking a brisket for a backyard party. Help me work out how much raw brisket to buy, how much rub to make, and when to start cooking so it's ready at 6 pm. Somewhere between 8 and 20 people are coming, so I want to change the guest count and see everything update.",
    computed: true,
  },
  {
    id: "bill-split",
    description: "an interactive bill calculator",
    prompt:
      "Four of us had dinner and the bill came to $186.40 before tip. One person only had a $14 salad and wants to pay for just that plus tip. Help us split the rest evenly, with a tip we can adjust between 15% and 25%.",
    computed: true,
  },
  {
    id: "monty-hall",
    description: "an explanation the user can play with",
    prompt:
      "I don't get the Monty Hall problem. Explain why switching doors is better, and let me play some rounds myself so I can see how staying and switching compare.",
    computed: true,
  },
  {
    id: "laptop-comparison",
    description: "a comparison of several options",
    prompt:
      "I'm choosing a laptop for a computer science degree with a budget of about $1,500. Compare the MacBook Air, the Dell XPS 14, and the ThinkPad X1 Carbon on performance, battery life, weight, ports, and Linux support, and tell me which you would pick.",
    computed: false,
  },
  {
    id: "road-trip",
    description: "a multi-day route plan",
    prompt:
      "Plan a four-day road trip from San Francisco to Los Angeles along the coast. Tell me where to stay each night, how long each day's drive is, and one thing worth stopping for each day.",
    computed: false,
  },
  {
    id: "dinner-party",
    description: "a dinner plan with a menu, shopping, and timing",
    prompt:
      "Six friends are coming over for Sunday dinner and I want to roast a leg of lamb. Plan the menu with a couple of sides and a dessert, give me a shopping list, and a cooking timeline so everything is on the table at 7 pm.",
    computed: false,
  },
  {
    id: "capsule-wardrobe",
    description: "a wardrobe to buy and combine",
    prompt:
      "I'm moving to Seattle in October for a job with a casual office. Help me put together a capsule wardrobe of about 25 pieces for a rainy fall and winter: what to buy, roughly what it will cost, and how the pieces combine into outfits.",
    computed: false,
  },
  {
    id: "pnw-road-trip",
    description: "a ten-day route with places to stay and a budget",
    prompt:
      "Plan a ten-day road trip around the Pacific Northwest, starting and ending in Seattle. I'd like to see two national parks and a couple of coastal towns. Give me the route, where to stay each night, and a rough budget.",
    computed: false,
  },
];

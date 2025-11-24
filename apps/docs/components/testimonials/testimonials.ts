import profileRawWorks from "./profiles/iVBtd9hs_400x400.jpg";
import profileManuuonly from "./profiles/g2f-gI5N_400x400.jpg";
import profileEliasdevs from "./profiles/vnGL1NHF_400x400.jpg";
import profileLangChain from "./profiles/langchain_400x400.jpg";
import profileHarrisonChase from "./profiles/harrison_chase_400x400.jpg";
import profileHowardGil from "./profiles/howard_gil_400x400.jpg";
import profileAdamSilverman from "./profiles/adam_silverman_400x400.jpg";
import profileAdrian from "./profiles/adian_400x400.jpg";
import profileVirat from "./profiles/virat_400x400.jpg";
import profileDaniel from "./profiles/daniel_400x400.jpg";
import profileAlex from "./profiles/alex_400x400.jpg";
import profileKeithSchacht from "./profiles/keith_schacht_400x400.jpg";
import { StaticImageData } from "next/image";

export type Testimonial = {
  platform: "X";
  avatar: StaticImageData;
  username: string;
  message: string;
  url: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    platform: "X",
    avatar: profileLangChain,
    username: "@LangChainAI",
    message:
      "Build stateful conversational AI agents with LangGraph and assistant-ui.",
    url: "https://x.com/LangChainAI/status/1833896540542558217",
  },
  {
    platform: "X",
    avatar: profileHarrisonChase,
    username: "@hwchase17",
    message:
      "Pleasure to work with Simon… bring streaming, gen UI, and human-in-the-loop with LangGraph Cloud + assistant-ui.",
    url: "https://x.com/hwchase17/status/1833897209747964191",
  },
  {
    platform: "X",
    avatar: profileDaniel,
    username: "@js_craft_hq",
    message:
      "A huge shoutout to @simonfarshid for the cool stuff he makes at assistant-ui",
    url: "https://x.com/js_craft_hq/status/1833911916487458887",
  },
  {
    platform: "X",
    avatar: profileAdamSilverman,
    username: "@adamsilverman",
    message: "assistant-ui powered by LangGraph! It is awesome.",
    url: "https://x.com/adamsilverman/status/1834671925076914687",
  },
  {
    platform: "X",
    avatar: profileAdrian,
    username: "@hungrytrtl",
    message: "assistant-ui… Could save days of UI work.",
    url: "https://x.com/hungrytrtl/status/1856389748321071478",
  },
  {
    platform: "X",
    avatar: profileKeithSchacht,
    username: "@keithschacht",
    message:
      "A great set of pre-built react components for building chatbot experiences.",
    url: "https://x.com/keithschacht/status/1899656102310010984",
  },
  {
    platform: "X",
    avatar: profileVirat,
    username: "@virattt",
    message:
      "My favorite financial assistant is assistant-ui… fully open source… powerful starter tools… integrates with LangSmith and LangGraph.",
    url: "https://x.com/virattt/status/1841957600201736586",
  },
  {
    platform: "X",
    avatar: profileHowardGil,
    username: "@HowardBGil",
    message:
      "Stop building chat interfaces yourself… Just install assistant-ui and you’re done.",
    url: "https://x.com/HowardBGil/status/1833947697872863547",
  },
  {
    platform: "X",
    avatar: profileAlex,
    username: "@replyingaleks",
    message: "assistant-ui goated 🐐🐐",
    url: "https://x.com/replyingaleks/status/1833938146586939645",
  },
];

export const BLOG_TESTIMONIALS: Testimonial[] = [
  {
    platform: "X",
    avatar: profileRawWorks,
    username: "@raw_works",
    message: "i needed this 7 months ago!",
    url: "https://x.com/raw_works/status/1797111840188809472",
  },
  {
    platform: "X",
    avatar: profileEliasdevs,
    username: "@eliasdevs",
    message: "I was able to get it into production in 2 hours",
    url: "https://x.com/eliasdevs/status/1800691268194013219",
  },
  {
    platform: "X",
    avatar: profileManuuonly,
    username: "@manuuonly",
    message:
      "was just thinking of researching a tool that could help me do this. awesome, great product!",
    url: "https://x.com/manuuonly/status/1797511225523454243",
  },
];

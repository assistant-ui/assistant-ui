/// <reference types="@cloudflare/workers-types" />

interface Env {
  OPENAI_API_KEY: string;
  Chat: DurableObjectNamespace;
}

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getApiKey } from "@/lib/credentials.ts";
import type { PersonaTool } from "@/types.ts";

export type StreamEvent = { type: "text"; text: string };

export type LLMParams = {
  model: string;
  system: string;
  userPrompt: string;
  maxTokens: number;
  tools?: PersonaTool[];
};

export interface LLMClient {
  stream(params: LLMParams): AsyncIterable<StreamEvent>;
  generate(params: LLMParams): Promise<string>;
}

class AnthropicLLMClient implements LLMClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: getApiKey("anthropic") });
  }

  private buildTools(
    tools?: PersonaTool[],
  ): Array<{ type: "web_search_20250305"; name: "web_search" }> | undefined {
    if (!tools?.length) return undefined;
    const mapped: Array<{
      type: "web_search_20250305";
      name: "web_search";
    }> = [];
    for (const t of tools) {
      if (t === "web_search") {
        mapped.push({ type: "web_search_20250305", name: "web_search" });
      }
    }
    return mapped.length > 0 ? mapped : undefined;
  }

  async *stream(params: LLMParams): AsyncIterable<StreamEvent> {
    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.userPrompt }],
      tools: this.buildTools(params.tools),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "text", text: event.delta.text };
      }
    }
  }

  async generate(params: LLMParams): Promise<string> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.userPrompt }],
      tools: this.buildTools(params.tools),
    });

    const texts: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") texts.push(block.text);
    }
    if (texts.length === 0) throw new Error("Unexpected response");
    return texts.join("");
  }
}

class OpenAILLMClient implements LLMClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: getApiKey("openai") });
  }

  private buildTools(
    tools?: PersonaTool[],
  ): Array<{ type: "web_search_preview" }> | undefined {
    if (!tools?.length) return undefined;
    const mapped: Array<{ type: "web_search_preview" }> = [];
    for (const t of tools) {
      if (t === "web_search") {
        mapped.push({ type: "web_search_preview" });
      }
    }
    return mapped.length > 0 ? mapped : undefined;
  }

  async *stream(params: LLMParams): AsyncIterable<StreamEvent> {
    const stream = await this.client.responses.create({
      model: params.model,
      instructions: params.system || undefined,
      input: params.userPrompt,
      max_output_tokens: params.maxTokens,
      tools: this.buildTools(params.tools),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta" && "delta" in event) {
        yield { type: "text", text: event.delta as string };
      }
    }
  }

  async generate(params: LLMParams): Promise<string> {
    const response = await this.client.responses.create({
      model: params.model,
      instructions: params.system || undefined,
      input: params.userPrompt,
      max_output_tokens: params.maxTokens,
      tools: this.buildTools(params.tools),
    });

    return response.output_text;
  }
}

const clients = new Map<string, LLMClient>();

function getProviderKey(model: string): string {
  if (
    model.startsWith("gpt-") ||
    model.startsWith("o") ||
    model.startsWith("chatgpt-")
  )
    return "openai";
  return "anthropic";
}

export function getLLMClient(model?: string): LLMClient {
  const key = getProviderKey(model ?? "claude");
  const existing = clients.get(key);
  if (existing) return existing;

  const client =
    key === "openai" ? new OpenAILLMClient() : new AnthropicLLMClient();
  clients.set(key, client);
  return client;
}

import type { ChatProvider } from "./types";

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export interface ProviderOption {
  id: ChatProvider;
  label: string;
  description: string;
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "anthropic",
    label: "Anthropic API",
    description: "Direct hosted Messages API endpoint",
  },
  {
    id: "openai-compatible",
    label: "OpenAI-Compatible Gateway",
    description: "Generic local or remote /v1/chat/completions endpoint",
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local Ollama service through its chat-completions interface",
  },
  {
    id: "vllm",
    label: "vLLM",
    description: "Self-hosted vLLM inference server",
  },
];

export const DEFAULT_PROVIDER: ChatProvider = "anthropic";

export const DEFAULT_PROVIDER_URLS: Record<ChatProvider, string> = {
  anthropic: "https://api.anthropic.com",
  "openai-compatible": "http://127.0.0.1:8000",
  ollama: "http://127.0.0.1:11434",
  vllm: "http://127.0.0.1:8000",
};

export const LOCAL_PROVIDERS: ChatProvider[] = ["ollama", "vllm", "openai-compatible"];

const MODEL_OPTIONS: Record<ChatProvider, ModelOption[]> = {
  anthropic: [
    { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Most capable" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Balanced" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fastest" },
  ],
  "openai-compatible": [
    { id: "gpt-4o-mini", label: "gpt-4o-mini", description: "Example OpenAI-compatible model id" },
    { id: "Qwen/Qwen2.5-Coder-7B-Instruct", label: "Qwen2.5 Coder 7B", description: "Common local coding model" },
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B Instruct", description: "General local assistant" },
  ],
  ollama: [
    { id: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b", description: "Good local coding default" },
    { id: "llama3.1:8b", label: "llama3.1:8b", description: "General-purpose local assistant" },
    { id: "deepseek-coder:6.7b", label: "deepseek-coder:6.7b", description: "Compact coding model" },
  ],
  vllm: [
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B Instruct", description: "Common vLLM deployment" },
    { id: "Qwen/Qwen2.5-Coder-7B-Instruct", label: "Qwen2.5 Coder 7B", description: "Coding-oriented self-hosted model" },
    { id: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B Instruct", description: "Compact inference target" },
  ],
};

export const DEFAULT_MODEL = MODEL_OPTIONS[DEFAULT_PROVIDER][1].id;

export const API_ROUTES = {
  chat: "/api/chat",
  stream: "/api/stream",
  providerHealth: "/api/provider-health",
} as const;

export const MAX_MESSAGE_LENGTH = 100_000;

export const STREAMING_CHUNK_SIZE = 64;

export function getModelOptions(provider: ChatProvider): ModelOption[] {
  return MODEL_OPTIONS[provider];
}

export function getDefaultModelForProvider(provider: ChatProvider): string {
  return MODEL_OPTIONS[provider][0]?.id ?? DEFAULT_MODEL;
}

export function isLocalProvider(provider: ChatProvider): boolean {
  return LOCAL_PROVIDERS.includes(provider);
}

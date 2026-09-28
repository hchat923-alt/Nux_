export type Role = 'user' | 'assistant' | 'system';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
  fileCategory: 'image' | 'pdf' | 'audio' | 'code' | 'text' | 'document' | 'other';
  textContent?: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
}

export interface SearchMetadata {
  isSearching?: boolean;
  query?: string;
  sources?: SearchSource[];
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  text?: string;
  timestamp: number;
  modelUsed?: string;
  isStreaming?: boolean;
  error?: boolean;
  isError?: boolean;
  sender?: 'user' | 'ai' | Role;
  modelId?: string;
  images?: string[];
  attachments?: FileAttachment[];
  searchMetadata?: SearchMetadata;
  isDeepThinking?: boolean;
}

export type ChatMessage = Message;

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  isIncognito?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'Anthropic' | 'OpenAI' | 'DeepSeek' | 'Google' | 'Ollama' | 'OpenRouter' | 'Groq' | 'HuggingFace' | 'SambaNova' | 'Pollinations' | 'Gratisfy';
  description: string;
  descriptionEn?: string;
  badge?: string;
  badgeEn?: string;
  highlight?: boolean;
  contextWindow?: string;
  iconType: 'claude' | 'openai' | 'deepseek' | 'gemini' | 'ollama' | 'openrouter' | 'groq' | 'huggingface' | 'sambanova' | 'pollinations' | 'gratisfy';
  size?: string;
  isLocal?: boolean;
  plan?: 'free' | 'developer' | 'enterprise' | 'pro';
  rateLimit?: string;
  rateLimitEn?: string;
}

import { AIModel } from '../types';
import { Language } from '../utils/i18n';
import { getFullSystemInstruction } from './claudePersona';

const OLLAMA_ENDPOINT_KEY = 'ollama_custom_endpoint';
export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

let lastWorkingEndpoint: string | null = null;

export function getOllamaEndpoint(): string {
  try {
    const saved = localStorage.getItem(OLLAMA_ENDPOINT_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {}
  return lastWorkingEndpoint || DEFAULT_OLLAMA_ENDPOINT;
}

export function setOllamaEndpoint(endpoint: string): void {
  try {
    const clean = (endpoint || '').trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(OLLAMA_ENDPOINT_KEY, clean);
      lastWorkingEndpoint = clean;
    } else {
      localStorage.removeItem(OLLAMA_ENDPOINT_KEY);
      lastWorkingEndpoint = null;
    }
  } catch {}
}

export interface OllamaModelTag {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function getCandidateEndpoints(): string[] {
  const current = getOllamaEndpoint();
  const list = [current, 'http://127.0.0.1:11434', 'http://localhost:11434'];
  return Array.from(new Set(list.map((u) => u.replace(/\/+$/, ''))));
}

/**
 * Fetch list of downloaded/installed models from local Ollama
 */
export async function fetchInstalledOllamaModels(language: Language = 'ar'): Promise<AIModel[]> {
  const candidates = getCandidateEndpoints();
  let rawTags: OllamaModelTag[] = [];

  // 1. Try direct browser fetch across candidates (127.0.0.1 and localhost)
  for (const endpoint of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models)) {
          rawTags = data.models;
          lastWorkingEndpoint = endpoint;
          break;
        }
      }
    } catch (_) {}
  }

  // 2. Fallback to server proxy endpoint if direct browser fetch didn't return
  if (rawTags.length === 0) {
    for (const endpoint of candidates) {
      try {
        const proxyRes = await fetch(`/api/ollama/tags?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'GET',
        });
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          if (Array.isArray(data?.models)) {
            rawTags = data.models;
            lastWorkingEndpoint = endpoint;
            break;
          }
        }
      } catch (_) {}
    }
  }

  if (rawTags.length === 0) {
    return [];
  }

  return rawTags.map((t) => {
    const modelName = t.name || t.model || 'unknown';
    const paramSize = t.details?.parameter_size || '';
    const sizeStr = formatBytes(t.size);
    
    let badgeText = 'محلي';
    if (language === 'en') {
      badgeText = paramSize ? `${paramSize} downloaded` : sizeStr ? `${sizeStr} downloaded` : 'local';
    } else {
      badgeText = paramSize ? `${paramSize} منزل` : sizeStr ? `${sizeStr} منزل` : 'محلي';
    }

    const desc = language === 'en'
      ? `Local model installed on your device via Ollama (${sizeStr ? `Size: ${sizeStr}` : 'Ready to run'}).`
      : `نموذج محلي مثبت على جهازك عبر Ollama (${sizeStr ? `الحجم: ${sizeStr}` : 'جاهز للتشغيل'}).`;

    return {
      id: `ollama:${modelName}`,
      name: modelName,
      provider: 'Ollama' as const,
      description: desc,
      badge: badgeText,
      highlight: true,
      contextWindow: 'Local / 128K',
      iconType: 'ollama' as const,
      size: sizeStr,
      isLocal: true,
    };
  });
}

/**
 * Check if Ollama service is reachable
 */
export async function checkOllamaConnection(language: Language = 'ar'): Promise<{
  connected: boolean;
  modelsCount: number;
  models: AIModel[];
  message: string;
}> {
  try {
    const models = await fetchInstalledOllamaModels(language);
    if (models.length > 0) {
      return {
        connected: true,
        modelsCount: models.length,
        models,
        message: language === 'en'
          ? `Successfully connected to Ollama (${models.length} model(s) installed and ready to run)`
          : `متصل بـ Ollama بنجاح (${models.length} نموذج مثبت وجاهز للتشغيل)`,
      };
    }

    // Try a ping check across direct candidates
    const candidates = getCandidateEndpoints();
    for (const endpoint of candidates) {
      try {
        const pingRes = await fetch(`${endpoint}/api/tags`, { method: 'GET' });
        if (pingRes.ok) {
          return {
            connected: true,
            modelsCount: 0,
            models: [],
            message: language === 'en'
              ? 'Successfully connected to Ollama (no models downloaded yet, run a model using: ollama run qwen2.5:3b)'
              : 'متصل بـ Ollama بنجاح (لا توجد نماذج منزلة بعد، يمكنك تشغيل نموذج عبر: ollama run qwen2.5:3b)',
          };
        }
      } catch (_) {}
    }

    return {
      connected: false,
      modelsCount: 0,
      models: [],
      message: language === 'en'
        ? 'Could not connect to Ollama. Make sure Ollama is running and origin access is allowed via OLLAMA_ORIGINS=*'
        : 'تعذر الاتصال بـ Ollama. تأكد من تشغيل Ollama والسماح بالاتصال من المتصفح عبر متغير OLLAMA_ORIGINS=*',
    };
  } catch (e: any) {
    return {
      connected: false,
      modelsCount: 0,
      models: [],
      message: language === 'en'
        ? `Could not connect to Ollama: ${e?.message || 'Service unavailable'}`
        : `تعذر الاتصال بـ Ollama: ${e?.message || 'الخدمة غير متاحة'}`,
    };
  }
}

/**
 * Chat directly or via proxy with local Ollama
 */
export async function callOllamaChat(
  modelTag: string,
  messages: Array<{ role: string; content: string }>,
  onChunk?: (chunk: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const cleanModel = modelTag.replace(/^ollama:/, '').trim();
  const candidates = getCandidateEndpoints();

  const fullInstruction = getFullSystemInstruction();
  const rawWithSystem = fullInstruction && !messages.some((m) => m.role === 'system')
    ? [{ role: 'system', content: fullInstruction }, ...messages]
    : messages;

  const formattedMessages = rawWithSystem.map((m) => ({
    role: m.role === 'system' ? 'system' : m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
    content: m.content || '',
  }));

  const payload = {
    model: cleanModel,
    messages: formattedMessages,
    stream: Boolean(onChunk),
  };

  let lastError: any = null;

  // 1. Direct browser fetch to local Ollama (tries candidate endpoints)
  for (const endpoint of candidates) {
    try {
      const directRes = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!directRes.ok) {
        const errText = await directRes.text();
        throw new Error(`خطأ من Ollama: ${errText || `كود ${directRes.status}`}`);
      }

      if (onChunk && directRes.body) {
        const reader = directRes.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulated = '';
        let buffer = '';
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              const chunk = parsed.message?.content || parsed.response || '';
              if (chunk) {
                accumulated += chunk;
                onChunk(chunk, accumulated);
              }
              if (parsed.done) {
                isDone = true;
                break;
              }
            } catch (_) {}
          }
        }

        if (accumulated && accumulated.trim()) {
          lastWorkingEndpoint = endpoint;
          return accumulated.trim();
        }
      }

      const data = await directRes.json();
      const reply = data.message?.content || data.response || '';
      if (reply && reply.trim()) {
        if (onChunk) onChunk(reply.trim(), reply.trim());
        lastWorkingEndpoint = endpoint;
        return reply.trim();
      }
    } catch (err: any) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }

  // 2. Try server proxy endpoint (/api/ollama/chat) if direct browser fetch didn't succeed
  for (const endpoint of candidates) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-ollama-endpoint': endpoint,
      };
      if (onChunk) {
        headers['Accept'] = 'text/event-stream';
      }

      const serverRes = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (serverRes.ok) {
        const contentType = serverRes.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && serverRes.body) {
          const reader = serverRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulated = '';
          let buffer = '';
          let isDone = false;

          while (!isDone) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') {
                isDone = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulated += parsed.text;
                  if (onChunk) onChunk(parsed.text, accumulated);
                }
              } catch (_) {}
            }
          }

          if (accumulated && accumulated.trim()) {
            return accumulated.trim();
          }
        }

        const data = await serverRes.json();
        const reply = data.text || data.message?.content || data.response || '';
        if (reply && reply.trim()) {
          if (onChunk) onChunk(reply.trim(), reply.trim());
          return reply.trim();
        }
      }
    } catch (proxyErr) {
      if (signal?.aborted) throw proxyErr;
    }
  }

  // If both direct and proxy failed, format an actionable error message
  const errText = lastError?.message || '';
  if (errText.includes('Failed to fetch') || errText.includes('NetworkError') || errText.includes('aborted')) {
    throw new Error(
      `تعذر على المتصفح إرسال الطلب لـ Ollama محلياً (${cleanModel}):\n\n` +
      `💡 خادمك يعمل حالياً بنجاح! للاتصال به من المتصفح:\n` +
      `1. اضغط زر «إعادة المحاولة الآن» أدناه.\n` +
      `2. إذا كان التطبيق يعمل داخل نافذة مدمجة (iFrame)، افتح التطبيق في علامة تبويب جديدة مستقلة (New Tab) للسماح للمتصفح بالاتصال بـ 127.0.0.1.\n` +
      `3. تأكد أن نافذة الطرفية (Terminal) التي شغلت فيها Ollama لا تزال مفتوحة.`
    );
  }

  throw new Error(
    `فشل الاتصال بنموذج Ollama (${cleanModel}): ${errText || 'تأكد من تشغيل Ollama وتنزيل النموذج'}`
  );
}

import {
  isClaudeModeEnabled,
  setClaudeModeEnabled,
  getIntelligencePersona,
  setIntelligencePersona,
  getActivePersonaPrompt,
  getFullSystemInstruction,
  IntelligencePersona,
} from './claudePersona';
import { getDeepThinkingEnabled } from './deepThinkingService';

export interface UserApiKeys {
  geminiKey?: string;
  deepseekKey?: string;
  openrouterKey?: string;
  groqKey?: string;
  sambanovaKey?: string;
  huggingfaceKey?: string;
  pollinationsKey?: string;
  gratisfyKey?: string;
  claudeModeForGemini?: boolean;
  persona?: IntelligencePersona;
}

const STORAGE_KEY = 'user_custom_api_keys';

// Empty default fallback (server GEMINI_API_KEY is used automatically)
export const DEFAULT_FALLBACK_GEMINI_KEY = '';

let inMemoryApiKeysCache: UserApiKeys | null = null;

export async function syncApiKeysWithServer(): Promise<UserApiKeys> {
  const local = getStoredApiKeys();
  try {
    const res = await fetch('/api/user/keys');
    if (res.ok) {
      const backendKeys = await res.json();
      if (backendKeys && typeof backendKeys === 'object' && !Array.isArray(backendKeys)) {
        let merged = { ...local };
        let hasNewFromBackend = false;
        let hasNewFromLocal = false;

        const keysList: (keyof UserApiKeys)[] = [
          'geminiKey',
          'deepseekKey',
          'openrouterKey',
          'groqKey',
          'sambanovaKey',
          'huggingfaceKey',
          'pollinationsKey',
          'gratisfyKey',
        ];

        for (const k of keysList) {
          const localVal = (typeof local[k] === 'string' ? local[k] as string : '').trim();
          const backendVal = (typeof backendKeys[k] === 'string' ? backendKeys[k] as string : '').trim();

          if (localVal) {
            (merged as any)[k] = localVal;
            if (localVal !== backendVal) {
              hasNewFromLocal = true;
            }
          } else if (backendVal) {
            (merged as any)[k] = backendVal;
            hasNewFromBackend = true;
          }
        }

        if (hasNewFromBackend) {
          saveStoredApiKeys(merged, false);
        } else if (hasNewFromLocal) {
          // Sync local keys to backend
          fetch('/api/user/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          }).catch(() => {});
        }
        return merged;
      }
    }
  } catch (_) {}
  return local;
}

// Immediate initial sync on load
if (typeof window !== 'undefined') {
  syncApiKeysWithServer();
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        inMemoryApiKeysCache = JSON.parse(e.newValue);
        window.dispatchEvent(new CustomEvent('api-keys-updated', { detail: inMemoryApiKeysCache }));
      } catch (_) {}
    }
  });
}

export function getStoredApiKeys(): UserApiKeys {
  const activePersona = getIntelligencePersona();
  const defaults: UserApiKeys = {
    geminiKey: '',
    deepseekKey: '',
    openrouterKey: '',
    groqKey: '',
    sambanovaKey: '',
    huggingfaceKey: '',
    pollinationsKey: '',
    gratisfyKey: '',
    claudeModeForGemini: activePersona === 'claude',
    persona: activePersona,
  };

  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch (_) {}
    }
    if (!raw && typeof sessionStorage !== 'undefined') {
      try {
        raw = sessionStorage.getItem(STORAGE_KEY);
      } catch (_) {}
    }

    if (!raw) {
      if (inMemoryApiKeysCache) return inMemoryApiKeysCache;
      return defaults;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || '__proto__' in parsed) {
      return inMemoryApiKeysCache || defaults;
    }

    // Prototype pollution defense & strict key picking
    const safeString = (v: any) => (typeof v === 'string' ? v.trim() : '');

    const sanitized: UserApiKeys = {
      geminiKey: safeString(parsed.geminiKey),
      deepseekKey: safeString(parsed.deepseekKey),
      openrouterKey: safeString(parsed.openrouterKey),
      groqKey: safeString(parsed.groqKey),
      sambanovaKey: safeString(parsed.sambanovaKey),
      huggingfaceKey: safeString(parsed.huggingfaceKey),
      pollinationsKey: safeString(parsed.pollinationsKey),
      gratisfyKey: safeString(parsed.gratisfyKey),
      claudeModeForGemini: activePersona === 'claude',
      persona: activePersona,
    };

    inMemoryApiKeysCache = sanitized;
    return sanitized;
  } catch {
    return inMemoryApiKeysCache || defaults;
  }
}

export function saveStoredApiKeys(keys: UserApiKeys, syncToBackend = true): void {
  try {
    const safeString = (v: any) => (typeof v === 'string' ? v.trim() : '');

    let persona: IntelligencePersona;
    if (keys.persona !== undefined) {
      persona = keys.persona;
      setIntelligencePersona(persona);
    } else {
      persona = getIntelligencePersona();
    }

    // Clean payload strictly with only authorized fields without mutating input object
    const safePayload: UserApiKeys = {
      geminiKey: safeString(keys.geminiKey),
      deepseekKey: safeString(keys.deepseekKey),
      openrouterKey: safeString(keys.openrouterKey),
      groqKey: safeString(keys.groqKey),
      sambanovaKey: safeString(keys.sambanovaKey),
      huggingfaceKey: safeString(keys.huggingfaceKey),
      pollinationsKey: safeString(keys.pollinationsKey),
      gratisfyKey: safeString(keys.gratisfyKey),
      claudeModeForGemini: persona === 'claude',
      persona,
    };

    inMemoryApiKeysCache = safePayload;

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safePayload));
      } catch (_) {}
    }
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safePayload));
      } catch (_) {}
    }

    // Dispatch event to inform any open selector or chat components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-keys-updated', { detail: safePayload }));
    }

    // Backup to backend endpoint asynchronously
    if (syncToBackend && typeof fetch !== 'undefined') {
      fetch('/api/user/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload),
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save API keys', e);
  }
}

/**
 * Format chat history for Google Gemini Multiturn API.
 * Ensures strict alternation between 'user' and 'model' and supports multimodal files/images.
 */
function formatGeminiContents(
  messages: Array<{
    role: string;
    content: string;
    images?: string[];
    attachments?: Array<{
      name: string;
      data?: string;
      type?: string;
      fileCategory?: string;
      textContent?: string;
    }>;
  }>
) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

  for (const m of messages) {
    if (m.role === 'system') continue;
    const parts: Array<any> = [];
    let textParts: string[] = [];

    // Add legacy inline images
    if (Array.isArray(m.images) && m.images.length > 0) {
      for (const imgStr of m.images) {
        if (typeof imgStr !== 'string') continue;
        const match = imgStr.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
    }

    // Add rich file attachments
    if (Array.isArray(m.attachments) && m.attachments.length > 0) {
      for (const file of m.attachments) {
        if (file.textContent) {
          textParts.push(`\n\n📄 [ملف مرفق: ${file.name}]\n\`\`\`\n${file.textContent}\n\`\`\`\n`);
        }
        if (file.data) {
          const match = file.data.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1] || file.type || 'application/pdf';
            if (
              mimeType.startsWith('image/') ||
              mimeType.startsWith('audio/') ||
              mimeType === 'application/pdf'
            ) {
              parts.push({
                inlineData: {
                  mimeType,
                  data: match[2],
                },
              });
            }
          }
        }
      }
    }

    const text = (m.content || '').trim();
    if (text) {
      textParts.unshift(text);
    }

    const combined = textParts.join('\n').trim();
    if (combined) {
      parts.push({ text: combined });
    } else if (parts.length > 0) {
      parts.push({ text: 'يرجى مراجعة وتحليل الملفات المرفقة واستخراج كل التفاصيل منها.' });
    }

    if (parts.length === 0) continue;

    const role = m.role === 'user' ? 'user' : 'model';
    contents.push({
      role,
      parts,
    });
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
  } else if (contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'مرحباً' }] });
  }

  return contents;
}

/**
 * Direct call to Google Gemini using full-stack server endpoint or direct Google fallback
 */
export async function callGeminiDirect(
  apiKey: string,
  modelName: string,
  messages: Array<{
    role: string;
    content: string;
    images?: string[];
    attachments?: any[];
  }>,
  onChunk?: (chunk: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const currentPersona = getIntelligencePersona();
  const fullInstruction = getFullSystemInstruction();
  const chosenModel = modelName || 'gemini-flash-lite-latest';

  // 1. Primary path: Call the full-stack Express server (/api/gemini/chat)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cleanKey) {
      headers['x-gemini-api-key'] = cleanKey;
    }
    if (onChunk) {
      headers['Accept'] = 'text/event-stream';
    }

    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => abortController.abort(), 25000);

    if (signal) {
      if (signal.aborted) {
        abortController.abort();
      } else {
        signal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        model: chosenModel,
        persona: currentPersona,
        claudeMode: currentPersona === 'claude',
        isDeepThinking: getDeepThinkingEnabled(),
        stream: Boolean(onChunk),
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutTimer);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
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
              if (parsed.grounding && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('gemini-grounding-received', { detail: parsed.grounding }));
              }
              if (parsed.text) {
                accumulated += parsed.text;
                if (onChunk) onChunk(parsed.text, accumulated);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && !jsonErr.message.includes('Unexpected')) {
                throw jsonErr;
              }
            }
          }
        }

        if (accumulated.trim()) {
          return accumulated.trim();
        }
      } else {
        const data = await res.json();
        if (data.grounding && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gemini-grounding-received', { detail: data.grounding }));
        }
        if (data.text && data.text.trim()) {
          if (onChunk) onChunk(data.text.trim(), data.text.trim());
          return data.text.trim();
        }
      }
    } else {
      const errorData = await res.json().catch(() => null);
      if (errorData?.code === 'API_KEY_MISSING') {
        throw new Error(errorData.error);
      }
      if (errorData?.error) {
        console.warn('Server Gemini route error:', errorData.error);
      }
    }
  } catch (serverErr: any) {
    if (serverErr?.message?.includes('GEMINI_API_KEY') || serverErr?.message?.includes('مفتاح Gemini')) {
      throw serverErr;
    }
    console.warn('Full-stack /api/gemini/chat failed, attempting direct fallback...', serverErr?.message);
  }

  // 2. Secondary fallback: Direct Google REST endpoint (only if user provided an explicit valid API key)
  if (!cleanKey) {
    throw new Error(
      'لم يتم العثور على مفتاح Gemini API. يرجى التأكد من إضافة GEMINI_API_KEY في ملف .env أو إدخال مفتاحك في نافذة الإعدادات داخل التطبيق.'
    );
  }

  const modelCandidates = [
    chosenModel,
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  const contents = formatGeminiContents(messages);
  const requestBody: any = { contents };
  if (fullInstruction) {
    requestBody.systemInstruction = { parts: [{ text: fullInstruction }] };
  }

  let lastErrorText = '';

  for (const candidate of modelCandidates) {
    const directEndpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${cleanKey}`,
    ];

    for (const url of directEndpoints) {
      const abortController = new AbortController();
      const timeoutTimer = setTimeout(() => abortController.abort(), 12000);

      try {
        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        if (res.ok) {
          const data = await res.json();
          let fullText = '';
          const partsList: any[] = Array.isArray(data)
            ? data.flatMap((item: any) => item.candidates?.[0]?.content?.parts || [])
            : data.candidates?.[0]?.content?.parts || [];

          let thoughtSection = '';
          let answerSection = '';

          for (const p of partsList) {
            if (p?.thought && p?.text) {
              thoughtSection += p.text;
            } else if (p?.text) {
              answerSection += p.text;
            }
          }

          if (thoughtSection.trim()) {
            fullText = `<thought>\n${thoughtSection.trim()}\n</thought>\n\n${answerSection.trim()}`;
          } else {
            fullText = answerSection.trim() || partsList.map((p: any) => p?.text || '').join('');
          }

          if (fullText && fullText.trim()) {
            if (onChunk) onChunk(fullText.trim(), fullText.trim());
            return fullText.trim();
          }
        } else {
          lastErrorText = await res.text();
        }
      } catch (e: any) {
        lastErrorText = e?.name === 'AbortError' ? 'انتهت مهلة الاتصال' : e?.message || 'Network error';
      } finally {
        clearTimeout(timeoutTimer);
      }
    }
  }

  throw new Error(`فشل الاتصال بـ Google Gemini: ${lastErrorText || 'تعذر استرجاع رد'}`);
}

export function normalizeMessagesWithAttachments(
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>
): Array<{ role: string; content: string }> {
  return (messages || []).map((m) => {
    let text = m.content || '';
    if (Array.isArray(m.attachments) && m.attachments.length > 0) {
      for (const file of m.attachments) {
        const fileContent = file.textContent || file.text || file.content || file.extractedText || '';
        const fileName = file.name || 'document';
        if (fileContent && !text.includes(fileName)) {
          text += `\n\n📄 [ملف ومستند مرفق: ${fileName}]\n\`\`\`\n${fileContent}\n\`\`\`\n`;
        }
      }
    }
    return {
      role: m.role,
      content: text,
    };
  });
}

/**
 * Direct call to DeepSeek API using a user-provided API key or server proxy
 */
export async function callDeepSeekDirect(
  apiKey: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void,
  signal?: AbortSignal,
  modelName: string = 'deepseek-chat'
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) throw new Error('مفتاح DeepSeek غير متوفر');

  // Map to official DeepSeek model ids
  let targetModel = 'deepseek-chat';
  if (modelName.toLowerCase().includes('r1') || modelName.toLowerCase().includes('reasoner')) {
    targetModel = 'deepseek-reasoner';
  }

  const normalized = normalizeMessagesWithAttachments(messages);
  const fullInstruction = getFullSystemInstruction();
  const rawWithSystem = fullInstruction && !normalized.some((m) => m.role === 'system')
    ? [{ role: 'system', content: fullInstruction }, ...normalized]
    : normalized;

  const payload = {
    model: targetModel,
    messages: rawWithSystem.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: m.content || '',
    })),
    stream: Boolean(onChunk),
  };

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30000);

  if (signal) {
    if (signal.aborted) {
      abortController.abort();
    } else {
      signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  let lastError = '';

  // 1. Primary path: Call the full-stack server endpoint (/api/deepseek/chat)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-deepseek-api-key': cleanKey,
    };
    if (onChunk) {
      headers['Accept'] = 'text/event-stream';
    }

    const serverRes = await fetch('/api/deepseek/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    clearTimeout(timeout);

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
      const choice = data.choices?.[0]?.message;
      let reply = '';
      if ((choice?.reasoning_content || choice?.reasoning) && choice?.content) {
        reply = `<thought>\n${(choice.reasoning_content || choice.reasoning).trim()}\n</thought>\n\n${choice.content.trim()}`;
      } else {
        reply = data.text || choice?.content || choice?.reasoning_content || choice?.reasoning || '';
      }
      if (reply && reply.trim()) {
        if (onChunk) onChunk(reply.trim(), reply.trim());
        return reply.trim();
      }
    } else {
      const errJson = await serverRes.json().catch(() => ({}));
      lastError = errJson?.error || `HTTP ${serverRes.status}`;
    }
  } catch (e: any) {
    lastError = e?.name === 'AbortError' ? 'انتهت مهلة انتظار DeepSeek' : e?.message || 'Network error';
    console.warn('Server deepseek proxy failed, trying direct:', e);
  } finally {
    clearTimeout(timeout);
  }

  // 2. Direct fetch fallback
  const endpoints = ['https://api.deepseek.com/chat/completions'];

  for (const endpoint of endpoints) {
    const fallbackAbort = new AbortController();
    const fallbackTimeout = setTimeout(() => fallbackAbort.abort(), 20000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          ...payload,
          stream: false,
        }),
        signal: fallbackAbort.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        let reply = '';
        if ((choice?.reasoning_content || choice?.reasoning) && choice?.content) {
          reply = `<thought>\n${(choice.reasoning_content || choice.reasoning).trim()}\n</thought>\n\n${choice.content.trim()}`;
        } else {
          reply = choice?.content || choice?.reasoning_content || choice?.reasoning || '';
        }
        if (reply && reply.trim()) {
          if (onChunk) onChunk(reply.trim(), reply.trim());
          return reply.trim();
        }
      } else {
        const errTxt = await res.text();
        lastError = errTxt;
      }
    } catch (e: any) {
      lastError = e?.message || 'DeepSeek network error';
    } finally {
      clearTimeout(fallbackTimeout);
    }
  }

  throw new Error(`DeepSeek API Error: ${lastError || 'تعذر الاتصال بـ DeepSeek'}`);
}

/**
 * Call OpenRouter API using either the backend proxy (/api/openrouter/chat) or direct fetch
 */
export async function callOpenRouterDirect(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const targetModel = modelId.startsWith('openrouter:') ? modelId.replace('openrouter:', '') : modelId;

  const normalized = normalizeMessagesWithAttachments(messages);
  const fullInstruction = getFullSystemInstruction();
  const effectiveMessages = fullInstruction
    ? [{ role: 'system', content: fullInstruction }, ...normalized.filter((m) => m.role !== 'system')]
    : normalized;

  // 1. Try backend proxy first (avoids CORS issues)
  try {
    const res = await fetch('/api/openrouter/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openrouter-api-key': cleanKey,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: effectiveMessages,
        stream: Boolean(onChunk),
      }),
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
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
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              isDone = true;
              break;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.delta?.reasoning || '';
                if (delta) {
                  fullText += delta;
                  onChunk(delta, fullText);
                }
              } catch (_) {}
            }
          }
        }

        if (fullText.trim()) return fullText.trim();
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      let reply = '';
      if ((choice?.reasoning || choice?.reasoning_content) && choice?.content) {
        reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
      } else {
        reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
      }
      if (reply) {
        if (onChunk) onChunk(reply, reply);
        return reply.trim();
      }
    }
  } catch (err) {
    console.warn('Backend OpenRouter proxy failed, falling back to direct fetch:', err);
  }

  // 2. Direct fetch fallback
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://nux-ai.local',
      'X-Title': 'NUX AI Studio',
    },
    body: JSON.stringify({
      model: targetModel,
      messages: effectiveMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  let reply = '';
  if ((choice?.reasoning || choice?.reasoning_content) && choice?.content) {
    reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
  } else {
    reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
  }
  if (onChunk && reply) {
    onChunk(reply, reply);
  }
  return reply.trim();
}

/**
 * Call Groq Cloud API using backend proxy or direct fetch with graceful model fallback
 */
export async function callGroqDirect(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const rawModel = modelId.startsWith('groq:') ? modelId.replace('groq:', '') : modelId;
  const DECOMMISSIONED_GROQ_MAP: Record<string, string> = {
    'minimaxai/minimax-m2.7': 'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
    'deepseek-r1-distill-llama-70b': 'openai/gpt-oss-120b',
    'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
    'mixtral-8x7b-32768': 'openai/gpt-oss-120b',
    'llama-3.2-3b-preview': 'openai/gpt-oss-20b',
    'llama-3.2-1b-preview': 'openai/gpt-oss-20b',
    'llama-3.2-11b-vision-preview': 'qwen/qwen3.8-27b',
    'llama-3.2-90b-vision-preview': 'qwen/qwen3.8-27b',
    'qwen/qwen3': 'qwen/qwen3.8-27b',
    'qwen/qwen3-32b': 'openai/gpt-oss-120b',
    'groq/compound': 'openai/gpt-oss-120b',
    'groq/compound-mini': 'openai/gpt-oss-20b',
  };

  const targetModel = DECOMMISSIONED_GROQ_MAP[rawModel] || rawModel;

  const normalized = normalizeMessagesWithAttachments(messages);
  const fullInstruction = getFullSystemInstruction();
  const effectiveMessages = fullInstruction
    ? [{ role: 'system', content: fullInstruction }, ...normalized.filter((m) => m.role !== 'system')]
    : normalized;

  // Modern high-reliability Groq model candidates
  const candidates = [targetModel];
  const groqFallbacks = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b',
    'canopylabs/orpheus-arabic-saudi',
    'minimaxai/minimax-m2.7',
  ];
  for (const fb of groqFallbacks) {
    if (!candidates.includes(fb)) candidates.push(fb);
  }

  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const currentModel = candidates[i];

    // 1. Try backend proxy
    try {
      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': cleanKey,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: effectiveMessages,
          stream: Boolean(onChunk),
        }),
      });

      if (res.ok) {
        if (onChunk && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let buffer = '';
          let inReasoningMode = false;
          let isDone = false;

          while (!isDone) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (trimmed === 'data: [DONE]') {
                isDone = true;
                break;
              }
              if (trimmed.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const choice = parsed.choices?.[0];
                  const reasonDelta = choice?.delta?.reasoning || choice?.delta?.reasoning_content || '';
                  const contentDelta = choice?.delta?.content || '';

                  if (reasonDelta) {
                    if (!inReasoningMode) {
                      inReasoningMode = true;
                      const prefix = '<thought>\n';
                      fullText += prefix;
                      onChunk(prefix, fullText);
                    }
                    fullText += reasonDelta;
                    onChunk(reasonDelta, fullText);
                  } else if (contentDelta) {
                    if (inReasoningMode) {
                      inReasoningMode = false;
                      const suffix = '\n</thought>\n\n';
                      fullText += suffix;
                      onChunk(suffix, fullText);
                    }
                    fullText += contentDelta;
                    onChunk(contentDelta, fullText);
                  }
                } catch (_) {}
              }
            }
          }

          if (inReasoningMode) {
            const suffix = '\n</thought>\n\n';
            fullText += suffix;
            onChunk(suffix, fullText);
          }

          if (fullText.trim()) return fullText.trim();
        }

        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        let reply = '';
        const isDeepThinkingOn = getDeepThinkingEnabled();
        if (isDeepThinkingOn && (choice?.reasoning || choice?.reasoning_content) && choice?.content) {
          reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
        } else {
          reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
        }
        if (reply) {
          if (onChunk) onChunk(reply, reply);
          return reply.trim();
        }
      }

      // Check if error indicates model is missing/decommissioned
      const errText = await res.text();
      const isMissingModel =
        res.status === 404 ||
        res.status === 400 ||
        errText.includes('model_not_found') ||
        errText.includes('model_decommissioned') ||
        errText.includes('does not exist') ||
        errText.includes('decommissioned') ||
        errText.includes('no longer supported');

      if (isMissingModel && i < candidates.length - 1) {
        console.warn(`Groq model '${currentModel}' not found/decommissioned, trying fallback '${candidates[i + 1]}'`);
        continue;
      }
    } catch (err) {
      console.warn('Backend Groq proxy attempt failed:', err);
    }

    // 2. Direct Groq API fallback
    try {
      const directRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: effectiveMessages,
        }),
      });

      if (directRes.ok) {
        const data = await directRes.json();
        const choice = data.choices?.[0]?.message;
        let reply = '';
        const isDeepThinkingOnDirect = getDeepThinkingEnabled();
        if (isDeepThinkingOnDirect && (choice?.reasoning || choice?.reasoning_content) && choice?.content) {
          reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
        } else {
          reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
        }
        if (onChunk && reply) {
          onChunk(reply, reply);
        }
        return reply.trim();
      }

      const directErrText = await directRes.text();
      const isMissingModel =
        directRes.status === 404 ||
        directRes.status === 400 ||
        directErrText.includes('model_not_found') ||
        directErrText.includes('model_decommissioned') ||
        directErrText.includes('does not exist') ||
        directErrText.includes('decommissioned') ||
        directErrText.includes('no longer supported');

      if (isMissingModel && i < candidates.length - 1) {
        console.warn(`Groq model '${currentModel}' directly unavailable, trying fallback '${candidates[i + 1]}'`);
        continue;
      }

      lastError = new Error(`Groq API Error (${directRes.status}): ${directErrText}`);
    } catch (err: any) {
      lastError = err;
      if (i < candidates.length - 1) {
        continue;
      }
    }
  }

  throw lastError || new Error('فشل الاتصال بـ Groq API أو النموذج غير متاح في خطتك الحالية.');
}

/**
 * Call Hugging Face Inference API using backend proxy or direct fetch
 */
export async function callHuggingFaceDirect(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const targetModel = modelId.startsWith('hf:') ? modelId.replace('hf:', '') : modelId;

  const normalized = normalizeMessagesWithAttachments(messages);
  const fullInstruction = getFullSystemInstruction();
  const effectiveMessages = fullInstruction
    ? [{ role: 'system', content: fullInstruction }, ...normalized.filter((m) => m.role !== 'system')]
    : normalized;

  // 1. Try backend proxy
  try {
    const res = await fetch('/api/huggingface/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hf-api-key': cleanKey,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: effectiveMessages,
        stream: Boolean(onChunk),
      }),
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
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
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              isDone = true;
              break;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullText += delta;
                  onChunk(delta, fullText);
                }
              } catch (_) {}
            }
          }
        }

        if (fullText.trim()) return fullText.trim();
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || (Array.isArray(data) ? data[0]?.generated_text : '');
      if (reply) {
        if (onChunk) onChunk(reply, reply);
        return String(reply).trim();
      }
    }
  } catch (err) {
    console.warn('Backend HF proxy failed, falling back to direct fetch:', err);
  }

  // 2. Direct fetch fallback via router or inference endpoint
  const res = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages: effectiveMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Hugging Face API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '';
  if (onChunk && reply) {
    onChunk(reply, reply);
  }
  return reply.trim();
}

/**
 * Call SambaNova Cloud API (https://api.sambanova.ai/v1/chat/completions)
 */
export async function callSambaNovaDirect(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const rawModel = modelId.startsWith('sambanova:') ? modelId.replace('sambanova:', '') : modelId;
  const targetModel = rawModel || 'Meta-Llama-3.3-70B-Instruct';

  const normalized = normalizeMessagesWithAttachments(messages);
  const fullInstruction = getFullSystemInstruction();
  const effectiveMessages = fullInstruction
    ? [{ role: 'system', content: fullInstruction }, ...normalized.filter((m) => m.role !== 'system')]
    : normalized;

  // 1. Try backend proxy
  try {
    const res = await fetch('/api/sambanova/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sambanova-api-key': cleanKey,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: effectiveMessages,
        stream: Boolean(onChunk),
      }),
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let inReasoningMode = false;
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              isDone = true;
              break;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const choice = parsed.choices?.[0];
                const reasonDelta = choice?.delta?.reasoning || choice?.delta?.reasoning_content || '';
                const contentDelta = choice?.delta?.content || '';

                if (reasonDelta) {
                  if (!inReasoningMode) {
                    inReasoningMode = true;
                    const prefix = '<thought>\n';
                    fullText += prefix;
                    onChunk(prefix, fullText);
                  }
                  fullText += reasonDelta;
                  onChunk(reasonDelta, fullText);
                } else if (contentDelta) {
                  if (inReasoningMode) {
                    inReasoningMode = false;
                    const suffix = '\n</thought>\n\n';
                    fullText += suffix;
                    onChunk(suffix, fullText);
                  }
                  fullText += contentDelta;
                  onChunk(contentDelta, fullText);
                }
              } catch (_) {}
            }
          }
        }

        if (inReasoningMode) {
          const suffix = '\n</thought>\n\n';
          fullText += suffix;
          onChunk(suffix, fullText);
        }

        if (fullText.trim()) return fullText.trim();
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      let reply = '';
      const isDeepThinkingOn = getDeepThinkingEnabled();
      if (isDeepThinkingOn && (choice?.reasoning || choice?.reasoning_content) && choice?.content) {
        reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
      } else {
        reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
      }
      if (reply) {
        if (onChunk) onChunk(reply, reply);
        return reply.trim();
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || errData.message;
      if (errMsg) {
        throw new Error(errMsg);
      }
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('SambaNova') || err.message.includes('مفتاح'))) {
      throw err;
    }
    console.warn('Backend SambaNova proxy failed, trying direct fetch:', err);
  }

  // 2. Direct fetch fallback
  const directResObj = await fetch('https://api.sambanova.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages: effectiveMessages,
    }),
  });

  if (!directResObj.ok) {
    const errText = await directResObj.text();
    throw new Error(`SambaNova API Error (${directResObj.status}): ${errText}`);
  }

  const directData = await directResObj.json();
  const directChoice = directData.choices?.[0]?.message;
  let reply = '';
  const isDeepThinkingOnDirect = getDeepThinkingEnabled();
  if (isDeepThinkingOnDirect && (directChoice?.reasoning || directChoice?.reasoning_content) && directChoice?.content) {
    reply = `<thought>\n${(directChoice?.reasoning || directChoice?.reasoning_content || '').trim()}\n</thought>\n\n${directChoice.content.trim()}`;
  } else {
    reply = directChoice?.content || directChoice?.reasoning || directChoice?.reasoning_content || '';
  }
  if (onChunk && reply) {
    onChunk(reply, reply);
  }
  return reply.trim();
}

export function resolvePollinationsModel(rawModel: string): string {
  const clean = (typeof rawModel === 'string' ? rawModel.replace(/^pollinations:/, '') : '').trim().toLowerCase();
  if (clean === 'qwen' || clean.includes('qwen-coder') || clean.includes('qwencoder') || clean.includes('qwen')) {
    return 'qwen-coder';
  }
  if (clean.includes('deepseek-r1') || clean.includes('deepseek-reason') || clean.includes('deepseek')) {
    return 'deepseek';
  }
  if (clean.includes('gemini-thinking') || clean.includes('gemini')) {
    return 'gemini';
  }
  if (
    clean.includes('openai-reasoning') ||
    clean.includes('openai-fast') ||
    clean === 'o1' ||
    clean === 'o3' ||
    clean.startsWith('o1-') ||
    clean.startsWith('o3-') ||
    clean === 'o1-mini' ||
    clean === 'o3-mini'
  ) {
    return 'openai-fast';
  }
  if (clean.includes('openai-large') || clean.includes('gpt-4o-large')) {
    return 'openai-large';
  }
  if (clean === 'openai' || clean.includes('gpt-4')) {
    return 'openai';
  }
  if (clean.includes('llama')) {
    return 'llama';
  }
  if (clean.includes('mistral-large')) {
    return 'mistral-large';
  }
  if (clean.includes('mistral')) {
    return 'mistral';
  }
  if (clean.includes('claude')) {
    return 'claude';
  }
  if (clean.includes('grok')) {
    return 'grok';
  }
  if (clean.includes('glm')) {
    return 'glm';
  }
  return clean || 'openai';
}

/**
 * Call Pollinations AI (Free, no API key needed, zero-failure fallback)
 */
export async function callPollinationsDirect(
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  const targetModel = resolvePollinationsModel(modelId);

  const userKeys = getStoredApiKeys();
  const normalized = normalizeMessagesWithAttachments(messages);
  const nonSystem = normalized.filter((m) => m.role !== 'system');
  const fullInstruction = getFullSystemInstruction();
  const systemPromptContent = fullInstruction
    ? `أنت مساعد مفيد وذكي ومحترف.\n\n${fullInstruction}`
    : 'أنت مساعد مفيد وذكي ومحترف.';

  const effectiveMessages = [
    { role: 'system', content: systemPromptContent },
    ...nonSystem.map((m) => ({ role: m.role || 'user', content: m.content })),
  ];

  // 1. Try backend proxy (handles smart routing and authenticates with x-pollinations-api-key)
  let proxyError = '';
  try {
    const res = await fetch('/api/pollinations/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pollinations-api-key': userKeys.pollinationsKey || '',
      },
      body: JSON.stringify({
        model: targetModel,
        messages: effectiveMessages,
        stream: Boolean(onChunk),
      }),
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let inReasoningMode = false;
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              isDone = true;
              break;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const choice = parsed.choices?.[0];
                const reasonDelta = choice?.delta?.reasoning || choice?.delta?.reasoning_content || '';
                const contentDelta = choice?.delta?.content || '';

                if (reasonDelta) {
                  if (!inReasoningMode) {
                    inReasoningMode = true;
                    const prefix = '<thought>\n';
                    fullText += prefix;
                    onChunk(prefix, fullText);
                  }
                  fullText += reasonDelta;
                  onChunk(reasonDelta, fullText);
                } else if (contentDelta) {
                  if (inReasoningMode) {
                    inReasoningMode = false;
                    const suffix = '\n</thought>\n\n';
                    fullText += suffix;
                    onChunk(suffix, fullText);
                  }
                  fullText += contentDelta;
                  onChunk(contentDelta, fullText);
                }
              } catch (_) {}
            }
          }
        }

        if (inReasoningMode) {
          const suffix = '\n</thought>\n\n';
          fullText += suffix;
          onChunk(suffix, fullText);
        }

        if (fullText.includes('<think>')) {
          fullText = fullText.replace(/<think>/g, '<thought>\n').replace(/<\/think>/g, '\n</thought>\n\n');
        }

        const isCreditError =
          fullText.includes("doesn't have enough credits") ||
          fullText.includes('not enough credits') ||
          fullText.includes('complete a quest') ||
          fullText.includes('Invalid model or alias') ||
          fullText.includes('A valid API key is required');

        if (isCreditError) {
          throw new Error('Pollinations credits exhausted or invalid model, falling back to unlimited engine');
        }

        if (fullText.trim()) return fullText.trim();
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      let reply = '';
      if ((choice?.reasoning || choice?.reasoning_content) && choice?.content) {
        reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
      } else {
        reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
      }
      if (reply.includes('<think>')) {
        reply = reply.replace(/<think>/g, '<thought>\n').replace(/<\/think>/g, '\n</thought>\n\n');
      }

      const isCreditError =
        reply.includes("doesn't have enough credits") ||
        reply.includes('not enough credits') ||
        reply.includes('complete a quest') ||
        reply.includes('Invalid model or alias') ||
        reply.includes('A valid API key is required');

      if (isCreditError) {
        throw new Error('Pollinations credits exhausted or invalid model, falling back to unlimited engine');
      }

      if (reply) {
        if (onChunk) onChunk(reply, reply);
        return reply.trim();
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      proxyError = errData.error || `HTTP ${res.status}`;
    }
  } catch (err: any) {
    proxyError = err?.message || 'Network error';
    console.warn('Backend Pollinations proxy failed:', err);
  }

  // 2. Direct Classic text.pollinations.ai URL request (No API key needed)
  try {
    const lastUserPrompt = [...effectiveMessages].reverse().find((m) => m.role === 'user')?.content || 'مرحبا';
    const systemPromptText = effectiveMessages.find((m) => m.role === 'system')?.content || '';
    const encodedPrompt = encodeURIComponent(lastUserPrompt);
    let classicUrl = `https://text.pollinations.ai/${encodedPrompt}?model=${encodeURIComponent(targetModel)}`;
    if (systemPromptText) {
      classicUrl += `&system=${encodeURIComponent(systemPromptText)}`;
    }

    const classicRes = await fetch(classicUrl, { signal: AbortSignal.timeout(7000) });
    if (classicRes.ok) {
      const textReply = await classicRes.text();
      if (textReply && !textReply.includes('error') && !textReply.includes('Queue full')) {
        if (onChunk) onChunk(textReply, textReply);
        return textReply.trim();
      }
    }
  } catch (_) {}

  throw new Error('تعذر الاتصال بالرابط المجاني في الوقت الحالي. يرجى إعادة المحاولة.');
}

export function resolveGratisfyModel(rawModel: string): string {
  const clean = (typeof rawModel === 'string' ? rawModel.replace(/^gratisfy:/, '') : '').trim();
  if (!clean) return 'llama-3-70b-instruct';
  return clean;
}

export async function callGratisfyDirect(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string; attachments?: any[]; images?: string[] }>,
  onChunk?: (chunk: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  const targetModel = resolveGratisfyModel(modelId);

  const normalized = normalizeMessagesWithAttachments(messages);
  const nonSystem = normalized.filter((m) => m.role !== 'system');
  const fullInstruction = getFullSystemInstruction();
  const systemPromptContent = fullInstruction
    ? `أنت مساعد مفيد وذكي ومحترف.\n\n${fullInstruction}`
    : 'أنت مساعد مفيد وذكي ومحترف.';

  const effectiveMessages = [
    { role: 'system', content: systemPromptContent },
    ...nonSystem.map((m) => ({ role: m.role || 'user', content: m.content })),
  ];

  // 1. Try backend proxy first
  try {
    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cleanKey) {
      proxyHeaders['x-gratisfy-api-key'] = cleanKey;
      proxyHeaders['Authorization'] = `Bearer ${cleanKey}`;
    }

    const res = await fetch('/api/gratisfy/chat', {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({
        model: targetModel,
        messages: effectiveMessages,
        stream: Boolean(onChunk),
      }),
      signal,
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let inReasoningMode = false;
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              isDone = true;
              break;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const choice = parsed.choices?.[0];
                const reasonDelta = choice?.delta?.reasoning || choice?.delta?.reasoning_content || '';
                const contentDelta = choice?.delta?.content || '';

                if (reasonDelta) {
                  if (!inReasoningMode) {
                    inReasoningMode = true;
                    const prefix = '<thought>\n';
                    fullText += prefix;
                    onChunk(prefix, fullText);
                  }
                  fullText += reasonDelta;
                  onChunk(reasonDelta, fullText);
                } else if (contentDelta) {
                  if (inReasoningMode) {
                    inReasoningMode = false;
                    const suffix = '\n</thought>\n\n';
                    fullText += suffix;
                    onChunk(suffix, fullText);
                  }
                  fullText += contentDelta;
                  onChunk(contentDelta, fullText);
                }
              } catch (_) {}
            }
          }
        }

        if (inReasoningMode) {
          const suffix = '\n</thought>\n\n';
          fullText += suffix;
          onChunk(suffix, fullText);
        }

        if (fullText.trim()) return fullText.trim();
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      let reply = '';
      const isDeepThinkingOn = getDeepThinkingEnabled();
      if (isDeepThinkingOn && (choice?.reasoning || choice?.reasoning_content) && choice?.content) {
        reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
      } else {
        reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
      }
      if (reply) {
        if (onChunk) onChunk(reply, reply);
        return reply.trim();
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      const rawErrMsg = errData.error?.message || errData.error || errData.message || '';
      if (typeof rawErrMsg === 'string' && rawErrMsg.includes('plus_required')) {
        throw new Error('هذا النموذج يتطلب اشتراك Plus على Gratisfy. يرجى اختيار نموذج مجاني آخر مثل Llama 3 أو GPT-4o Mini أو DeepSeek.');
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('مفتاح Gratisfy API غير صالح أو منتهي. يرجى التحقق من المفتاح في الإعدادات.');
      }
      if (res.status === 429) {
        throw new Error('تم تجاوز حد الاستخدام على Gratisfy. يرجى الانتظار قليلاً وإعادة المحاولة.');
      }
    }
  } catch (err: any) {
    if (signal?.aborted) throw err;
    if (err?.message && (err.message.includes('Plus') || err.message.includes('مفتاح') || err.message.includes('Gratisfy'))) {
      throw err;
    }
    console.warn('Backend Gratisfy proxy failed, attempting direct fetch:', err);
  }

  // 2. Direct Base URLs fetch fallback
  const baseUrls = [
    'https://api.gratisfy.xyz/v1',
    'https://gratisfy.xyz/api/v1',
    'https://gratisfy.xyz/v1',
  ];

  for (const baseUrl of baseUrls) {
    try {
      const directHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cleanKey) {
        directHeaders['Authorization'] = `Bearer ${cleanKey}`;
      }

      const directRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: directHeaders,
        body: JSON.stringify({
          model: targetModel,
          messages: effectiveMessages,
          stream: false,
        }),
        signal,
      });

      if (directRes.ok) {
        const data = await directRes.json();
        const choice = data.choices?.[0]?.message;
        let reply = '';
        const isDeepThinkingOn = getDeepThinkingEnabled();
        if (isDeepThinkingOn && (choice?.reasoning || choice?.reasoning_content) && choice?.content) {
          reply = `<thought>\n${(choice?.reasoning || choice?.reasoning_content || '').trim()}\n</thought>\n\n${choice.content.trim()}`;
        } else {
          reply = choice?.content || choice?.reasoning || choice?.reasoning_content || '';
        }
        if (reply) {
          if (onChunk) onChunk(reply, reply);
          return reply.trim();
        }
      } else {
        const errText = await directRes.text().catch(() => '');
        if (errText.includes('plus_required')) {
          throw new Error('هذا النموذج يتطلب اشتراك Plus على Gratisfy. يرجى اختيار نموذج مجاني آخر مثل Llama 3 أو GPT-4o Mini أو DeepSeek.');
        }
        if (directRes.status === 401 || directRes.status === 403) {
          throw new Error('مفتاح Gratisfy API غير صالح أو غير مصرح به.');
        }
      }
    } catch (urlErr: any) {
      if (signal?.aborted) throw urlErr;
      if (urlErr?.message && (urlErr.message.includes('Plus') || urlErr.message.includes('مفتاح'))) {
        throw urlErr;
      }
    }
  }

  throw new Error('تعذر استلام رد من نموذج Gratisfy المختار. تأكد من صحة المفتاح في الإعدادات أو اختر نموذجاً آخر.');
}



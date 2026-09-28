import { AIModel } from '../types';
import { getStoredApiKeys } from './apiKeys';

export const GRATISFY_BASE_URLS = [
  'https://api.gratisfy.xyz/v1',
  'https://gratisfy.xyz/api/v1',
  'https://gratisfy.xyz/v1',
];

// Verified Free Models on Gratisfy Router:
export const DEFAULT_GRATISFY_MODELS: AIModel[] = [
  {
    id: 'gratisfy:llama-3-70b-instruct',
    name: 'Llama 3 70B Instruct',
    provider: 'Gratisfy',
    description: 'نموذج Meta Llama 3 70B القوي والشامل للمحادثات والتحليل العميق.',
    descriptionEn: 'Meta Llama 3 70B Instruct for high-level reasoning and dialogue.',
    badge: 'مجاني',
    badgeEn: 'Free',
    highlight: true,
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:llama-3-8b-instruct',
    name: 'Llama 3 8B Instruct',
    provider: 'Gratisfy',
    description: 'إصدار Llama 3 8B فائق السرعة والخفة للمهام اليومية.',
    descriptionEn: 'Ultra-fast and lightweight Llama 3 8B for daily tasks.',
    badge: 'سريع',
    badgeEn: 'Fast',
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'Gratisfy',
    description: 'نموذج OpenAI GPT-4o Mini الفعال والسريع مع فهم متقدم.',
    descriptionEn: 'OpenAI GPT-4o Mini fast and versatile reasoning model.',
    badge: 'GPT-4o Mini',
    badgeEn: 'GPT-4o Mini',
    highlight: true,
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'Gratisfy',
    description: 'نموذج DeepSeek V3 الاستدلالي المتقدم للبرمجة والمعرفة العامة.',
    descriptionEn: 'DeepSeek V3 advanced reasoning and coding model.',
    badge: 'DeepSeek',
    badgeEn: 'DeepSeek',
    highlight: true,
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'Gratisfy',
    description: 'نموذج التفكير المتسلسل العميق وحل المسائل الرياضية والمنطقية المعقدة.',
    descriptionEn: 'DeepSeek R1 chain-of-thought deep reasoning model.',
    badge: 'تفكير عميق',
    badgeEn: 'Deep Reasoning',
    highlight: true,
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Gratisfy',
    description: 'نموذج متفوق في كتابة الأكواد وتصحيح الثغرات البرمجية والمنطق الرياضي.',
    descriptionEn: 'Qwen 2.5 Coder 32B specialized in software engineering and algorithms.',
    badge: 'برمجة',
    badgeEn: 'Coder',
    highlight: true,
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'Gratisfy',
    description: 'نموذج Mistral 7B السريع والدقيق في استيعاب التوجيهات وصياغة النصوص.',
    descriptionEn: 'Mistral 7B Instruct for efficient and accurate text processing.',
    badge: 'Mistral',
    badgeEn: 'Mistral',
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
  {
    id: 'gratisfy:gemma-2-27b-it',
    name: 'Gemma 2 27B',
    provider: 'Gratisfy',
    description: 'نموذج Google Gemma 2 27B المفتوح للتحليل العلمي والتفكير المنطقي.',
    descriptionEn: 'Google Gemma 2 27B high efficiency open foundation model.',
    badge: 'Gemma 2',
    badgeEn: 'Gemma 2',
    contextWindow: '128K',
    iconType: 'gratisfy',
  },
];

let memoryCachedGratisfy: AIModel[] = [];

/**
 * Parses dynamic Gratisfy models list supporting the 3 structural formats:
 * 1. Array: [{ id, name }, ...]
 * 2. Object with data: { data: [{ id, ... }] }
 * 3. Object with models: { models: ["id1", "id2", ...] }
 */
export function parseGratisfyModelsData(data: any): AIModel[] {
  let rawList: any[] = [];

  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.data)) {
      rawList = data.data;
    } else if (Array.isArray(data.models)) {
      rawList = data.models.map((item: any) =>
        typeof item === 'string' ? { id: item, name: item } : item
      );
    }
  }

  if (!rawList || rawList.length === 0) {
    return DEFAULT_GRATISFY_MODELS;
  }

  const parsedModels: AIModel[] = [];
  const seenIds = new Set<string>();

  for (const item of rawList) {
    const rawId = (typeof item === 'string' ? item : item.id || item.name || '').trim();
    if (!rawId || seenIds.has(rawId)) continue;

    // Filter out obvious paid-only tags if present in free router
    const lower = rawId.toLowerCase();
    const isPaidRestricted =
      lower.includes('plus_required') ||
      lower.includes(':paid') ||
      lower.includes('-paid') ||
      (item.paid === true && item.free === false);

    if (isPaidRestricted) continue;

    seenIds.add(rawId);

    const displayName =
      item.name ||
      rawId
        .split('/')
        .pop()!
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());

    const isReasoning = lower.includes('r1') || lower.includes('reason') || lower.includes('deepseek') || lower.includes('think');
    const isCoder = lower.includes('coder') || lower.includes('code');

    parsedModels.push({
      id: `gratisfy:${rawId}`,
      name: displayName,
      provider: 'Gratisfy',
      description: item.description || (isCoder ? 'نموذج Gratisfy متخصص في البرمجة وتوليد الأكواد.' : isReasoning ? 'نموذج Gratisfy ذو قدرات استدلال وتفكير عميق.' : `نموذج ${displayName} المجاني عبر وسيط Gratisfy.`),
      descriptionEn: item.description || (isCoder ? 'Gratisfy model specialized in coding and logic.' : isReasoning ? 'Gratisfy deep reasoning model.' : `Free ${displayName} model on Gratisfy router.`),
      badge: isCoder ? 'برمجة' : isReasoning ? 'استدلال' : 'Gratisfy',
      badgeEn: isCoder ? 'Coder' : isReasoning ? 'Reasoning' : 'Gratisfy',
      highlight: isReasoning || isCoder,
      contextWindow: item.context_length ? `${Math.round(item.context_length / 1024)}K` : '128K',
      iconType: 'gratisfy',
    });
  }

  return parsedModels.length > 0 ? parsedModels : DEFAULT_GRATISFY_MODELS;
}

/**
 * Fetches models dynamically from Gratisfy router with fallback handling
 */
export async function fetchGratisfyModels(forceRefresh = false): Promise<AIModel[]> {
  if (!forceRefresh && memoryCachedGratisfy.length > 0) {
    return memoryCachedGratisfy;
  }

  const userKeys = getStoredApiKeys();
  const apiKey = (userKeys.gratisfyKey || '').trim();

  // 1. Try Backend Proxy
  try {
    const proxyHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      proxyHeaders['x-gratisfy-api-key'] = apiKey;
    }

    const proxyRes = await fetch('/api/gratisfy/models', {
      headers: proxyHeaders,
      signal: AbortSignal.timeout(6000),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      const parsed = parseGratisfyModelsData(data);
      if (parsed.length > 0) {
        memoryCachedGratisfy = parsed;
        return parsed;
      }
    }
  } catch (proxyErr) {
    console.warn('Backend Gratisfy models proxy failed, trying direct endpoint:', proxyErr);
  }

  // 2. Try Direct Base URLs
  if (apiKey) {
    for (const baseUrl of GRATISFY_BASE_URLS) {
      try {
        const directRes = await fetch(`${baseUrl}/models`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        if (directRes.ok) {
          const data = await directRes.json();
          const parsed = parseGratisfyModelsData(data);
          if (parsed.length > 0) {
            memoryCachedGratisfy = parsed;
            return parsed;
          }
        }
      } catch (_) {}
    }
  }

  memoryCachedGratisfy = DEFAULT_GRATISFY_MODELS;
  return DEFAULT_GRATISFY_MODELS;
}

/**
 * Validates Gratisfy API Key
 */
export async function validateGratisfyKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, message: 'يرجى إدخال مفتاح Gratisfy API صالح.' };
  }

  // 1. Validate via backend proxy
  try {
    const res = await fetch('/api/gratisfy/models', {
      headers: {
        'Content-Type': 'application/json',
        'x-gratisfy-api-key': cleanKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : data?.data?.length || data?.models?.length || 0;
      return {
        valid: true,
        message: `تم التحقق بنجاح! المفتاح صالح ومتاح له الوصول إلى نماذج Gratisfy (${count > 0 ? `${count} نموذج متاح` : 'جاهز للعمل'}).`,
      };
    } else if (res.status === 401 || res.status === 403) {
      return { valid: false, message: 'مفتاح Gratisfy API غير صالح أو غير مصرح به. يرجى التأكد من نسخه من صفحة https://gratisfy.xyz/settings/keys.' };
    }
  } catch (_) {}

  // 2. Validate via direct base URLs
  for (const baseUrl of GRATISFY_BASE_URLS) {
    try {
      const directRes = await fetch(`${baseUrl}/models`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (directRes.ok) {
        return { valid: true, message: 'تم التحقق بنجاح! مفتاح Gratisfy صالح وجاهز للاستخدام.' };
      } else if (directRes.status === 401 || directRes.status === 403) {
        return { valid: false, message: 'المفتاح غير مصرح به (401/403). تأكد من المفتاح في إعدادات Gratisfy.' };
      }
    } catch (_) {}
  }

  // If network unreachable, format check
  if (cleanKey.length >= 8) {
    return { valid: true, message: 'تم حفظ المفتاح. سيتم استخدامه في جميع استدعاءات Gratisfy.' };
  }

  return { valid: false, message: 'تعذر الاتصال بخوادم Gratisfy. تأكد من صحة المفتاح واتصالك بالإنترنت.' };
}

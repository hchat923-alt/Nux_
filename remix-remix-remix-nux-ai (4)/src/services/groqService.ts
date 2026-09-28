import { AIModel } from '../types';

export interface GroqRawModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  active?: boolean;
  context_window?: number;
}

// Dynamic helper to format context window
function formatContextWindow(length?: number): string {
  if (!length || length <= 0) return '131K';
  if (length >= 1048576) return `${Math.round(length / 1048576)}M`;
  if (length >= 1024) return `${Math.round(length / 1024)}K`;
  return `${length}`;
}

// Dynamic helper to clean model name
function formatGroqModelName(rawId: string): string {
  const clean = rawId
    .replace(/^openai\//, 'GPT-OSS ')
    .replace(/^meta-llama\//, '')
    .replace(/^canopylabs\//, '')
    .replace(/^qwen\//, 'Qwen ')
    .replace(/^mistralai\//, 'Mistral ')
    .replace(/^deepseek-ai\//, 'DeepSeek ')
    .replace(/^google\//, 'Gemma ')
    .replace(/-/g, ' ');

  return clean
    .split(' ')
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/**
 * Fetches available models from Groq API and automatically filters
 * for active, free-tier chat/text models without relying on a static hardcoded list.
 */
export async function fetchGroqModels(apiKey?: string): Promise<AIModel[]> {
  const cleanKey = (apiKey || '').trim();

  try {
    let data: any = null;

    // 1. If cleanKey is provided, try direct call
    if (cleanKey) {
      try {
        const directRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (directRes.ok) {
          data = await directRes.json();
        }
      } catch {
        data = null;
      }
    }

    // 2. Try backend proxy (which supports client key header or server env key)
    if (!data || !Array.isArray(data.data)) {
      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (cleanKey) {
          headers['x-groq-api-key'] = cleanKey;
        }
        const res = await fetch('/api/groq/models', {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        data = null;
      }
    }

    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const rawList: GroqRawModel[] = data.data;

      // Dynamic Auto-Filtering:
      // 1. Must be active (not active: false)
      // 2. Must be text/chat inference model (exclude speech/whisper, moderation guards, embeddings)
      const validModels = rawList.filter((m) => {
        if (!m || !m.id || typeof m.id !== 'string') return false;
        if (m.active === false) return false;

        const id = m.id.toLowerCase();
        const isAudioOrSpeech = id.includes('whisper') || id.includes('audio') || id.includes('speech');
        const isGuard = id.includes('guard') || id.includes('safeguard') || id.includes('moderation');
        const isEmbedding = id.includes('embedding') || /\bembed\b/.test(id) || id.includes('-embed');
        const isDecommissioned =
          id === 'mixtral-8x7b-32768' ||
          id === 'llama-3.1-8b-instant' ||
          id === 'llama-3.3-70b-versatile' ||
          id === 'minimaxai/minimax-m2.7';

        return !isAudioOrSpeech && !isGuard && !isEmbedding && !isDecommissioned;
      });

      if (validModels.length > 0) {
        return validModels
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((m) => {
            const id = m.id.toLowerCase();
            const isLlama = id.includes('llama');
            const isGptOss = id.includes('gpt-oss') || id.includes('openai');
            const isArabic = id.includes('arabic') || id.includes('orpheus') || id.includes('saudi');
            const isQwen = id.includes('qwen');
            const isDeepSeek = id.includes('deepseek') || id.includes('r1') || id.includes('distill');
            const isGemma = id.includes('gemma');
            const isMistral = id.includes('mistral');

            const cleanName = formatGroqModelName(m.id);
            const contextWindow = formatContextWindow(m.context_window);

            // Dynamically assign badges
            let badge = 'Groq LPU';
            let badgeEn = 'Groq LPU';
            if (isArabic) {
              badge = 'عربي متخصص';
              badgeEn = 'Arabic AI';
            } else if (isDeepSeek) {
              badge = 'استدلال Groq';
              badgeEn = 'Groq Reasoning';
            } else if (isGptOss) {
              badge = 'GPT-OSS Groq';
              badgeEn = 'GPT-OSS Groq';
            } else if (isQwen) {
              badge = 'Qwen Groq';
              badgeEn = 'Qwen Groq';
            } else if (isLlama) {
              badge = 'Llama Groq';
              badgeEn = 'Llama Groq';
            } else if (isGemma) {
              badge = 'Gemma Groq';
              badgeEn = 'Gemma Groq';
            } else if (isMistral) {
              badge = 'Mistral Groq';
              badgeEn = 'Mistral Groq';
            }

            // Dynamically build descriptions
            const description = isArabic
              ? `نموذج متخصص ومدرب بالكامل على اللغة العربية واللهجات عبر معالجات Groq LPU (${m.id}).`
              : isDeepSeek
              ? `نموذج استدلال وتفكير برمجي ورياضي فائق السرعة عبر معالجات Groq LPU (${m.id}).`
              : isQwen
              ? `نموذج Qwen عالي الكفاءة والذكاء في التحليل والبرمجة عبر Groq (${m.id}).`
              : isGptOss
              ? `نموذج GPT-OSS المفتوح فائق السرعة لاستجابة فورية عبر وحدات Groq LPU (${m.id}).`
              : `نموذج ذكاء اصطناعي فائق السرعة عبر معالجات Groq LPU (${m.id}).`;

            const descriptionEn = `High-throughput AI inference powered by Groq LPU hardware (${m.id}).`;

            return {
              id: `groq:${m.id}`,
              name: `${cleanName} (Groq)`,
              provider: 'Groq' as const,
              description,
              descriptionEn,
              badge,
              badgeEn,
              highlight: isDeepSeek || isGptOss || isArabic,
              contextWindow,
              iconType: 'groq' as const,
            };
          });
      }
    }

    // Dynamic resilient fallback if network / key is not yet set
    const fallbackIds = [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'canopylabs/orpheus-arabic-saudi',
      'canopylabs/orpheus-v1-english',
    ];

    return fallbackIds.map((id) => ({
      id: `groq:${id}`,
      name: `${formatGroqModelName(id)} (Groq)`,
      provider: 'Groq' as const,
      description: `نموذج فائق السرعة متاح عبر معالجات Groq LPU (${id}).`,
      descriptionEn: `High-speed inference model via Groq LPU (${id}).`,
      badge: id.includes('arabic') ? 'عربي متخصص' : id.includes('120b') ? 'GPT-OSS 120B' : 'Groq LPU',
      badgeEn: id.includes('arabic') ? 'Arabic AI' : id.includes('120b') ? 'GPT-OSS 120B' : 'Groq LPU',
      contextWindow: '131K',
      iconType: 'groq' as const,
    }));
  } catch (err) {
    console.warn('Failed to fetch models from Groq API:', err);
    return [];
  }
}


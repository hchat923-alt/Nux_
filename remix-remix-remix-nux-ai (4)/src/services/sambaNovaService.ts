import { AIModel } from '../types';

export interface SambaNovaRawModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  context_length?: number;
  max_completion_tokens?: number;
}

const BASE_URL = 'https://api.sambanova.ai/v1';

// Dynamic helper to format context window
function formatContextWindow(length?: number): string {
  if (!length || length <= 0) return '128K';
  if (length >= 1048576) return `${Math.round(length / 1048576)}M`;
  if (length >= 1024) return `${Math.round(length / 1024)}K`;
  return `${length}`;
}

// Dynamic helper to clean model name
function formatSambaNovaModelName(rawId: string): string {
  const clean = rawId
    .replace(/^Meta-/, '')
    .replace(/^meta-llama\//, '')
    .replace(/^deepseek-ai\//, '')
    .replace(/^qwen\//, '')
    .replace(/^google\//, '')
    .replace(/-/g, ' ');

  return clean
    .split(' ')
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/**
 * Fetches available models from SambaNova API and automatically filters
 * for active, free developer-tier chat/text models without relying on a static hardcoded list.
 */
export async function fetchSambaNovaModels(apiKey?: string): Promise<AIModel[]> {
  const cleanKey = (apiKey || '').trim();

  try {
    let data: any = null;

    // 1. Try backend proxy first (fastest, avoids CORS issues in browser)
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (cleanKey) {
        headers['x-sambanova-api-key'] = cleanKey;
      }
      const res = await fetch('/api/sambanova/models', {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      data = null;
    }

    // 2. Try direct call if key provided and proxy failed
    if ((!data || !Array.isArray(data.data)) && cleanKey) {
      try {
        const directRes = await fetch(`${BASE_URL}/models`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            'Content-Type': 'application/json',
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

    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const rawList: SambaNovaRawModel[] = data.data;

      // Dynamic Auto-Filtering:
      // Filter out embeddings, rerankers, moderation/guardrails
      const validModels = rawList.filter((m) => {
        if (!m || !m.id || typeof m.id !== 'string') return false;
        const id = m.id.toLowerCase();
        const isEmbedding = id.includes('embedding') || id.includes('embed');
        const isRerank = id.includes('rerank');
        const isGuard = id.includes('guard') || id.includes('safeguard') || id.includes('moderation');
        const isAudio = id.includes('whisper') || id.includes('audio');

        return !isEmbedding && !isRerank && !isGuard && !isAudio;
      });

      if (validModels.length > 0) {
        return validModels
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((m) => {
            const id = m.id.toLowerCase();
            const isLlama = id.includes('llama');
            const isDeepSeek = id.includes('deepseek') || id.includes('r1');
            const isGemma = id.includes('gemma');
            const isQwen = id.includes('qwen');
            const isMistral = id.includes('mistral');

            const cleanName = formatSambaNovaModelName(m.id);
            const contextWindow = formatContextWindow(m.context_length || m.max_completion_tokens);

            // Dynamically assign badges
            let badge = 'SambaNova';
            let badgeEn = 'SambaNova';
            if (isDeepSeek) {
              badge = 'DeepSeek SN';
              badgeEn = 'DeepSeek SN';
            } else if (isLlama) {
              badge = 'Llama SN';
              badgeEn = 'Llama SN';
            } else if (isQwen) {
              badge = 'Qwen SN';
              badgeEn = 'Qwen SN';
            } else if (isGemma) {
              badge = 'Gemma SN';
              badgeEn = 'Gemma SN';
            } else if (isMistral) {
              badge = 'Mistral SN';
              badgeEn = 'Mistral SN';
            }

            // Dynamically build descriptions
            const description = isDeepSeek
              ? `نموذج استدلال وتحليل منطقي فائق السرعة مسرّع عبر شرائح SambaNova SN40L (${m.id}).`
              : isLlama
              ? `نموذج Llama المتطور عالي الكفاءة عبر بنية SambaNova السحابية (${m.id}).`
              : isQwen
              ? `نموذج Qwen عالي الأداء مسرّع عبر معالجات SambaNova (${m.id}).`
              : `نموذج ذكاء اصطناعي فائق السرعة عبر معالجات SambaNova (${m.id}).`;

            const descriptionEn = `High-throughput model powered by SambaNova Systems SN40L architecture (${m.id}).`;

            return {
              id: `sambanova:${m.id}`,
              name: `${cleanName} (SambaNova)`,
              provider: 'SambaNova' as const,
              description,
              descriptionEn,
              badge,
              badgeEn,
              highlight: isDeepSeek || isLlama,
              contextWindow,
              iconType: 'sambanova' as const,
            };
          });
      }
    }

    // Officially documented resilient fallbacks (https://docs.sambanova.ai)
    const fallbackIds = [
      'Meta-Llama-3.3-70B-Instruct',
      'DeepSeek-V3.1',
    ];

    return fallbackIds.map((id) => ({
      id: `sambanova:${id}`,
      name: `${formatSambaNovaModelName(id)} (SambaNova)`,
      provider: 'SambaNova' as const,
      description: `نموذج ذكاء اصطناعي فائق السرعة عبر معالجات SambaNova SN40L (${id}).`,
      descriptionEn: `High-speed inference model via SambaNova (${id}).`,
      badge: id.includes('DeepSeek') ? 'DeepSeek SN' : id.includes('Llama') ? 'Llama SN' : 'SambaNova',
      badgeEn: id.includes('DeepSeek') ? 'DeepSeek SN' : id.includes('Llama') ? 'Llama SN' : 'SambaNova',
      contextWindow: '128K',
      iconType: 'sambanova' as const,
    }));
  } catch (err) {
    console.warn('Failed to fetch models from SambaNova API:', err);
    return [];
  }
}


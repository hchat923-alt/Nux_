import { AIModel } from '../types';
import { getStoredApiKeys } from './apiKeys';

// Verified Free Text/Chat Models on Pollinations AI:
export const DEFAULT_FALLBACK_POLLINATIONS_MODELS: AIModel[] = [
  {
    id: 'pollinations:openai',
    name: 'OpenAI GPT-4o',
    provider: 'Pollinations',
    description: 'نموذج OpenAI GPT-4o الذكي للمحادثات والتحليل العام.',
    descriptionEn: 'OpenAI GPT-4o flagship model on Pollinations AI.',
    badge: 'GPT-4o',
    badgeEn: 'GPT-4o',
    highlight: true,
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:openai-large',
    name: 'OpenAI GPT-4o Large',
    provider: 'Pollinations',
    description: 'إصدار موسع من OpenAI GPT-4o للمهام المعقدة والتفصيلية.',
    descriptionEn: 'OpenAI GPT-4o Large model on Pollinations AI.',
    badge: 'Large',
    badgeEn: 'Large',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:openai-fast',
    name: 'OpenAI Fast (Reasoning)',
    provider: 'Pollinations',
    description: 'نموذج سريع واستدلالي مبني على معمارية GPT-OSS 20B.',
    descriptionEn: 'Fast reasoning model powered by GPT-OSS 20B architecture.',
    badge: 'استدلال سريع',
    badgeEn: 'Fast Reasoning',
    highlight: true,
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:claude',
    name: 'Claude (Anthropic)',
    provider: 'Pollinations',
    description: 'نموذج Claude ذو التفكير العميق والأسلوب الطبيعي السلس.',
    descriptionEn: 'Claude model with deep natural reasoning and warmth.',
    badge: 'Claude',
    badgeEn: 'Claude',
    highlight: true,
    contextWindow: '200K',
    iconType: 'claude',
  },
  {
    id: 'pollinations:deepseek',
    name: 'DeepSeek V3',
    provider: 'Pollinations',
    description: 'نموذج DeepSeek V3 عالي الذكاء والكفاءة.',
    descriptionEn: 'DeepSeek V3 intelligent model on Pollinations AI.',
    badge: 'DeepSeek',
    badgeEn: 'DeepSeek',
    highlight: true,
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:llama',
    name: 'Llama 3.3 70B',
    provider: 'Pollinations',
    description: 'أقوى نموذج مفتوح المصدر من Meta Llama 3.3 70B.',
    descriptionEn: 'Meta flagship Llama 3.3 70B open model.',
    badge: 'Llama 3.3',
    badgeEn: 'Llama 3.3',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:qwen-coder',
    name: 'Qwen 2.5 Coder',
    provider: 'Pollinations',
    description: 'نموذج Qwen Coder المتفوق في البرمجة وكتابة الأكواد وتصحيحها.',
    descriptionEn: 'Qwen 2.5 Coder specialized in programming and logic.',
    badge: 'برمجة Coder',
    badgeEn: 'Coder',
    highlight: true,
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:gemini',
    name: 'Google Gemini',
    provider: 'Pollinations',
    description: 'نموذج Google Gemini متعدد المهام عالي الأداء.',
    descriptionEn: 'Google Gemini high-performance conversational model.',
    badge: 'Gemini',
    badgeEn: 'Gemini',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:mistral',
    name: 'Mistral AI',
    provider: 'Pollinations',
    description: 'نموذج Mistral AI فائق السرعة والاستجابة الدقيقة.',
    descriptionEn: 'Mistral AI ultra-responsive conversational model.',
    badge: 'Mistral',
    badgeEn: 'Mistral',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:mistral-large',
    name: 'Mistral Large',
    provider: 'Pollinations',
    description: 'أكبر وأقوى نماذج Mistral للتحليلات اللغوية والمنطقية.',
    descriptionEn: 'Mistral Large flagship reasoning model.',
    badge: 'Mistral Large',
    badgeEn: 'Mistral Large',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:grok',
    name: 'xAI Grok',
    provider: 'Pollinations',
    description: 'نموذج xAI Grok المباشر والذكي.',
    descriptionEn: 'xAI Grok conversational intelligence model.',
    badge: 'Grok',
    badgeEn: 'Grok',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
  {
    id: 'pollinations:glm',
    name: 'Zhipu GLM',
    provider: 'Pollinations',
    description: 'نموذج Zhipu GLM ثنائي اللغة والمتقدم في الاستيعاب.',
    descriptionEn: 'Zhipu GLM advanced bilingual language model.',
    badge: 'GLM',
    badgeEn: 'GLM',
    contextWindow: '128K',
    iconType: 'pollinations',
  },
];

const POLLINATIONS_MODELS_URL = 'https://gen.pollinations.ai/text/models';

function formatModelName(rawName: string): string {
  const clean = rawName
    .replace(/^community\//, '')
    .replace(/^[^\/]+\//, '')
    .replace(/-/g, ' ');

  return clean
    .split(' ')
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/**
 * Returns strictly 100% free models that work without any API key.
 */
export async function fetchPollinationsModels(_apiKeyOverride?: string): Promise<AIModel[]> {
  try {
    const res = await fetch('/api/pollinations/models');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // If server returned structured AIModel[], use them
        if (data[0]?.provider === 'Pollinations') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('pollinations-models-updated', { detail: data })
            );
          }
          return data;
        }

        // Filter and map only genuinely free models
        const mapped: AIModel[] = data
          .filter((m: any) => !m.paid_only && (!m.pricing || parseFloat(m.pricing?.promptTextTokens || '0') <= 0.000001))
          .map((m: any) => {
            const rawId = m.name || 'openai';
            const title = m.title || formatModelName(rawId);
            const desc = m.description || `نموذج ${title} المجاني على منصة Pollinations AI.`;
            return {
              id: `pollinations:${rawId}`,
              name: title,
              provider: 'Pollinations',
              description: desc,
              descriptionEn: m.description || `Free model ${title} on Pollinations AI.`,
              badge: 'مجاني',
              badgeEn: 'Free',
              highlight: Boolean(m.reasoning || m.tools),
              contextWindow: m.context_length ? `${Math.round(m.context_length / 1000)}K` : '128K',
              iconType: 'pollinations',
            };
          });

        if (mapped.length > 0) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('pollinations-models-updated', { detail: mapped })
            );
          }
          return mapped;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch pollinations models:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pollinations-models-updated', { detail: DEFAULT_FALLBACK_POLLINATIONS_MODELS })
    );
  }
  return DEFAULT_FALLBACK_POLLINATIONS_MODELS;
}

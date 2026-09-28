import { AIModel } from '../types';
import { Language } from '../utils/i18n';
import { getStoredApiKeys } from './apiKeys';

export interface HuggingFaceAccountInfo {
  valid: boolean;
  username: string;
  isPro: boolean;
  plan: 'FREE' | 'PRO';
  message: string;
  email?: string;
  orgs?: string[];
  models: AIModel[];
}

/**
 * Hugging Face Free Tier Essential and Community Models (38,000+ Community Models access)
 */
export const HUGGINGFACE_FREE_MODELS: AIModel[] = [
  // 5 Essential Models on Hugging Face Free Tier
  {
    id: 'hf:meta-llama/Llama-3.1-8B-Instruct',
    name: 'Llama 3.1 8B (HF Free)',
    provider: 'HuggingFace',
    description: 'النموذج الأساسي المجاني من Meta للاستجابة السريعة وتلخيص النصوص والمحادثات اليومية.',
    descriptionEn: 'Essential Free Tier Meta model for fast response, summarization, and daily chat.',
    badge: 'HF Free أساسي',
    badgeEn: 'HF Free Essential',
    highlight: true,
    contextWindow: '128K',
    iconType: 'huggingface',
    plan: 'free',
    rateLimit: 'رصيد مجاني خادم Serverless',
    rateLimitEn: 'Free Serverless Quota',
  },
  {
    id: 'hf:Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen 2.5 72B (HF Free)',
    provider: 'HuggingFace',
    description: 'النموذج الأساسي المجاني العملاق من علي بابا المتميز في العربية، الرياضيات، والمنطق الشامل.',
    descriptionEn: 'Essential Free Tier Alibaba giant model with superior Arabic, math, and comprehensive logic.',
    badge: 'HF Free أساسي',
    badgeEn: 'HF Free Essential',
    highlight: true,
    contextWindow: '128K',
    iconType: 'huggingface',
    plan: 'free',
    rateLimit: 'رصيد مجاني خادم Serverless',
    rateLimitEn: 'Free Serverless Quota',
  },
  {
    id: 'hf:google/gemma-2-9b-it',
    name: 'Gemma 2 9B (HF Free)',
    provider: 'HuggingFace',
    description: 'النموذج الأساسي المجاني من Google خفيف الوزن وعالي الدقة لصياغة النصوص والتحليل.',
    descriptionEn: 'Essential Free Tier Google model offering high accuracy and concise chat drafting.',
    badge: 'HF Free أساسي',
    badgeEn: 'HF Free Essential',
    highlight: true,
    contextWindow: '8K',
    iconType: 'huggingface',
    plan: 'free',
    rateLimit: 'رصيد مجاني خادم Serverless',
    rateLimitEn: 'Free Serverless Quota',
  },
  {
    id: 'hf:microsoft/Phi-3-mini-4k-instruct',
    name: 'Phi-3 Mini 4K (HF Free)',
    provider: 'HuggingFace',
    description: 'النموذج الأساسي المجاني من مايكروسوفت عالي الكفاءة والمنطق المركز على جودة ودقة الإجابة.',
    descriptionEn: 'Essential Free Tier Microsoft compact model focused on reasoning and factual accuracy.',
    badge: 'HF Free أساسي',
    badgeEn: 'HF Free Essential',
    highlight: true,
    contextWindow: '4K',
    iconType: 'huggingface',
    plan: 'free',
    rateLimit: 'رصيد مجاني خادم Serverless',
    rateLimitEn: 'Free Serverless Quota',
  },
  {
    id: 'hf:mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B v0.3 (HF Free)',
    provider: 'HuggingFace',
    description: 'النموذج الأساسي المجاني من Mistral AI متعدد اللغات ودقيق الاستجابة لمختلف المهام.',
    descriptionEn: 'Essential Free Tier Mistral 7B v0.3 versatile, accurate, and optimized for broad NLP tasks.',
    badge: 'HF Free أساسي',
    badgeEn: 'HF Free Essential',
    highlight: true,
    contextWindow: '32K',
    iconType: 'huggingface',
    plan: 'free',
    rateLimit: 'رصيد مجاني خادم Serverless',
    rateLimitEn: 'Free Serverless Quota',
  },
  // Community Models
  {
    id: 'hf:deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    name: 'DeepSeek R1 Qwen 32B (HF Free)',
    provider: 'HuggingFace',
    description: 'نموذج التفكير المنطقي والاستدلال الرياضي والبرمجي المقطر من DeepSeek R1 مجاناً على HF.',
    descriptionEn: 'Deep step-by-step reasoning distilled from DeepSeek R1 for math and coding on HF.',
    badge: 'HF Free استدلال',
    badgeEn: 'HF Free Reasoning',
    highlight: true,
    contextWindow: '64K',
    iconType: 'huggingface',
    plan: 'free',
  },
  {
    id: 'hf:Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen 2.5 Coder 32B (HF Free)',
    provider: 'HuggingFace',
    description: 'نموذج مجتمعي متخصص عالي الاحترافية في كتابة الأكواد، تصحيح الأخطاء، وهندسة البرمجيات.',
    descriptionEn: 'Specialized model for professional code generation, debugging, and software engineering.',
    badge: 'HF Free برمجة',
    badgeEn: 'HF Free Coder',
    contextWindow: '128K',
    iconType: 'huggingface',
    plan: 'free',
  },
  {
    id: 'hf:HuggingFaceH4/zephyr-7b-beta',
    name: 'Zephyr 7B Beta (HF Free)',
    provider: 'HuggingFace',
    description: 'نموذج Hugging Face الرسمي المدرب على الحوار الطبيعي والمساعدة الذكية المباشرة.',
    descriptionEn: 'Official Hugging Face model fine-tuned for natural dialogue and direct assistance.',
    badge: 'HF Free مجتمعي',
    badgeEn: 'HF Free Community',
    contextWindow: '32K',
    iconType: 'huggingface',
    plan: 'free',
  },
];

/**
 * Enhanced models for Hugging Face PRO ($9/month) subscribers:
 * Includes all Free models with Priority Queue + Exclusive larger models that require Pro.
 */
export const HUGGINGFACE_PRO_EXCLUSIVE_MODELS: AIModel[] = [
  {
    id: 'hf:meta-llama/Llama-3.3-70B-Instruct',
    name: 'Llama 3.3 70B (HF Pro)',
    provider: 'HuggingFace',
    description: 'نموذج Meta الضخم 70B للاستدلال والبرمجة واللغات المتعددة (يتطلب اشتراك Pro $9/شهر).',
    descriptionEn: 'Flagship Meta 70B model for deep reasoning, coding, and multilingual tasks (Requires Pro $9/mo).',
    badge: '⭐ HF Pro (يحتاج Pro)',
    badgeEn: '⭐ HF Pro Required',
    highlight: true,
    contextWindow: '128K',
    iconType: 'huggingface',
    plan: 'pro',
    rateLimit: 'أولوية قصوى ورصيد Pro مخصص',
    rateLimitEn: 'Priority Queue & Pro Credits',
  },
  {
    id: 'hf:CohereForAI/c4ai-command-r-plus',
    name: 'Command R+ (HF Pro)',
    provider: 'HuggingFace',
    description: 'النموذج العملاق من Cohere للأبحاث والمهام المؤسسية المعقدة (يتطلب اشتراك Pro $9/شهر).',
    descriptionEn: 'Cohere flagship enterprise-grade model specialized in RAG and research (Requires Pro $9/mo).',
    badge: '⭐ HF Pro (يحتاج Pro)',
    badgeEn: '⭐ HF Pro Required',
    highlight: true,
    contextWindow: '128K',
    iconType: 'huggingface',
    plan: 'pro',
    rateLimit: 'أولوية قصوى ورصيد Pro مخصص',
    rateLimitEn: 'Priority Queue & Pro Credits',
  },
  {
    id: 'hf:HuggingFaceH4/zephyr-orpo-141b',
    name: 'Zephyr ORPO 141B (HF Pro)',
    provider: 'HuggingFace',
    description: 'نموذج Hugging Face العملاق 141B للمحادثات الفلسفية والمعرفية المتقدمة (يتطلب اشتراك Pro $9/شهر).',
    descriptionEn: 'Massive 141B open-weights model trained with ORPO by Hugging Face (Requires Pro $9/mo).',
    badge: '⭐ HF Pro (يحتاج Pro)',
    badgeEn: '⭐ HF Pro Required',
    highlight: true,
    contextWindow: '64K',
    iconType: 'huggingface',
    plan: 'pro',
    rateLimit: 'أولوية قصوى ورصيد Pro مخصص',
    rateLimitEn: 'Priority Queue & Pro Credits',
  },
];

export const HUGGINGFACE_PRO_MODELS: AIModel[] = [
  ...HUGGINGFACE_PRO_EXCLUSIVE_MODELS,
  ...HUGGINGFACE_FREE_MODELS.map((m) => ({
    ...m,
    badge: m.badge ? m.badge.replace('HF Free', '⭐ HF Pro أولوية') : '⭐ HF PRO',
    badgeEn: m.badgeEn ? m.badgeEn.replace('HF Free', '⭐ HF Pro Priority') : '⭐ HF PRO',
    description: `${m.description} (مفعل بأولوية قصوى وسرعة استدلال مضاعفة مع اشتراك Hugging Face PRO).`,
    descriptionEn: `${m.descriptionEn} (Enabled with priority queue and high throughput via Hugging Face PRO).`,
    plan: 'pro' as const,
  })),
];

const HF_CACHE_KEY = 'nux_hf_account_cache';

export function getCachedHFAccountInfo(): HuggingFaceAccountInfo | null {
  try {
    const raw = localStorage.getItem(HF_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

export function saveCachedHFAccountInfo(info: HuggingFaceAccountInfo): void {
  try {
    localStorage.setItem(HF_CACHE_KEY, JSON.stringify(info));
  } catch (_) {}
}

/**
 * Check Hugging Face token, identify user plan (Free vs PRO), and load supported models
 */
export async function checkHuggingFaceConnection(
  tokenOverride?: string,
  language: Language = 'ar'
): Promise<HuggingFaceAccountInfo> {
  const isEn = language === 'en';
  const apiKey = (tokenOverride ?? getStoredApiKeys().huggingfaceKey ?? '').trim();

  if (!apiKey) {
    const defaultInfo: HuggingFaceAccountInfo = {
      valid: false,
      username: '',
      isPro: false,
      plan: 'FREE',
      message: isEn
        ? 'No Hugging Face token found. Enter a free token in Settings to enable 12+ cloud inference models.'
        : 'لم يتم العثور على مفتاح Hugging Face. أضف مفتاحاً مجانياً في الإعدادات لتشغيل 12+ نموذج سحابي مجاناً.',
      models: HUGGINGFACE_FREE_MODELS,
    };
    return defaultInfo;
  }

  try {
    const res = await fetch('/api/huggingface/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hf-api-key': apiKey,
      },
      body: JSON.stringify({ apiKey }),
    });

    const data = await res.json();

    if (res.ok && data.valid) {
      const isPro = Boolean(data.isPro);
      const username = data.username || data.name || 'Hugging Face User';
      const plan: 'FREE' | 'PRO' = isPro ? 'PRO' : 'FREE';
      const models = isPro ? HUGGINGFACE_PRO_MODELS : HUGGINGFACE_FREE_MODELS;

      const message = isEn
        ? isPro
          ? `Authenticated as ${username} (⭐ Hugging Face PRO Plan) - ${models.length} models with maximum priority.`
          : `Authenticated as ${username} (Free Tier Plan) - ${models.length} serverless inference models ready.`
        : isPro
        ? `تمت المصادقة باسم ${username} (⭐ خطة Hugging Face PRO) - متاح ${models.length} نموذج بأعلى سرعة وأولوية.`
        : `تمت المصادقة باسم ${username} (الخطة المجانية Free Tier) - متاح ${models.length} نموذج استدلال مجاني جاهز.`;

      const info: HuggingFaceAccountInfo = {
        valid: true,
        username,
        isPro,
        plan,
        message,
        email: data.email,
        orgs: data.orgs,
        models,
      };

      saveCachedHFAccountInfo(info);
      return info;
    } else {
      const errMsg = data.message || data.error || (isEn ? 'Invalid Hugging Face Token' : 'مفتاح Hugging Face غير صالح');
      const failInfo: HuggingFaceAccountInfo = {
        valid: false,
        username: '',
        isPro: false,
        plan: 'FREE',
        message: errMsg,
        models: HUGGINGFACE_FREE_MODELS,
      };
      return failInfo;
    }
  } catch (err: any) {
    const errInfo: HuggingFaceAccountInfo = {
      valid: false,
      username: '',
      isPro: false,
      plan: 'FREE',
      message: isEn
        ? `Could not connect to Hugging Face: ${err?.message || 'Network error'}`
        : `تعذر الاتصال بـ Hugging Face: ${err?.message || 'خطأ في الشبكة'}`,
      models: HUGGINGFACE_FREE_MODELS,
    };
    return errInfo;
  }
}

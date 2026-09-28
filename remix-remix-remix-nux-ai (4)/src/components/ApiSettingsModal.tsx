import React, { useState, useEffect } from 'react';
import { X, Key, KeyRound, ShieldCheck, Sparkles, Check, ExternalLink, AlertTriangle, Brain, Bot, Loader2, HardDrive, Terminal, Zap, Cpu, Globe, Copy } from 'lucide-react';
import { getStoredApiKeys, saveStoredApiKeys, syncApiKeysWithServer, UserApiKeys } from '../services/apiKeys';
import { validateGratisfyKey } from '../services/gratisfyService';
import {
  getIntelligencePersona,
  setIntelligencePersona,
  IntelligencePersona,
} from '../services/claudePersona';
import {
  CursorStyle,
  CURSOR_OPTIONS,
  getStreamingCursorStyle,
  setStreamingCursorStyle,
} from '../services/cursorPreferences';
import { StreamingCursor } from './StreamingCursor';
import { getOllamaEndpoint, setOllamaEndpoint, checkOllamaConnection, DEFAULT_OLLAMA_ENDPOINT } from '../services/ollamaService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<UserApiKeys>({});
  const [persona, setPersona] = useState<IntelligencePersona>('claude');
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>('sparkle');
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(fieldName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Validation state for DeepSeek
  const [dsTesting, setDsTesting] = useState(false);
  const [dsStatus, setDsStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Validation state for OpenRouter
  const [openrouterTesting, setOpenrouterTesting] = useState(false);
  const [openrouterStatus, setOpenrouterStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Validation state for Groq
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqStatus, setGroqStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Validation state for SambaNova
  const [sambanovaTesting, setSambanovaTesting] = useState(false);
  const [sambanovaStatus, setSambanovaStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Validation state for Gratisfy
  const [gratisfyTesting, setGratisfyTesting] = useState(false);
  const [gratisfyStatus, setGratisfyStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Validation state for Hugging Face
  const [hfTesting, setHfTesting] = useState(false);
  const [hfStatus, setHfStatus] = useState<{ valid?: boolean; message?: string; isPro?: boolean; username?: string; plan?: string } | null>(null);

  // Validation state for Gemini
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Ollama local endpoint state
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected?: boolean; message?: string; models?: any[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeys(getStoredApiKeys());
      syncApiKeysWithServer().then((synced) => {
        if (synced) setKeys(synced);
      });
      setPersona(getIntelligencePersona());
      setCursorStyle(getStreamingCursorStyle());
      setOllamaUrl(getOllamaEndpoint());
      setSaved(false);
      setDsStatus(null);
      setGeminiStatus(null);
      setOpenrouterStatus(null);
      setGroqStatus(null);
      setSambanovaStatus(null);
      setGratisfyStatus(null);
      setHfStatus(null);
      setOllamaStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateKeys = (newKeys: UserApiKeys) => {
    setKeys(newKeys);
    saveStoredApiKeys({
      ...newKeys,
      persona,
      claudeModeForGemini: persona === 'claude',
    });
  };

  const handleTestOllama = async () => {
    setOllamaTesting(true);
    setOllamaStatus(null);
    setOllamaEndpoint(ollamaUrl);
    try {
      const res = await checkOllamaConnection();
      setOllamaStatus({
        connected: res.connected,
        message: res.message,
        models: res.models,
      });
    } catch (e: any) {
      setOllamaStatus({
        connected: false,
        message: `تعذر الاتصال بـ Ollama: ${e?.message || 'الخدمة غير مشغلة محلياً'}`,
      });
    } finally {
      setOllamaTesting(false);
    }
  };

  const handleTestDeepSeek = async () => {
    const key = (keys.deepseekKey || '').trim();
    if (!key) {
      setDsStatus({ valid: false, message: 'يرجى إدخال مفتاح DeepSeek أولاً لاختباره.' });
      return;
    }
    setDsTesting(true);
    setDsStatus(null);
    try {
      const res = await fetch('/api/deepseek/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepseek-api-key': key,
        },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setDsStatus({
          valid: true,
          message: data.message || 'المفتاح صالح ومتاح للاستخدام',
        });
      } else {
        setDsStatus({
          valid: false,
          message: data.message || data.error || 'المفتاح غير صالح أو رصيد الحساب غير كافٍ',
        });
      }
    } catch (e: any) {
      setDsStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setDsTesting(false);
    }
  };

  const handleTestOpenRouter = async () => {
    const key = (keys.openrouterKey || '').trim();
    if (!key) {
      setOpenrouterStatus({ valid: false, message: 'يرجى إدخال مفتاح OpenRouter أولاً لاختباره.' });
      return;
    }
    setOpenrouterTesting(true);
    setOpenrouterStatus(null);
    try {
      const res = await fetch('/api/openrouter/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-api-key': key,
        },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setOpenrouterStatus({
          valid: true,
          message: data.message || 'المفتاح صالح ومتاح للاستخدام في OpenRouter',
        });
      } else {
        setOpenrouterStatus({
          valid: false,
          message: data.message || data.error || 'المفتاح غير صالح أو تعذر التحقق منه',
        });
      }
    } catch (e: any) {
      setOpenrouterStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setOpenrouterTesting(false);
    }
  };

  const handleTestGroq = async () => {
    const key = (keys.groqKey || '').trim();
    if (!key) {
      setGroqStatus({ valid: false, message: 'يرجى إدخال مفتاح Groq API أولاً لاختباره.' });
      return;
    }
    setGroqTesting(true);
    setGroqStatus(null);
    try {
      const res = await fetch('/api/groq/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': key,
        },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setGroqStatus({
          valid: true,
          message: data.message || 'المفتاح صالح ومتاح للاستخدام الفوري عبر معالجات Groq LPU',
        });
      } else {
        setGroqStatus({
          valid: false,
          message: data.message || data.error || 'المفتاح غير صالح أو تعذر التحقق منه',
        });
      }
    } catch (e: any) {
      setGroqStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setGroqTesting(false);
    }
  };

  const handleTestSambaNova = async () => {
    const key = (keys.sambanovaKey || '').trim();
    if (!key) {
      setSambanovaStatus({ valid: false, message: 'يرجى إدخال مفتاح SambaNova API أولاً لاختباره.' });
      return;
    }
    setSambanovaTesting(true);
    setSambanovaStatus(null);
    try {
      const res = await fetch('/api/sambanova/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sambanova-api-key': key,
        },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setSambanovaStatus({
          valid: true,
          message: data.message || 'المفتاح صالح ومتاح للاستخدام الفوري عبر SambaNova',
        });
      } else {
        setSambanovaStatus({
          valid: false,
          message: data.message || data.error || 'المفتاح غير صالح أو تعذر التحقق منه',
        });
      }
    } catch (e: any) {
      setSambanovaStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setSambanovaTesting(false);
    }
  };

  const handleTestGratisfy = async () => {
    const key = (keys.gratisfyKey || '').trim();
    if (!key) {
      setGratisfyStatus({ valid: false, message: 'يرجى إدخال مفتاح Gratisfy API أولاً لاختباره.' });
      return;
    }
    setGratisfyTesting(true);
    setGratisfyStatus(null);
    try {
      const res = await validateGratisfyKey(key);
      setGratisfyStatus(res);
    } catch (e: any) {
      setGratisfyStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setGratisfyTesting(false);
    }
  };

  const handleTestHuggingFace = async () => {
    const key = (keys.huggingfaceKey || '').trim();
    if (!key) {
      setHfStatus({ valid: false, message: 'يرجى إدخال مفتاح Hugging Face Token أولاً لاختباره.' });
      return;
    }
    setHfTesting(true);
    setHfStatus(null);
    try {
      const res = await fetch('/api/huggingface/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hf-api-key': key,
        },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setHfStatus({
          valid: true,
          message: data.message || 'تمت المصادقة بنجاح مع Hugging Face',
          isPro: !!data.isPro,
          username: data.username,
          plan: data.plan,
        });
      } else {
        setHfStatus({
          valid: false,
          message: data.message || data.error || 'المفتاح غير صالح أو تعذر التحقق منه',
        });
      }
    } catch (e: any) {
      setHfStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setHfTesting(false);
    }
  };

  const handleTestGemini = async () => {
    const key = (keys.geminiKey || '').trim();
    handleUpdateKeys({ ...keys, geminiKey: key });
    setGeminiTesting(true);
    setGeminiStatus(null);
    try {
      const res = await fetch('/api/gemini/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'x-gemini-api-key': key } : {}),
        },
        body: JSON.stringify({
          apiKey: key,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setGeminiStatus({
          valid: true,
          message: data.message || 'محرك Gemini يعمل بنجاح ومستعد للإجابة ✅',
        });
      } else {
        setGeminiStatus({
          valid: false,
          message: data.message || data.error || 'تعذر الاتصال بـ Gemini',
        });
      }
    } catch (e: any) {
      setGeminiStatus({
        valid: false,
        message: `تعذر الاتصال: ${e?.message || 'خطأ في الشبكة'}`,
      });
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleSave = () => {
    saveStoredApiKeys({
      ...keys,
      persona,
      claudeModeForGemini: persona === 'claude',
    });
    setIntelligencePersona(persona);
    setStreamingCursorStyle(cursorStyle);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1D1A] border border-[#E4DFD2] dark:border-[#302E29] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#23221E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B85736]/10 text-[#B85736] flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#22211E] dark:text-[#EDEAE4]">
                إعدادات مفاتيح API والتشغيل الدائم
              </h3>
              <p className="text-[11px] text-[#7A756B] dark:text-[#A09B90]">
                تشغيل النماذج مباشرة لحسابك الشخصي دون القلق من نفاد رصيد Puter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7A756B] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Google Gemini API Key (مجاني بالكامل)
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.geminiKey || '', 'gemini')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'gemini' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'gemini' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={geminiTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {geminiTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المحرك'}
                </button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  احصل عليه مجاناً
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
             <div className="relative">
              <input
                type="password"
                placeholder="AIzaSy... (أو يُقرأ تلقائياً من خادم التطبيق)"
                value={keys.geminiKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, geminiKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.geminiKey || '', 'gemini')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'gemini' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'gemini' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            {geminiStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  geminiStatus.valid
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {geminiStatus.message}
              </p>
            )}
            <p className="text-[10.5px] text-[#8C877C]">
              يتم تشغيل نماذج Gemini تلقائياً عبر الخادم، ويمكنك وضع مفتاحك الخاص للحصول على أقصى سرعة وحدود استخدام شخصية.
            </p>
          </div>

          {/* Advanced Model Intelligence Persona Simulation for Gemini */}
          <div className="p-3.5 rounded-xl bg-[#F4EFE6] dark:bg-[#252320] border border-[#DDD6C5] dark:border-[#383530] space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#B85736]/15 text-[#B85736] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4]">
                    محاكاة استدلال وذكاء النماذج المتقدمة
                  </h4>
                  <p className="text-[10.5px] text-[#78746B] dark:text-[#A09B90]">
                    ارتقاء بأسلوب تفكير واستجابة Gemini لأسلوب كبار النماذج العالمية
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Claude Option */}
              <button
                type="button"
                onClick={() => {
                  setPersona('claude');
                  setIntelligencePersona('claude');
                }}
                className={`text-start p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  persona === 'claude'
                    ? 'bg-white dark:bg-[#1E1C18] border-[#B85736] shadow-2xs'
                    : 'bg-white/50 dark:bg-black/20 border-[#DDD6C5] dark:border-[#383530] hover:border-[#B85736]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#B85736]/15 text-[#B85736] flex items-center justify-center">
                      <Brain className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-[#2B2925] dark:text-[#EDEAE4]">
                      Claude 3.7
                    </span>
                  </div>
                  {persona === 'claude' && (
                    <Check className="w-3.5 h-3.5 text-[#B85736]" />
                  )}
                </div>
                <p className="text-[10px] text-[#78746B] dark:text-[#A09B90] leading-snug">
                  استدلال هادئ، تفكير عميق، وأكواد نظيفة بلا حشو
                </p>
              </button>

              {/* ChatGPT Option */}
              <button
                type="button"
                onClick={() => {
                  setPersona('chatgpt');
                  setIntelligencePersona('chatgpt');
                }}
                className={`text-start p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  persona === 'chatgpt'
                    ? 'bg-white dark:bg-[#1E1C18] border-[#10A37F] shadow-2xs'
                    : 'bg-white/50 dark:bg-black/20 border-[#DDD6C5] dark:border-[#383530] hover:border-[#10A37F]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#10A37F]/15 text-[#10A37F] flex items-center justify-center">
                      <Bot className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-[#2B2925] dark:text-[#EDEAE4]">
                      ChatGPT
                    </span>
                  </div>
                  {persona === 'chatgpt' && (
                    <Check className="w-3.5 h-3.5 text-[#10A37F]" />
                  )}
                </div>
                <p className="text-[10px] text-[#78746B] dark:text-[#A09B90] leading-snug">
                  حوار تفاعلي دافئ، مرونة وسلاسة، ومساعد متعاون مباشر
                </p>
              </button>

              {/* Off / Default Gemini Option */}
              <button
                type="button"
                onClick={() => {
                  setPersona('off');
                  setIntelligencePersona('off');
                }}
                className={`text-start p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  persona === 'off'
                    ? 'bg-white dark:bg-[#1E1C18] border-[#78746B] shadow-2xs'
                    : 'bg-white/50 dark:bg-black/20 border-[#DDD6C5] dark:border-[#383530] hover:border-[#78746B]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 text-[#78746B] dark:text-[#A09B90] flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-[#2B2925] dark:text-[#EDEAE4]">
                      Gemini القياسي
                    </span>
                  </div>
                  {persona === 'off' && (
                    <Check className="w-3.5 h-3.5 text-[#78746B] dark:text-[#A09B90]" />
                  )}
                </div>
                <p className="text-[10px] text-[#78746B] dark:text-[#A09B90] leading-snug">
                  النمط الافتراضي الأصلي بدون موجهات محاكاة
                </p>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px] text-[#78746B] dark:text-[#A09B90] pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
              <span>
                موجهات المحاكاة محصنة ومدمجة تلقائياً من جانب الخادم دون إمكانية التلاعب بها
              </span>
            </div>
          </div>
<div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                DeepSeek API Key
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.deepseekKey || '', 'deepseek')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'deepseek' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'deepseek' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestDeepSeek}
                  disabled={dsTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {dsTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  منصة DeepSeek
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="sk-..."
                value={keys.deepseekKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, deepseekKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.deepseekKey || '', 'deepseek')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'deepseek' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'deepseek' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            {dsStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  dsStatus.valid
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {dsStatus.message}
              </p>
            )}
            <p className="text-[10.5px] text-[#8C877C]">
              اضغط على "فحص المفتاح" للتأكد من صلاحية المفتاح وتوفر رصيد مشحون في حساب DeepSeek.
            </p>
          </div>



          {/* OpenRouter API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#6366F1]" />
                مفتاح OpenRouter API
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.openrouterKey || '', 'openrouter')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'openrouter' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'openrouter' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestOpenRouter}
                  disabled={openrouterTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {openrouterTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  مفاتيح OpenRouter
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={keys.openrouterKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, openrouterKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.openrouterKey || '', 'openrouter')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'openrouter' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'openrouter' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            {openrouterStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  openrouterStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {openrouterStatus.message}
              </p>
            )}
          </div>

          {/* Groq API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                مفتاح Groq API
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.groqKey || '', 'groq')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'groq' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'groq' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestGroq}
                  disabled={groqTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {groqTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  منصة Groq
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="gsk_..."
                value={keys.groqKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, groqKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.groqKey || '', 'groq')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'groq' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'groq' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/15 text-[10.5px] text-[#6B655B] dark:text-[#B5B0A4] space-y-1">
              <div className="flex items-center justify-between font-medium text-[#2B2925] dark:text-[#EDEAE4]">
                <span className="text-orange-600 dark:text-orange-400 font-semibold">⚡ خطط Groq LPU:</span>
                <span className="font-mono text-[10px]">Free: 30 طلب/د · 1000 طلب/يوم</span>
              </div>
              <p className="leading-relaxed">
                • <strong>Free (مجاني للأبد):</strong> وصول مجاني لـ GPT OSS 20B/120B، Llama 3.3 70B، Llama 4 Scout/Maverick، Qwen3 32B، Whisper (الخيار الأفضل مجاناً).
              </p>
              <p className="leading-relaxed">
                • <strong>Developer & Enterprise:</strong> بدون حد يومي + نماذج حصرية (Minimax M2.5 و Qwen3-VL 32B).
              </p>
            </div>
            {groqStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  groqStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {groqStatus.message}
              </p>
            )}
          </div>

          {/* SambaNova API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                مفتاح SambaNova API
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.sambanovaKey || '', 'sambanova')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'sambanova' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'sambanova' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestSambaNova}
                  disabled={sambanovaTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {sambanovaTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://cloud.sambanova.ai/apis"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  منصة SambaNova
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="ضع مفتاح SambaNova API هنا..."
                value={keys.sambanovaKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, sambanovaKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.sambanovaKey || '', 'sambanova')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'sambanova' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'sambanova' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 text-[10.5px] text-[#6B655B] dark:text-[#B5B0A4] space-y-1">
              <div className="flex items-center justify-between font-medium text-[#2B2925] dark:text-[#EDEAE4]">
                <span className="text-amber-700 dark:text-amber-300 font-semibold">⚡ معالجات SambaNova SN40L:</span>
                <span className="font-mono text-[10px]">High Throughput</span>
              </div>
              <p className="leading-relaxed">
                • استضافة سريعة وخارقة لنماذج مثل Meta-Llama-3.3-70B-Instruct و DeepSeek V3.1 و GPT OSS 120B و MiniMax M2.7 مع استجابة فورية.
              </p>
            </div>
            {sambanovaStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  sambanovaStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {sambanovaStatus.message}
              </p>
            )}
          </div>

          {/* Gratisfy AI Router */}
          <div className="p-3 rounded-xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                منصة Gratisfy (وسيط النماذج المجانية الذكي)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.gratisfyKey || '', 'gratisfy')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'gratisfy' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'gratisfy' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestGratisfy}
                  disabled={gratisfyTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {gratisfyTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://gratisfy.xyz/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  لوحة Gratisfy
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="ضع مفتاح Gratisfy API هنا (gxyz-...)..."
                value={keys.gratisfyKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, gratisfyKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.gratisfyKey || '', 'gratisfy')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'gratisfy' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'gratisfy' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 text-[10.5px] text-[#6B655B] dark:text-[#B5B0A4] space-y-1">
              <div className="flex items-center justify-between font-medium text-[#2B2925] dark:text-[#EDEAE4]">
                <span className="text-teal-700 dark:text-teal-300 font-semibold">توجيه تلقائي ونماذج مجانية:</span>
                <span className="font-mono text-[10px]">Gratisfy Router</span>
              </div>
              <p className="leading-relaxed">
                • وسيط يجمع نماذج Llama 3 70B و GPT-4o Mini و DeepSeek V3/R1 و Qwen Coder مع توجيه ذكي للطلبات.
              </p>
            </div>
            {gratisfyStatus && (
              <p
                className={`text-[11px] p-2 rounded-lg ${
                  gratisfyStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {gratisfyStatus.message}
              </p>
            )}
          </div>

          {/* Pollinations Notice Card (No API Key Required) */}
          <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                  منصة Pollinations.ai (مجانية بالكامل ومفتوحة)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                لا تتطلب مفتاح API
              </span>
            </div>
            <p className="text-[11px] text-[#58544C] dark:text-[#B0ABA0] leading-relaxed">
              جميع نماذج <strong>Pollinations</strong> (مثل GPT-OSS 20B والاستدلال، Mistral، DeepSeek، Qwen Coder، Llama 3.3) مفعلة وتعمل مباشرة دون الحاجة لأي مفتاح أو اشتراك! يمكنك اختيارها فوراً من قائمة النماذج.
            </p>
          </div>

          {/* Hugging Face API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                رمز Hugging Face Token
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(keys.huggingfaceKey || '', 'huggingface')}
                  className="text-[11px] font-medium text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] flex items-center gap-1 cursor-pointer"
                  title="نسخ المفتاح"
                >
                  {copiedKey === 'huggingface' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'huggingface' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestHuggingFace}
                  disabled={hfTesting}
                  className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {hfTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص المفتاح'}
                </button>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                >
                  منصة HF
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="hf_..."
                value={keys.huggingfaceKey || ''}
                onChange={(e) => handleUpdateKeys({ ...keys, huggingfaceKey: e.target.value.trim() })}
                className="w-full px-3 py-2 pr-14 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(keys.huggingfaceKey || '', 'huggingface')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F5F2E9] dark:bg-[#2A2824] hover:bg-[#EAE5D8] dark:hover:bg-[#35332E] text-[#B85736] dark:text-[#E0866A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedKey === 'huggingface' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'huggingface' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 text-[10.5px] text-[#6B655B] dark:text-[#B5B0A4] space-y-1">
              <div className="flex items-center justify-between font-medium text-[#2B2925] dark:text-[#EDEAE4]">
                <span className="text-amber-600 dark:text-amber-400 font-semibold">🤗 خطط Hugging Face:</span>
                <span className="text-[10px]">38,000+ نموذج مجتمعي</span>
              </div>
              <p className="leading-relaxed">
                • <strong>Free (مجاني):</strong> 5 نماذج أساسية (Llama 3.1 8B, Qwen 2.5 72B, Gemma 2 9B, Phi-3 Mini, Mistral 7B).
              </p>
              <p className="leading-relaxed">
                • <strong>Pro ($9/شهر):</strong> وصول للنماذج الضخمة (Llama 3.3 70B, Command R+, Zephyr ORPO 141B).
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                💡 ملاحظة: رصيد الاستدلال المجاني في Hugging Face ينتهي بسرعة، لذلك يفضل Groq للاستخدام المجاني المكثف.
              </p>
            </div>
            {hfStatus && (
              <div
                className={`text-[11px] p-2.5 rounded-lg space-y-1 ${
                  hfStatus.valid
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between font-medium">
                  <span>{hfStatus.message}</span>
                  {hfStatus.valid && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      hfStatus.isPro
                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                    }`}>
                      {hfStatus.isPro ? '⭐ Hugging Face PRO' : 'خطة مجانية Free Tier'}
                    </span>
                  )}
                </div>
                {hfStatus.valid && (
                  <p className="text-[10px] text-[#6B655B] dark:text-[#A09B90]">
                    {hfStatus.isPro
                      ? 'تم تفعيل نماذج الاستدلال الفائقة لخطة PRO بأولوية قصوى وسرعة استجابة مضاعفة.'
                      : 'تم تفعيل 12 نموذج استدلال مجاني خادم Serverless تلقائياً عبر Hugging Face.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Ollama Local Engine Settings */}
          <div className="p-3.5 rounded-xl bg-[#F2EFE8] dark:bg-[#252320] border border-[#E4DFD2] dark:border-[#302E29] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-black/5 dark:bg-white/5 text-[#2B2925] dark:text-[#EDEAE4] flex items-center justify-center font-mono text-xs font-bold">
                  OL
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4]">
                    محرك Ollama للتشغيل المحلي
                  </h4>
                  <p className="text-[10.5px] text-[#78746B] dark:text-[#A09B90]">
                    تشغيل نماذج الذكاء الاصطناعي المنزلة محلياً على جهازك
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestOllama}
                disabled={ollamaTesting}
                className="text-[11px] font-medium text-[#2B2925] dark:text-[#EDEAE4] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {ollamaTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'فحص الاتصال'}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#55524A] dark:text-[#BBB6A8]">
                عنوان خادم Ollama:
              </label>
              <input
                type="text"
                placeholder="http://localhost:11434"
                value={ollamaUrl}
                onChange={(e) => {
                  setOllamaUrl(e.target.value);
                  setOllamaEndpoint(e.target.value);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#2B2925] dark:focus:border-[#EDEAE4]"
              />
            </div>

            {ollamaStatus && (
              <div className="text-[11px] p-2.5 rounded-lg space-y-1.5 bg-black/5 dark:bg-white/5 text-[#2B2925] dark:text-[#EDEAE4] border border-[#DDD8CB] dark:border-[#33312B]">
                <div className="font-medium">{ollamaStatus.message}</div>
                {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ollamaStatus.models.map((m: any) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] font-mono font-medium"
                      >
                        {m.name} {m.size ? `(${m.size})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-2 rounded bg-black/5 dark:bg-white/5 text-[10px] text-[#7A756B] dark:text-[#9A968C] space-y-1">
              <p className="font-semibold text-[#555148] dark:text-[#CCC7BC]">لتشغيل أو تنزيل أي نموذج محلياً عبر سطر الأوامر:</p>
              <code className="block font-mono bg-black/5 dark:bg-black/20 p-1.5 rounded text-[#2B2925] dark:text-[#EDEAE4]">
                ollama run qwen2.5:3b
              </code>
            </div>
          </div>

          {/* Interactive Streaming Cursor Shape Picker */}
          <div className="p-3.5 rounded-xl bg-[#F4EFE6] dark:bg-[#252320] border border-[#DDD6C5] dark:border-[#383530] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                <span>مؤشر الكتابة</span>
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-black/20 border border-[#DDD6C5] dark:border-[#383530]">
                <span className="text-[10.5px] text-[#7A756B] dark:text-[#A09B90]">معاينة:</span>
                <StreamingCursor style={cursorStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {CURSOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCursorStyle(opt.id);
                    setStreamingCursorStyle(opt.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    cursorStyle === opt.id
                      ? 'bg-white dark:bg-[#1C1B18] border-[#2B2925] dark:border-[#EDEAE4] shadow-xs text-[#2B2925] dark:text-[#EDEAE4]'
                      : 'bg-white/40 dark:bg-black/10 border-transparent hover:border-[#DDD6C5] dark:hover:border-[#383530] text-[#555148] dark:text-[#C5C0B4]'
                  }`}
                >
                  <div className="h-5 flex items-center justify-center mb-1">
                    <StreamingCursor style={opt.id} />
                  </div>
                  <span className="text-[11px] font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#23221E] flex items-center justify-between">
          <span className="text-[11px] text-[#8C877C]">
            {keys.geminiKey || keys.deepseekKey || keys.openrouterKey || keys.groqKey || keys.huggingfaceKey
              ? 'تم حفظ مفاتيح التشغيل المخصصة'
              : 'يعمل التطبيق افتراضياً عبر Puter'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6A665D] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#B85736] hover:bg-[#A34B2E] text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  تم الحفظ!
                </>
              ) : (
                'حفظ الإعدادات'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

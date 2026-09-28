import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Check,
  ExternalLink,
  Brain,
  Bot,
  Loader2,
  Laptop,
  Sun,
  Moon,
  Globe,
  Sliders,
  Copy,
  Download,
  Upload,
  Trash2,
  Zap,
  Cpu,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { getStoredApiKeys, saveStoredApiKeys, syncApiKeysWithServer, UserApiKeys } from '../services/apiKeys';
import { fetchPollinationsModels } from '../services/pollinationsService';
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
import {
  getOllamaEndpoint,
  setOllamaEndpoint,
  checkOllamaConnection,
  DEFAULT_OLLAMA_ENDPOINT,
} from '../services/ollamaService';
import { Language, translations } from '../utils/i18n';
import { ChatSession } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
  sessions?: ChatSession[];
  onClearAllSessions?: () => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type TabType = 'general' | 'api' | 'local' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectLanguage,
  theme,
  onToggleTheme,
  onSetTheme,
  sessions = [],
  onClearAllSessions,
  onExportData,
  onImportData,
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [keys, setKeys] = useState<UserApiKeys>({});
  const [persona, setPersona] = useState<IntelligencePersona>(() => getIntelligencePersona());
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>('sparkle');
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [savedKeyId, setSavedKeyId] = useState<string | null>(null);

  const toggleVisibility = (fieldName: string) => {
    setVisibleKeys((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const triggerKeySavedIndicator = (fieldName: string) => {
    setSavedKeyId(fieldName);
    setTimeout(() => {
      setSavedKeyId(null);
    }, 2000);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(fieldName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // DeepSeek test state
  const [dsTesting, setDsTesting] = useState(false);
  const [dsStatus, setDsStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // OpenRouter test state
  const [openrouterTesting, setOpenrouterTesting] = useState(false);
  const [openrouterStatus, setOpenrouterStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Groq test state
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqStatus, setGroqStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // SambaNova test state
  const [sambanovaTesting, setSambanovaTesting] = useState(false);
  const [sambanovaStatus, setSambanovaStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Gratisfy test state
  const [gratisfyTesting, setGratisfyTesting] = useState(false);
  const [gratisfyStatus, setGratisfyStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Hugging Face test state
  const [hfTesting, setHfTesting] = useState(false);
  const [hfStatus, setHfStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Gemini test state
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ valid?: boolean; message?: string } | null>(null);

  // Pollinations state
  const [pollinationsLoading, setPollinationsLoading] = useState(false);
  const [pollinationsStatus, setPollinationsStatus] = useState<{ valid?: boolean; message?: string; count?: number } | null>(null);

  // Ollama state
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected?: boolean; message?: string; models?: any[] } | null>(null);

  // Local run copy state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      setOpenrouterStatus(null);
      setGroqStatus(null);
      setSambanovaStatus(null);
      setGratisfyStatus(null);
      setHfStatus(null);
      setGeminiStatus(null);
      setPollinationsStatus(null);
      setOllamaStatus(null);
      setConfirmClear(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUpdateKeys = (newKeys: UserApiKeys, keyToMark?: string) => {
    setKeys(newKeys);
    saveStoredApiKeys({
      ...newKeys,
      persona,
      claudeModeForGemini: persona === 'claude',
    });
    if (keyToMark) {
      triggerKeySavedIndicator(keyToMark);
    }
  };

  const handleSaveAndFetchPollinations = async (keyToUse?: string) => {
    const key = (keyToUse !== undefined ? keyToUse : (keys.pollinationsKey || '')).trim();
    handleUpdateKeys({ ...keys, pollinationsKey: key });
    setPollinationsLoading(true);
    setPollinationsStatus(null);
    try {
      const models = await fetchPollinationsModels(key);
      setPollinationsStatus({
        valid: true,
        message: language === 'ar'
          ? `تم حفظ المفتاح! تم جلب ${models.length} نموذج بنجاح من https://gen.pollinations.ai/v1/models`
          : `Key saved! Fetched ${models.length} models successfully from https://gen.pollinations.ai/v1/models`,
        count: models.length,
      });
    } catch {
      setPollinationsStatus({
        valid: true,
        message: language === 'ar'
          ? 'تم حفظ المفتاح! جاري استخدام النماذج الافتراضية (10 نماذج).'
          : 'Key saved! Using default fallback models (10 models).',
        count: 10,
      });
    } finally {
      setPollinationsLoading(false);
    }
  };

  const handleTestDeepSeek = async () => {
    const key = (keys.deepseekKey || '').trim();
    if (!key) {
      setDsStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال مفتاح DeepSeek أولاً.' : 'Please enter your DeepSeek key first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, deepseekKey: key });
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setDsStatus({
          valid: true,
          message: data.message || (language === 'ar' ? 'المفتاح صالح ومتاح للاستخدام' : 'Key is valid & ready'),
        });
      } else {
        setDsStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'المفتاح غير صالح أو الرصيد غير كافٍ' : 'Invalid key or insufficient balance'),
        });
      }
    } catch (e: any) {
      setDsStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setDsTesting(false);
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
          message: data.message || (language === 'ar' ? 'محرك Gemini يعمل بنجاح ومستعد' : 'Gemini engine is healthy and active'),
        });
      } else {
        setGeminiStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'تعذر الاتصال بـ Gemini' : 'Failed to connect to Gemini'),
        });
      }
    } catch (e: any) {
      setGeminiStatus({
        valid: false,
        message: `${language === 'ar' ? 'خطأ في الاتصال' : 'Error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleTestOpenRouter = async () => {
    const key = (keys.openrouterKey || '').trim();
    if (!key) {
      setOpenrouterStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال مفتاح OpenRouter أولاً.' : 'Please enter your OpenRouter key first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, openrouterKey: key });
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setOpenrouterStatus({
          valid: true,
          message: data.message || (language === 'ar' ? 'المفتاح صالح ومتاح للاستخدام في OpenRouter' : 'OpenRouter key is valid & active'),
        });
      } else {
        setOpenrouterStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'المفتاح غير صالح أو تعذر التحقق منه' : 'Invalid key or check failed'),
        });
      }
    } catch (e: any) {
      setOpenrouterStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setOpenrouterTesting(false);
    }
  };

  const handleTestGroq = async () => {
    const key = (keys.groqKey || '').trim();
    if (!key) {
      setGroqStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال مفتاح Groq API أولاً.' : 'Please enter your Groq API key first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, groqKey: key });
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setGroqStatus({
          valid: true,
          message: data.message || (language === 'ar' ? 'المفتاح صالح ومتاح للاستخدام الفوري عبر معالجات Groq LPU' : 'Groq API key is valid and active'),
        });
      } else {
        setGroqStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'المفتاح غير صالح أو تعذر التحقق منه' : 'Invalid Groq API key'),
        });
      }
    } catch (e: any) {
      setGroqStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setGroqTesting(false);
    }
  };

  const handleTestSambaNova = async () => {
    const key = (keys.sambanovaKey || '').trim();
    if (!key) {
      setSambanovaStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال مفتاح SambaNova API أولاً.' : 'Please enter your SambaNova API key first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, sambanovaKey: key });
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setSambanovaStatus({
          valid: true,
          message: data.message || (language === 'ar' ? 'المفتاح صالح ومتاح للاستخدام الفوري عبر SambaNova' : 'SambaNova key is valid and active'),
        });
      } else {
        setSambanovaStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'المفتاح غير صالح أو تعذر التحقق منه' : 'Invalid SambaNova API key'),
        });
      }
    } catch (e: any) {
      setSambanovaStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setSambanovaTesting(false);
    }
  };

  const handleTestGratisfy = async () => {
    const key = (keys.gratisfyKey || '').trim();
    if (!key) {
      setGratisfyStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال مفتاح Gratisfy API أولاً.' : 'Please enter your Gratisfy API key first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, gratisfyKey: key });
    setGratisfyTesting(true);
    setGratisfyStatus(null);
    try {
      const res = await validateGratisfyKey(key);
      setGratisfyStatus(res);
    } catch (e: any) {
      setGratisfyStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setGratisfyTesting(false);
    }
  };

  const handleTestHuggingFace = async () => {
    const key = (keys.huggingfaceKey || '').trim();
    if (!key) {
      setHfStatus({
        valid: false,
        message: language === 'ar' ? 'يرجى إدخال رمز Hugging Face Token أولاً.' : 'Please enter your Hugging Face Token first.',
      });
      return;
    }
    handleUpdateKeys({ ...keys, huggingfaceKey: key });
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
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { valid: false, message: text || 'استجابة غير متوقعة من الخادم' };
      }
      if (res.ok && data.valid) {
        setHfStatus({
          valid: true,
          message: data.message || (language === 'ar' ? 'تمت المصادقة بنجاح مع Hugging Face' : 'Authenticated successfully with Hugging Face'),
        });
      } else {
        setHfStatus({
          valid: false,
          message: data.message || data.error || (language === 'ar' ? 'المفتاح غير صالح أو تعذر التحقق منه' : 'Invalid token or check failed'),
        });
      }
    } catch (e: any) {
      setHfStatus({
        valid: false,
        message: `${language === 'ar' ? 'تعذر الاتصال' : 'Connection error'}: ${e?.message || 'Network error'}`,
      });
    } finally {
      setHfTesting(false);
    }
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
        message: language === 'ar' ? `تعذر الاتصال بـ Ollama: ${e?.message || 'الخدمة غير مشغلة محلياً'}` : `Cannot connect to Ollama: ${e?.message || 'Service offline'}`,
      });
    } finally {
      setOllamaTesting(false);
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
    }, 800);
  };

  const oneClickCmd = 'npm install && set OLLAMA_ORIGINS=* && start /b "" ollama serve && start http://localhost:3000 && npm run dev';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full max-w-2xl rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1D1A] border border-[#E4DFD2] dark:border-[#302E29] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#23221E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B85736]/10 text-[#B85736] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#22211E] dark:text-[#EDEAE4]">
                {t.settingsTitle}
              </h3>
              <p className="text-[11px] text-[#7A756B] dark:text-[#A09B90]">
                {language === 'ar' ? 'تخصيص المظهر، مفاتيح الذكاء، والتشغيل' : 'Customize theme, API keys, and local runtime'}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F4F0E6] dark:bg-[#1A1916] px-4 gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#B85736] text-[#B85736] font-semibold'
                : 'border-transparent text-[#736E64] dark:text-[#A09B90] hover:text-[#22211E] dark:hover:text-[#EDEAE4]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t.tabGeneral}</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'api'
                ? 'border-[#B85736] text-[#B85736] font-semibold'
                : 'border-transparent text-[#736E64] dark:text-[#A09B90] hover:text-[#22211E] dark:hover:text-[#EDEAE4]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t.tabApiKeys}</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'local'
                ? 'border-[#B85736] text-[#B85736] font-semibold'
                : 'border-transparent text-[#736E64] dark:text-[#A09B90] hover:text-[#22211E] dark:hover:text-[#EDEAE4]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{t.tabLocalRun}</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backup'
                ? 'border-[#B85736] text-[#B85736] font-semibold'
                : 'border-transparent text-[#736E64] dark:text-[#A09B90] hover:text-[#22211E] dark:hover:text-[#EDEAE4]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'البيانات' : 'Data'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: GENERAL & APPEARANCE */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Theme: Morning vs Night with Quick Toggle */}
              <div className="p-3.5 rounded-xl bg-[#F6F3EC] dark:bg-[#1E1D1A] border border-[#E5DFD3] dark:border-[#2E2C27] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-indigo-500/10 flex items-center justify-center border border-amber-500/20 dark:border-indigo-500/20">
                      {theme === 'dark' ? (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4]">
                        {t.themeHeading}
                      </div>
                      <div className="text-[11px] text-[#78746B] dark:text-[#9A968C]">
                        {theme === 'dark'
                          ? (language === 'ar' ? 'الوضع الليلي مفعّل — مريح للعين أثناء العمل الليلي' : 'Night theme active — comfortable in low light')
                          : (language === 'ar' ? 'الوضع الصباحي مفعّل — ألوان دافئة ومريحة وواضحة' : 'Morning theme active — warm, clean and clear')}
                      </div>
                    </div>
                  </div>

                  {/* Quick Toggle Switch Button */}
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      theme === 'dark' ? 'bg-[#3A3832]' : 'bg-[#D97757]'
                    }`}
                    title={theme === 'dark' ? (language === 'ar' ? 'تبديل إلى الوضع الصباحي' : 'Switch to Morning') : (language === 'ar' ? 'تبديل إلى الوضع الليلي' : 'Switch to Night')}
                    aria-label="Toggle theme"
                  >
                    <span
                      className={`pointer-events-none flex h-5.5 w-5.5 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        theme === 'dark'
                          ? (isRtl ? '-translate-x-5.5' : 'translate-x-5.5')
                          : 'translate-x-0'
                      }`}
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <Sun className="w-3 h-3 text-amber-500" />
                      )}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Morning Theme Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetTheme) onSetTheme('light');
                      else if (theme === 'dark') onToggleTheme();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-start ${
                      theme === 'light'
                        ? 'bg-[#FAF8F4] border-[#B85736] shadow-xs ring-1 ring-[#B85736]'
                        : 'bg-white dark:bg-[#161513] border-[#DDD7CB] dark:border-[#33312B] hover:border-[#B85736]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="font-semibold text-xs text-[#22211E] dark:text-[#EDEAE4]">
                          {t.morningTheme}
                        </div>
                        <div className="text-[10px] text-[#78746B] dark:text-[#9A968C]">
                          {language === 'ar' ? 'نهاري مريح' : 'Warm Light'}
                        </div>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <span className="w-4 h-4 rounded-full bg-[#B85736] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* Night Theme Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetTheme) onSetTheme('dark');
                      else if (theme === 'light') onToggleTheme();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-start ${
                      theme === 'dark'
                        ? 'bg-[#181715] border-[#B85736] shadow-xs ring-1 ring-[#B85736]'
                        : 'bg-white dark:bg-[#161513] border-[#DDD7CB] dark:border-[#33312B] hover:border-[#B85736]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-semibold text-xs text-[#22211E] dark:text-[#EDEAE4]">
                          {t.nightTheme}
                        </div>
                        <div className="text-[10px] text-[#78746B] dark:text-[#9A968C]">
                          {language === 'ar' ? 'ليلي هادئ' : 'Soft Dark'}
                        </div>
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <span className="w-4 h-4 rounded-full bg-[#B85736] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Interface Language */}
              <div className="space-y-2 pt-2 border-t border-[#EBE7DC] dark:border-[#2C2A25]">
                <label className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#B85736]" />
                  <span>{t.languageHeading}</span>
                </label>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Arabic */}
                  <button
                    type="button"
                    onClick={() => onSelectLanguage('ar')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      language === 'ar'
                        ? 'bg-[#B85736]/10 border-[#B85736] text-[#B85736] font-semibold ring-1 ring-[#B85736]'
                        : 'bg-white dark:bg-[#161513] border-[#DDD8CB] dark:border-[#33312B] text-[#55524A] dark:text-[#C5C0B4]'
                    }`}
                  >
                    <span>العربية (Arabic)</span>
                  </button>

                  {/* English */}
                  <button
                    type="button"
                    onClick={() => onSelectLanguage('en')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      language === 'en'
                        ? 'bg-[#B85736]/10 border-[#B85736] text-[#B85736] font-semibold ring-1 ring-[#B85736]'
                        : 'bg-white dark:bg-[#161513] border-[#DDD8CB] dark:border-[#33312B] text-[#55524A] dark:text-[#C5C0B4]'
                    }`}
                  >
                    <span>English</span>
                  </button>
                </div>
              </div>

              {/* Cursor Style Picker */}
              <div className="p-3.5 rounded-xl bg-[#F4EFE6] dark:bg-[#252320] border border-[#DDD6C5] dark:border-[#383530] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4]">
                    {t.cursorHeading}
                  </label>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30 border border-[#DDD6C5] dark:border-[#383530]">
                    <StreamingCursor style={cursorStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  {CURSOR_OPTIONS.map((opt) => {
                    const label = opt.id === 'sparkle' ? (t as any).cursorSparkle :
                                  opt.id === 'orb' ? (t as any).cursorOrb :
                                  opt.id === 'diamond' ? (t as any).cursorDiamond :
                                  opt.id === 'beam' ? (t as any).cursorBeam : opt.label;
                    const desc = opt.id === 'sparkle' ? (t as any).cursorSparkleDesc :
                                 opt.id === 'orb' ? (t as any).cursorOrbDesc :
                                 opt.id === 'diamond' ? (t as any).cursorDiamondDesc :
                                 opt.id === 'beam' ? (t as any).cursorBeamDesc : opt.desc;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setCursorStyle(opt.id);
                          setStreamingCursorStyle(opt.id);
                        }}
                        title={desc}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          cursorStyle === opt.id
                            ? 'bg-white dark:bg-[#1C1B18] border-[#B85736] shadow-2xs text-[#B85736] font-semibold'
                            : 'bg-white/40 dark:bg-black/10 border-transparent hover:border-[#DDD6C5] dark:hover:border-[#383530] text-[#555148] dark:text-[#C5C0B4]'
                        }`}
                      >
                        <div className="h-4 flex items-center justify-center mb-1">
                          <StreamingCursor style={opt.id} />
                        </div>
                        <span className="text-[11px]">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API KEYS & CLAUDE REASONING */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Top Banner with Quick Save */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[#2B2925] dark:text-[#EDEAE4] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs">
                    {language === 'ar'
                      ? 'يتم حفظ وتشفير كافة المفاتيح فوراً على جهازك ومزامنتها للعمل مع جميع النماذج.'
                      : 'All API keys are securely saved locally and synchronized across all models.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#B85736] hover:bg-[#A34B2E] text-white flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved!'}
                    </>
                  ) : (
                    language === 'ar' ? 'حفظ كافة المفاتيح' : 'Save All Keys'
                  )}
                </button>
              </div>

              {/* Pollinations AI API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#B85736]" />
                      {language === 'ar' ? 'مفتاح Pollinations API Key' : 'Pollinations API Key'}
                    </label>
                    {keys.pollinationsKey?.trim() && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        {language === 'ar' ? 'محفوظ' : 'Saved'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveAndFetchPollinations(keys.pollinationsKey)}
                      disabled={pollinationsLoading}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {pollinationsLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{language === 'ar' ? 'جاري الفحص...' : 'Testing...'}</span>
                        </>
                      ) : (
                        language === 'ar' ? 'فحص وتحديث' : 'Test & Fetch'
                      )}
                    </button>
                    <a
                      href="https://enter.pollinations.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      {language === 'ar' ? 'مفتاح مجاني' : 'Free Key'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['pollinations'] ? 'text' : 'password'}
                    placeholder="sk_..."
                    value={keys.pollinationsKey || ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      handleUpdateKeys({ ...keys, pollinationsKey: val }, 'pollinations');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveAndFetchPollinations(keys.pollinationsKey);
                      }
                    }}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('pollinations')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['pollinations'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['pollinations'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateKeys(keys, 'pollinations');
                      }}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'pollinations' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'pollinations' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.pollinationsKey || '', 'pollinations')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'pollinations' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'pollinations' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {pollinationsStatus && (
                  <p
                    className={`text-[11px] p-2 rounded-lg ${
                      pollinationsStatus.valid
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                    }`}
                  >
                    {pollinationsStatus.message}
                  </p>
                )}
              </div>

              {/* Google Gemini */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#B85736]" />
                      {t.geminiKeyTitle}
                    </label>
                    {keys.geminiKey?.trim() && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        {language === 'ar' ? 'محفوظ' : 'Saved'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={geminiTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {geminiTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      {language === 'ar' ? 'مفتاح مجاني' : 'Free Key'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['gemini'] ? 'text' : 'password'}
                    placeholder="AIzaSy... (Gemini API Key)"
                    value={keys.geminiKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, geminiKey: e.target.value.trim() }, 'gemini')}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('gemini')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['gemini'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['gemini'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'gemini')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'gemini' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'gemini' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.geminiKey || '', 'gemini')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'gemini' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'gemini' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {geminiStatus && (
                  <p
                    className={`text-[11px] p-2 rounded-lg ${
                      geminiStatus.valid
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                    }`}
                  >
                    {geminiStatus.message}
                  </p>
                )}
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
                        {language === 'ar' ? 'محاكاة استدلال وذكاء النماذج المتقدمة' : 'Advanced Model Intelligence Simulation'}
                      </h4>
                      <p className="text-[10.5px] text-[#78746B] dark:text-[#A09B90]">
                        {language === 'ar'
                          ? 'ارتقاء بطريقة تفكير واستجابة Gemini لأسلوب كبار النماذج العالمية'
                          : 'Elevate Gemini reasoning and conversational style to world-class standards'}
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
                          Claude
                        </span>
                      </div>
                      {persona === 'claude' && (
                        <Check className="w-3.5 h-3.5 text-[#B85736]" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#78746B] dark:text-[#A09B90] leading-snug">
                      {language === 'ar'
                        ? 'استدلال هادئ، تفكير عميق، وأكواد نظيفة بلا حشو'
                        : 'Calm reasoning, deep thinking, and clean code'}
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
                      {language === 'ar'
                        ? 'حوار تفاعلي دافئ، مرونة وسلاسة، ومساعد متعاون مباشر'
                        : 'Warm, chatty, transparent, and proactive assistance'}
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
                          {language === 'ar' ? 'Gemini القياسي' : 'Default Gemini'}
                        </span>
                      </div>
                      {persona === 'off' && (
                        <Check className="w-3.5 h-3.5 text-[#78746B] dark:text-[#A09B90]" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#78746B] dark:text-[#A09B90] leading-snug">
                      {language === 'ar'
                        ? 'النمط الافتراضي الأصلي بدون موجهات محاكاة'
                        : 'Standard unmodified Gemini behavior'}
                    </p>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10.5px] text-[#78746B] dark:text-[#A09B90] pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  <span>
                    {language === 'ar'
                      ? 'موجهات المحاكاة محصنة ومدمجة تلقائياً من جانب الخادم دون إمكانية التلاعب بها'
                      : 'Persona instructions are enforced server-side and fully tamper-proof'}
                  </span>
                </div>
              </div>

              {/* DeepSeek */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#B85736]" />
                    {t.deepseekKeyTitle}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestDeepSeek}
                      disabled={dsTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {dsTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://platform.deepseek.com/api_keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      DeepSeek Platform
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['deepseek'] ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={keys.deepseekKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, deepseekKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('deepseek')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['deepseek'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['deepseek'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'deepseek')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'deepseek' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'deepseek' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.deepseekKey || '', 'deepseek')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'deepseek' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'deepseek' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {dsStatus && (
                  <p
                    className={`text-[11px] p-2 rounded-lg ${
                      dsStatus.valid
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {dsStatus.message}
                  </p>
                )}
              </div>

              {/* OpenRouter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#6366F1]" />
                    {language === 'ar' ? 'مفتاح OpenRouter API' : 'OpenRouter API Key'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestOpenRouter}
                      disabled={openrouterTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {openrouterTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      OpenRouter Keys
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['openrouter'] ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={keys.openrouterKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, openrouterKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('openrouter')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['openrouter'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['openrouter'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'openrouter')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'openrouter' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'openrouter' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.openrouterKey || '', 'openrouter')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'openrouter' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'openrouter' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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

              {/* Groq */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-500" />
                    {language === 'ar' ? 'مفتاح Groq API' : 'Groq API Key'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestGroq}
                      disabled={groqTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {groqTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      Groq Console
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['groq'] ? 'text' : 'password'}
                    placeholder="gsk_..."
                    value={keys.groqKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, groqKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('groq')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['groq'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['groq'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'groq')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'groq' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'groq' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.groqKey || '', 'groq')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'groq' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'groq' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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

              {/* SambaNova */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {language === 'ar' ? 'مفتاح SambaNova API' : 'SambaNova API Key'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestSambaNova}
                      disabled={sambanovaTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {sambanovaTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://cloud.sambanova.ai/apis"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      SambaNova Cloud
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['sambanova'] ? 'text' : 'password'}
                    placeholder={language === 'ar' ? 'ضع مفتاح SambaNova API هنا...' : 'Enter your SambaNova API key...'}
                    value={keys.sambanovaKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, sambanovaKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('sambanova')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['sambanova'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['sambanova'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'sambanova')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'sambanova' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'sambanova' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.sambanovaKey || '', 'sambanova')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'sambanova' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'sambanova' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-500" />
                    {language === 'ar' ? 'مفتاح Gratisfy API (وسيط النماذج المجانية)' : 'Gratisfy API Key (Free AI Router)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestGratisfy}
                      disabled={gratisfyTesting}
                      className="text-[11px] text-[#B85736] dark:text-[#E0866A] hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {gratisfyTesting && <Loader2 className="w-3 h-3 animate-spin" />}
                      {language === 'ar' ? 'اختبار المفتاح' : 'Test Key'}
                    </button>
                    <a
                      href="https://gratisfy.xyz/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      Gratisfy Keys
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['gratisfy'] ? 'text' : 'password'}
                    placeholder={language === 'ar' ? 'ضع مفتاح Gratisfy API هنا (gxyz-...)...' : 'Enter your Gratisfy API key...'}
                    value={keys.gratisfyKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, gratisfyKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('gratisfy')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['gratisfy'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['gratisfy'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'gratisfy')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'gratisfy' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'gratisfy' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.gratisfyKey || '', 'gratisfy')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'gratisfy' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'gratisfy' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
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

              {/* Hugging Face */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#2B2925] dark:text-[#EDEAE4] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-500" />
                    {language === 'ar' ? 'رمز Hugging Face Token' : 'Hugging Face Token'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestHuggingFace}
                      disabled={hfTesting}
                      className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {hfTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص' : 'Test'}
                    </button>
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#7A756B] dark:text-[#A09B90] hover:underline flex items-center gap-1"
                    >
                      HF Tokens
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={visibleKeys['huggingface'] ? 'text' : 'password'}
                    placeholder="hf_..."
                    value={keys.huggingfaceKey || ''}
                    onChange={(e) => handleUpdateKeys({ ...keys, huggingfaceKey: e.target.value.trim() })}
                    className={`w-full px-3 py-2 ${isRtl ? 'pl-24 pr-3' : 'pr-24 pl-3'} rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]`}
                  />
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => toggleVisibility('huggingface')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer"
                      title={visibleKeys['huggingface'] ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'إظهار' : 'Show')}
                    >
                      {visibleKeys['huggingface'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateKeys(keys, 'huggingface')}
                      className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${savedKeyId === 'huggingface' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-[#7A756B] dark:text-[#A09B90]'} transition-colors cursor-pointer flex items-center gap-1`}
                      title={language === 'ar' ? 'حفظ المفتاح' : 'Save Key'}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedKeyId === 'huggingface' && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {language === 'ar' ? 'تم' : 'Saved'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(keys.huggingfaceKey || '', 'huggingface')}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#7A756B] dark:text-[#A09B90] hover:text-[#B85736] dark:hover:text-[#E0866A] transition-colors cursor-pointer flex items-center gap-1"
                      title={copiedKey === 'huggingface' ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ المفتاح' : 'Copy API key')}
                    >
                      {copiedKey === 'huggingface' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {language === 'ar' ? 'تم' : 'Copied'}
                          </span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {hfStatus && (
                  <p
                    className={`text-[11px] p-2 rounded-lg ${
                      hfStatus.valid
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {hfStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL RUN */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              {/* Ollama Server Config */}
              <div className="p-3.5 rounded-xl bg-[#F2EFE8] dark:bg-[#252320] border border-[#E4DFD2] dark:border-[#302E29] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#B85736]" />
                    <div>
                      <h4 className="font-semibold text-xs text-[#2B2925] dark:text-[#EDEAE4]">
                        {t.ollamaTitle}
                      </h4>
                      <p className="text-[10.5px] text-[#78746B] dark:text-[#A09B90]">
                        {language === 'ar' ? 'تشغيل محلي بدون إنترنت عبر Ollama' : 'Run local offline models via Ollama'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestOllama}
                    disabled={ollamaTesting}
                    className="text-[11px] font-medium text-[#B85736] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {ollamaTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : language === 'ar' ? 'فحص الاتصال' : 'Test connection'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="http://localhost:11434"
                    value={ollamaUrl}
                    onChange={(e) => {
                      setOllamaUrl(e.target.value);
                      setOllamaEndpoint(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] font-mono text-xs focus:outline-none focus:border-[#B85736]"
                  />
                </div>

                {ollamaStatus && (
                  <div className="text-[11px] p-2 rounded-lg bg-black/5 dark:bg-white/5 text-[#2B2925] dark:text-[#EDEAE4] border border-[#DDD8CB] dark:border-[#33312B]">
                    <div className="font-medium">{ollamaStatus.message}</div>
                    {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ollamaStatus.models.map((m: any) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] font-mono"
                          >
                            {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Single command copy */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-[#7D796F] dark:text-[#A8A49A]">
                  {language === 'ar' ? 'أمر التشغيل المحلي في Terminal:' : 'Local starter command:'}
                </p>
                <div className="relative">
                  <pre
                    dir="ltr"
                    className="bg-[#181715] text-[#EDEAE4] p-2.5 rounded-lg text-xs font-mono overflow-x-auto border border-[#2C2A25] flex items-center justify-between"
                  >
                    <code>{oneClickCmd}</code>
                    <button
                      onClick={() => copyCode(oneClickCmd, 1)}
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA & BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-3">
              <p className="text-[11.5px] text-[#7D796F] dark:text-[#A8A49A]">
                {language === 'ar'
                  ? 'يمكنك حفظ وتصدير كافة محادثاتك وسجل الرسائل كملف JSON مشفر، أو استيرادها لاحقاً في أي وقت.'
                  : 'Export all your chat histories and messages as JSON, or restore a previous backup at any time.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {onExportData && (
                  <button
                    onClick={onExportData}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] hover:bg-[#F5F0E6] dark:hover:bg-[#252420] text-[#22211E] dark:text-[#EDEAE4] font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.exportBackup}</span>
                  </button>
                )}

                {onImportData && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white dark:bg-[#161513] border border-[#DDD8CB] dark:border-[#33312B] hover:bg-[#F5F0E6] dark:hover:bg-[#252420] text-[#22211E] dark:text-[#EDEAE4] font-medium transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{t.importBackup}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onImportData}
                      accept=".json"
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Clear all chats */}
              {sessions.length > 0 && onClearAllSessions && (
                <div className="pt-3 border-t border-[#EBE7DC] dark:border-[#2C2A25]">
                  {confirmClear ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs">
                      <p className="text-red-700 dark:text-red-300 font-medium mb-2">
                        {t.confirmClearAll}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onClearAllSessions();
                            setConfirmClear(false);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          {t.confirm}
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="px-2 py-1 text-xs text-[#635F56] hover:underline cursor-pointer"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.clearAllChats}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#23221E] flex items-center justify-between">
          <span className="text-[11px] text-[#8C877C]">
            NUX AI • v2.0
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6A665D] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#B85736] hover:bg-[#A34B2E] text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t.saved}
                </>
              ) : (
                t.save
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

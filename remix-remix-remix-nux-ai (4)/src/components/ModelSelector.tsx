import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Check, Search, RefreshCw } from 'lucide-react';
import { AIModel } from '../types';
import { AVAILABLE_MODELS } from '../data/models';
import { checkOllamaConnection } from '../services/ollamaService';
import { fetchGroqModels } from '../services/groqService';
import { fetchSambaNovaModels } from '../services/sambaNovaService';
import { fetchPollinationsModels } from '../services/pollinationsService';
import { fetchGratisfyModels } from '../services/gratisfyService';
import { getStoredApiKeys } from '../services/apiKeys';
import { Language } from '../utils/i18n';

interface ModelSelectorProps {
  currentModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  compact?: boolean;
  dropDirection?: 'up' | 'down';
  dropAlign?: 'auto' | 'start' | 'end' | 'center' | 'left' | 'right';
  language?: Language;
  isImageMode?: boolean;
}

// Global in-memory cache to prevent redundant HTTP requests across multiple ModelSelector instances
let globalCachedGroq: AIModel[] = [];
let globalCachedSambaNova: AIModel[] = [];
let globalCachedPollinations: AIModel[] = [];
let globalCachedGratisfy: AIModel[] = [];
let hasFetchedGroq = false;
let hasFetchedSambaNova = false;
let hasFetchedPollinations = false;
let hasFetchedGratisfy = false;

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onSelectModel,
  compact = false,
  dropDirection = 'down',
  dropAlign = 'auto',
  language = 'ar',
  isImageMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'Groq' | 'Gratisfy' | 'SambaNova' | 'Pollinations' | 'OpenRouter' | 'Ollama' | 'Anthropic' | 'DeepSeek' | 'OpenAI' | 'Google'
  >('all');
  const [installedOllamaModels, setInstalledOllamaModels] = useState<AIModel[]>([]);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Live Groq models state
  const [installedGroqModels, setInstalledGroqModels] = useState<AIModel[]>(() => globalCachedGroq);
  const [isRefreshingGroq, setIsRefreshingGroq] = useState(false);

  // Live SambaNova models state
  const [installedSambaNovaModels, setInstalledSambaNovaModels] = useState<AIModel[]>(() => globalCachedSambaNova);
  const [isRefreshingSambaNova, setIsRefreshingSambaNova] = useState(false);

  // Live Pollinations models state
  const [installedPollinationsModels, setInstalledPollinationsModels] = useState<AIModel[]>(() => globalCachedPollinations);
  const [isRefreshingPollinations, setIsRefreshingPollinations] = useState(false);

  // Live Gratisfy models state
  const [installedGratisfyModels, setInstalledGratisfyModels] = useState<AIModel[]>(() => globalCachedGratisfy);
  const [isRefreshingGratisfy, setIsRefreshingGratisfy] = useState(false);

  // Custom model inputs for dynamic providers
  const [customGroqInput, setCustomGroqInput] = useState('');
  const [customSambaNovaInput, setCustomSambaNovaInput] = useState('');
  const [customPollinationsInput, setCustomPollinationsInput] = useState('');
  const [customGratisfyInput, setCustomGratisfyInput] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');
  const [customOpenRouterInput, setCustomOpenRouterInput] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left?: number; right?: number; width?: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(380, window.innerWidth - 24);
    const estimatedHeight = 400;

    // Decide if dropping UP or DOWN
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldDropUp = dropDirection === 'up' || (spaceBelow < 300 && spaceAbove > spaceBelow);

    const newCoords: { top?: number; bottom?: number; left?: number; right?: number; width: number } = {
      width: dropdownWidth,
    };

    const topCoord = Math.round(Math.max(8, rect.bottom + 6));
    const bottomCoord = Math.round(Math.max(8, window.innerHeight - rect.top + 6));

    if (shouldDropUp) {
      newCoords.bottom = bottomCoord;
    } else {
      newCoords.top = topCoord;
    }

    // Horizontal placement
    if (dropAlign === 'center') {
      let left = Math.round(rect.left + rect.width / 2 - dropdownWidth / 2);
      left = Math.max(12, Math.min(left, window.innerWidth - 12 - dropdownWidth));
      newCoords.left = left;
    } else if (dropAlign === 'right' || (dropAlign === 'auto' && language === 'ar') || (dropAlign === 'start' && language === 'ar')) {
      // Align right edge of dropdown with right edge of button or screen
      let right = Math.round(window.innerWidth - rect.right);
      if (right + dropdownWidth > window.innerWidth - 12) {
        right = Math.max(12, window.innerWidth - 12 - dropdownWidth);
      }
      if (right < 12) right = 12;
      newCoords.right = right;
    } else {
      // Align left edge of dropdown with left edge of button
      let left = Math.round(rect.left);
      if (left + dropdownWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - 12 - dropdownWidth);
      }
      if (left < 12) left = 12;
      newCoords.left = left;
    }

    setCoords((prev) => {
      if (
        prev &&
        Math.abs((prev.top ?? 0) - (newCoords.top ?? 0)) <= 1 &&
        Math.abs((prev.bottom ?? 0) - (newCoords.bottom ?? 0)) <= 1 &&
        Math.abs((prev.left ?? 0) - (newCoords.left ?? 0)) <= 1 &&
        Math.abs((prev.right ?? 0) - (newCoords.right ?? 0)) <= 1 &&
        prev.width === newCoords.width
      ) {
        return prev;
      }
      return newCoords;
    });
  }, [dropDirection, dropAlign, language]);

  const updatePositionRef = useRef(updatePosition);
  updatePositionRef.current = updatePosition;

  const loadOllamaModels = async () => {
    setIsRefreshingOllama(true);
    try {
      const conn = await checkOllamaConnection(language);
      setOllamaStatus({ connected: conn.connected, message: conn.message });
      setInstalledOllamaModels(conn.models || []);
    } catch (e) {
      console.warn('Could not load Ollama models:', e);
      setInstalledOllamaModels([]);
    } finally {
      setIsRefreshingOllama(false);
    }
  };

  const loadGroqModels = async () => {
    const userKeys = getStoredApiKeys();
    setIsRefreshingGroq(true);
    try {
      const liveGroq = await fetchGroqModels(userKeys.groqKey || '');
      if (liveGroq && liveGroq.length > 0) {
        globalCachedGroq = liveGroq;
        hasFetchedGroq = true;
        setInstalledGroqModels(liveGroq);
      }
    } catch (e) {
      console.warn('Could not load Groq models:', e);
    } finally {
      setIsRefreshingGroq(false);
    }
  };

  const loadSambaNovaModels = async () => {
    const userKeys = getStoredApiKeys();
    setIsRefreshingSambaNova(true);
    try {
      const liveSambaNova = await fetchSambaNovaModels(userKeys.sambanovaKey || '');
      if (liveSambaNova && liveSambaNova.length > 0) {
        globalCachedSambaNova = liveSambaNova;
        hasFetchedSambaNova = true;
        setInstalledSambaNovaModels(liveSambaNova);
      }
    } catch (e) {
      console.warn('Could not load SambaNova models:', e);
    } finally {
      setIsRefreshingSambaNova(false);
    }
  };

  const loadPollinationsModels = async () => {
    setIsRefreshingPollinations(true);
    try {
      const livePollinations = await fetchPollinationsModels();
      if (livePollinations && livePollinations.length > 0) {
        globalCachedPollinations = livePollinations;
        hasFetchedPollinations = true;
        setInstalledPollinationsModels(livePollinations);
      }
    } catch (e) {
      console.warn('Could not load Pollinations models:', e);
    } finally {
      setIsRefreshingPollinations(false);
    }
  };

  const loadGratisfyModels = async () => {
    setIsRefreshingGratisfy(true);
    try {
      const liveGratisfy = await fetchGratisfyModels(true);
      if (liveGratisfy && liveGratisfy.length > 0) {
        globalCachedGratisfy = liveGratisfy;
        hasFetchedGratisfy = true;
        setInstalledGratisfyModels(liveGratisfy);
      }
    } catch (e) {
      console.warn('Could not load Gratisfy models:', e);
    } finally {
      setIsRefreshingGratisfy(false);
    }
  };

  useEffect(() => {
    // Automatically load live Pollinations & Gratisfy models on mount
    loadPollinationsModels();
    loadGratisfyModels();

    const handleModelsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        globalCachedPollinations = e.detail;
        hasFetchedPollinations = true;
        setInstalledPollinationsModels(e.detail);
      }
    };
    window.addEventListener('pollinations-models-updated', handleModelsUpdated);
    return () => {
      window.removeEventListener('pollinations-models-updated', handleModelsUpdated);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    if (isOpen) {
      updatePositionRef.current();
      const handleScrollOrResize = () => {
        requestAnimationFrame(() => updatePositionRef.current());
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Load external models ONLY when dropdown is opened, respecting module-level cache
  useEffect(() => {
    if (isOpen) {
      loadOllamaModels();
      if (!hasFetchedGroq) loadGroqModels();
      if (!hasFetchedSambaNova) loadSambaNovaModels();
      if (!hasFetchedPollinations) loadPollinationsModels();
      if (!hasFetchedGratisfy) loadGratisfyModels();
    }
  }, [isOpen]);

  // Combine available cloud models + dynamically loaded Ollama, Groq, SambaNova, Pollinations, & Gratisfy models
  const { combinedModels, availableTabs } = React.useMemo(() => {
    const userKeys = getStoredApiKeys();
    const hasOpenRouterKey = Boolean(userKeys.openrouterKey && userKeys.openrouterKey.trim());

    // Start with default models
    let baseList = [...AVAILABLE_MODELS];

    // Exclude Hugging Face models completely
    baseList = baseList.filter((m) => m.provider !== 'HuggingFace' && !m.id.startsWith('hf:'));

    // Filter OpenRouter models if user has not provided an OpenRouter API key
    if (!hasOpenRouterKey) {
      baseList = baseList.filter((m) => m.provider !== 'OpenRouter' && !m.id.startsWith('openrouter:'));
    }

    // Handle Groq models: if live models loaded dynamically, replace static Groq list with live API models!
    if (installedGroqModels.length > 0) {
      baseList = baseList.filter((m) => m.provider !== 'Groq' && !m.id.startsWith('groq:'));
      baseList.push(...installedGroqModels);
    }

    // Handle SambaNova models: if live models loaded dynamically, replace static SambaNova list with live API models!
    if (installedSambaNovaModels.length > 0) {
      baseList = baseList.filter((m) => m.provider !== 'SambaNova' && !m.id.startsWith('sambanova:'));
      baseList.push(...installedSambaNovaModels);
    }

    // Handle Pollinations models: if live models loaded dynamically, replace static Pollinations list!
    if (installedPollinationsModels.length > 0) {
      baseList = baseList.filter((m) => m.provider !== 'Pollinations' && !m.id.startsWith('pollinations:'));
      baseList.push(...installedPollinationsModels);
    }

    // Handle Gratisfy models: if live models loaded dynamically, replace static Gratisfy list!
    if (installedGratisfyModels.length > 0) {
      baseList = baseList.filter((m) => m.provider !== 'Gratisfy' && !m.id.startsWith('gratisfy:'));
      baseList.push(...installedGratisfyModels);
    }

    // Add local Ollama models if any
    for (const localM of installedOllamaModels) {
      if (!baseList.some((existing) => existing.id === localM.id || existing.name === localM.name)) {
        baseList.push(localM);
      }
    }

    // Dynamic Filter: When user types /img in chat, restrict model list to Image Generation & Vision models only!
    if (isImageMode) {
      baseList = baseList.filter((m) => {
        const id = m.id.toLowerCase();
        const name = m.name.toLowerCase();
        const desc = (m.description || '').toLowerCase();
        return (
          m.provider === 'Pollinations' ||
          id.includes('pollinations') ||
          id.includes('flux') ||
          id.includes('image') ||
          id.includes('vision') ||
          id.includes('dall-e') ||
          id.includes('midjourney') ||
          name.includes('flux') ||
          name.includes('vision') ||
          name.includes('صورة') ||
          desc.includes('صورة') ||
          desc.includes('توليد الصور') ||
          desc.includes('image')
        );
      });
    }

    // Build tabs / columns
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'all', label: language === 'en' ? 'All' : 'الكل' },
      { id: 'Gratisfy', label: 'Gratisfy' },
      { id: 'Google', label: 'Gemini' },
      { id: 'DeepSeek', label: 'DeepSeek' },
      { id: 'Groq', label: 'Groq' },
      { id: 'SambaNova', label: 'SambaNova' },
      { id: 'Pollinations', label: 'Pollinations' },
      { id: 'Anthropic', label: 'Claude' },
      { id: 'OpenAI', label: 'OpenAI' },
    ];

    if (hasOpenRouterKey) {
      tabs.push({ id: 'OpenRouter', label: 'OpenRouter' });
    }
    if (installedOllamaModels.length > 0) {
      tabs.push({ id: 'Ollama', label: 'Ollama' });
    }

    return { combinedModels: baseList, availableTabs: tabs };
  }, [installedOllamaModels, installedGroqModels, installedSambaNovaModels, installedPollinationsModels, installedGratisfyModels, isOpen, language, isImageMode]);

  const filteredModels = combinedModels.filter((m) => {
    const matchesTab = activeTab === 'all' || m.provider === activeTab;
    if (!matchesTab) return false;

    const descToSearch = language === 'en' ? (m.descriptionEn || m.description) : m.description;
    const badgeToSearch = language === 'en' ? (m.badgeEn || m.badge || '') : (m.badge || '');

    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badgeToSearch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleAddCustomOllamaModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customModelInput.trim();
    if (!clean) return;

    const customModel: AIModel = {
      id: `ollama:${clean}`,
      name: clean,
      provider: 'Ollama',
      description: language === 'en' ? `Local model installed via Ollama (${clean}).` : `نموذج محلي مثبت عبر Ollama (${clean}).`,
      badge: language === 'en' ? 'Local' : 'محلي',
      contextWindow: 'Local',
      iconType: 'ollama',
      isLocal: true,
    };

    onSelectModel(customModel);
    setCustomModelInput('');
    setIsOpen(false);
  };

  const handleAddCustomOpenRouterModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customOpenRouterInput.trim();
    if (!clean) return;

    const modelId = clean.startsWith('openrouter:') ? clean : `openrouter:${clean}`;
    const cleanName = clean.replace(/^openrouter:/, '');
    const customModel: AIModel = {
      id: modelId,
      name: cleanName,
      provider: 'OpenRouter',
      description: language === 'en' ? `OpenRouter cloud model (${cleanName}).` : `نموذج سحابي متاح عبر منصة OpenRouter (${cleanName}).`,
      badge: 'OpenRouter',
      badgeEn: 'OpenRouter',
      contextWindow: 'OpenRouter',
      iconType: 'openrouter',
    };

    onSelectModel(customModel);
    setCustomOpenRouterInput('');
    setIsOpen(false);
  };

  const handleAddCustomGroqModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customGroqInput.trim();
    if (!clean) return;

    const modelId = clean.startsWith('groq:') ? clean : `groq:${clean}`;
    const cleanName = clean.replace(/^groq:/, '');
    const customModel: AIModel = {
      id: modelId,
      name: `${cleanName.split('/').pop() || cleanName} (Groq)`,
      provider: 'Groq',
      description: language === 'en' ? `Groq LPU model (${cleanName}).` : `نموذج فائق السرعة عبر معالجات Groq LPU (${cleanName}).`,
      badge: 'Groq Custom',
      badgeEn: 'Groq Custom',
      contextWindow: '128K',
      iconType: 'groq',
    };

    onSelectModel(customModel);
    setCustomGroqInput('');
    setIsOpen(false);
  };

  const handleAddCustomSambaNovaModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customSambaNovaInput.trim();
    if (!clean) return;

    const modelId = clean.startsWith('sambanova:') ? clean : `sambanova:${clean}`;
    const cleanName = clean.replace(/^sambanova:/, '');
    const customModel: AIModel = {
      id: modelId,
      name: `${cleanName.split('/').pop() || cleanName} (SambaNova)`,
      provider: 'SambaNova',
      description: language === 'en' ? `SambaNova SN40L model (${cleanName}).` : `نموذج مسرّع عبر خوادم SambaNova Systems (${cleanName}).`,
      badge: 'SambaNova Custom',
      badgeEn: 'SambaNova Custom',
      contextWindow: '128K',
      iconType: 'sambanova',
    };

    onSelectModel(customModel);
    setCustomSambaNovaInput('');
    setIsOpen(false);
  };

  const handleAddCustomPollinationsModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customPollinationsInput.trim();
    if (!clean) return;

    const modelId = clean.startsWith('pollinations:') ? clean : `pollinations:${clean}`;
    const cleanName = clean.replace(/^pollinations:/, '');
    const customModel: AIModel = {
      id: modelId,
      name: `${cleanName} (Pollinations)`,
      provider: 'Pollinations',
      description: language === 'en' ? `Free Pollinations model (${cleanName}).` : `نموذج مجاني بالكامل عبر Pollinations (${cleanName}).`,
      badge: 'مجاني',
      badgeEn: 'Free',
      contextWindow: '128K',
      iconType: 'pollinations',
    };

    onSelectModel(customModel);
    setCustomPollinationsInput('');
    setIsOpen(false);
  };

  const handleAddCustomGratisfyModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customGratisfyInput.trim();
    if (!clean) return;

    const modelId = clean.startsWith('gratisfy:') ? clean : `gratisfy:${clean}`;
    const cleanName = clean.replace(/^gratisfy:/, '');
    const customModel: AIModel = {
      id: modelId,
      name: `${cleanName.split('/').pop() || cleanName} (Gratisfy)`,
      provider: 'Gratisfy',
      description: language === 'en' ? `Gratisfy router model (${cleanName}).` : `نموذج متاح عبر وسيط Gratisfy (${cleanName}).`,
      badge: 'Gratisfy',
      badgeEn: 'Gratisfy',
      contextWindow: '128K',
      iconType: 'gratisfy',
    };

    onSelectModel(customModel);
    setCustomGratisfyInput('');
    setIsOpen(false);
  };

  const isUp = dropDirection === 'up';

  const getAlignClass = () => {
    if (dropAlign === 'center') return 'left-1/2 -translate-x-1/2';
    if (dropAlign === 'start') return language === 'ar' ? 'right-0 ltr:right-auto ltr:left-0' : 'left-0 rtl:left-auto rtl:right-0';
    if (dropAlign === 'end') return language === 'ar' ? 'left-0 ltr:left-auto ltr:right-0' : 'right-0 rtl:right-auto rtl:left-0';
    if (dropAlign === 'left') return 'left-0 right-auto';
    if (dropAlign === 'right') return 'right-0 left-auto';
    return language === 'ar'
      ? 'right-0 sm:right-auto sm:left-0 ltr:left-0 ltr:right-auto'
      : 'left-0 sm:left-auto sm:right-0 rtl:right-0 rtl:left-auto';
  };

  const renderModelItem = (model: AIModel) => {
    const isSelected = model.id === currentModel.id;
    const badgeText = language === 'en' ? (model.badgeEn || model.badge) : model.badge;

    return (
      <button
        key={model.id}
        type="button"
        onClick={() => {
          onSelectModel(model);
          setIsOpen(false);
        }}
        className={`w-full ${language === 'en' ? 'text-left' : 'text-right'} p-2 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
          isSelected
            ? 'bg-white dark:bg-[#282622] text-[#22211E] dark:text-[#FAF8F5] shadow-xs font-medium'
            : 'hover:bg-[#F2EFE8] dark:hover:bg-[#252320] text-[#444139] dark:text-[#C5C1B6]'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium">
              {model.name}
            </span>
            <span className="text-[10px] text-[#8C877C] dark:text-[#8E8A80]">
              ({model.provider})
            </span>
            {model.contextWindow && (
              <span className="px-1.5 py-0.2 text-[9.5px] rounded bg-black/5 dark:bg-white/5 text-[#55524B] dark:text-[#C5C1B6] font-mono">
                {model.contextWindow}
              </span>
            )}
            {badgeText && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-black/5 dark:bg-white/5 text-[#78746B] dark:text-[#A09B90]">
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#78746B] dark:text-[#948F85] truncate mt-0.5">
            {language === 'en' ? (model.descriptionEn || model.description) : model.description}
          </p>
        </div>

        {isSelected && (
          <Check className="w-3.5 h-3.5 text-[#2B2925] dark:text-[#EDEAE4] shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            updatePosition();
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className={`group flex items-center gap-1.5 rounded-lg transition-colors cursor-pointer ${
          compact
            ? 'px-2 py-1 text-xs text-[#55524A] dark:text-[#C5C1B6] hover:bg-black/5 dark:hover:bg-white/5'
            : 'px-2.5 py-1 text-xs sm:text-[13px] text-[#22211E] dark:text-[#EDEAE4] hover:bg-black/5 dark:hover:bg-white/5 font-medium'
        }`}
      >
        <span className={`inline-flex items-center gap-1.5 min-w-0 ${compact ? 'max-w-[110px] sm:max-w-[170px] md:max-w-none' : ''}`}>
          <span className="truncate">{currentModel.name}</span>
        </span>
        {isUp ? (
          <ChevronUp
            className={`w-3 h-3 text-[#8A857B] dark:text-[#9A968C] transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        ) : (
          <ChevronDown
            className={`w-3 h-3 text-[#8A857B] dark:text-[#9A968C] transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Clean Dropdown Menu rendered via Portal so it is never clipped by parent overflow-hidden or overflow-x-auto */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            zIndex: 99999,
            ...(coords?.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            ...(coords?.top !== undefined ? { top: `${coords.top}px` } : {}),
            ...(coords?.left !== undefined ? { left: `${coords.left}px` } : {}),
            ...(coords?.right !== undefined ? { right: `${coords.right}px` } : {}),
            width: coords?.width ? `${coords.width}px` : 'calc(100vw - 24px)',
          }}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="max-w-[380px] max-h-[min(440px,calc(100vh-80px))] flex flex-col rounded-xl bg-[#FCFAF7] dark:bg-[#1E1D1A] border border-[#E4DFD2] dark:border-[#302E29] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="p-2.5 border-b border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#23221E]">
            {/* Search Input */}
            <div className="relative flex items-center mb-2">
              <Search className="w-3 h-3 absolute right-2.5 text-[#9A968C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search models...' : 'بحث عن نموذج...'}
                autoFocus
                className="w-full pr-7 pl-2 py-1 text-xs rounded-lg bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] placeholder-[#9A968C] focus:outline-none"
              />
            </div>

            {/* Provider Tabs */}
            <div className="flex gap-1 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715]'
                      : 'text-[#635F56] dark:text-[#A8A49A] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Action Bar for Dynamic Providers */}
          {activeTab === 'Gratisfy' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78746B] dark:text-[#A09B90]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                  <span>
                    {language === 'en'
                      ? `Gratisfy Router (${installedGratisfyModels.length} models)`
                      : `وسيط Gratisfy (${installedGratisfyModels.length} نموذج متاح)`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadGratisfyModels}
                  disabled={isRefreshingGratisfy}
                  className="flex items-center gap-1 text-[10.5px] hover:underline cursor-pointer disabled:opacity-50 text-teal-600 dark:text-teal-400"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingGratisfy ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Sync Models' : 'تحديث النماذج'}</span>
                </button>
              </div>
              <form onSubmit={handleAddCustomGratisfyModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model ID (e.g. llama-3-70b-instruct)' : 'معرف النموذج (مثال: llama-3-70b-instruct)'}
                  value={customGratisfyInput}
                  onChange={(e) => setCustomGratisfyInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customGratisfyInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'OpenRouter' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25]">
              <form onSubmit={handleAddCustomOpenRouterModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model ID (e.g. meta-llama/llama-3.3-70b-instruct)' : 'معرف النموذج (مثال: meta-llama/llama-3.3-70b-instruct)'}
                  value={customOpenRouterInput}
                  onChange={(e) => setCustomOpenRouterInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customOpenRouterInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Groq' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78746B] dark:text-[#A09B90]">
                <span>
                  {installedGroqModels.length > 0
                    ? language === 'en'
                      ? `${installedGroqModels.length} active models synced from your Groq key`
                      : `تمت مزامنة ${installedGroqModels.length} نموذج متاح من حساب Groq`
                    : language === 'en'
                    ? 'Groq Cloud Models'
                    : 'نماذج Groq السحابية'}
                </span>
                <button
                  type="button"
                  onClick={loadGroqModels}
                  disabled={isRefreshingGroq}
                  className="flex items-center gap-1 text-[10.5px] text-[#B85736] hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingGroq ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Sync Models' : 'تحديث النماذج'}</span>
                </button>
              </div>
              <form onSubmit={handleAddCustomGroqModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model ID (e.g. llama-3.1-8b-instant)' : 'معرف النموذج (مثال: llama-3.1-8b-instant)'}
                  value={customGroqInput}
                  onChange={(e) => setCustomGroqInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customGroqInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'SambaNova' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78746B] dark:text-[#A09B90]">
                <span>
                  {language === 'en'
                    ? `SambaNova SN40L Models (${installedSambaNovaModels.length} synced)`
                    : `نماذج SambaNova SN40L (${installedSambaNovaModels.length} مزامنة)`}
                </span>
                <button
                  type="button"
                  onClick={loadSambaNovaModels}
                  disabled={isRefreshingSambaNova}
                  className="flex items-center gap-1 text-[10.5px] hover:underline cursor-pointer disabled:opacity-50 text-[#D97706] dark:text-[#FBBF24]"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingSambaNova ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Sync Models' : 'تحديث النماذج'}</span>
                </button>
              </div>
              <form onSubmit={handleAddCustomSambaNovaModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model ID (e.g. Meta-Llama-3.3-70B-Instruct)' : 'معرف النموذج (مثال: Meta-Llama-3.3-70B-Instruct)'}
                  value={customSambaNovaInput}
                  onChange={(e) => setCustomSambaNovaInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customSambaNovaInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Pollinations' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78746B] dark:text-[#A09B90]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>
                    {language === 'en'
                      ? `Pollinations AI - 100% Free Public Models (${installedPollinationsModels.length})`
                      : `Pollinations AI - النماذج المجانية المباشرة 100% (${installedPollinationsModels.length})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadPollinationsModels}
                  disabled={isRefreshingPollinations}
                  className="flex items-center gap-1 text-[10.5px] hover:underline cursor-pointer disabled:opacity-50 text-emerald-600 dark:text-emerald-400"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingPollinations ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Sync Models' : 'تحديث النماذج'}</span>
                </button>
              </div>
              <form onSubmit={handleAddCustomPollinationsModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model Name (e.g. openai-fast, mistral)' : 'اسم النموذج (مثال: openai-fast, mistral)'}
                  value={customPollinationsInput}
                  onChange={(e) => setCustomPollinationsInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customPollinationsInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'Ollama' && (
            <div className="p-2 bg-[#F7F4EC] dark:bg-[#23221E] border-b border-[#EBE7DC] dark:border-[#2C2A25] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#78746B] dark:text-[#A09B90]">
                <span>{ollamaStatus?.message || (language === 'en' ? 'Ollama Local Models' : 'نماذج Ollama المحلية')}</span>
                <button
                  type="button"
                  onClick={loadOllamaModels}
                  disabled={isRefreshingOllama}
                  className="flex items-center gap-1 text-[10.5px] hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingOllama ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Refresh' : 'تحديث'}</span>
                </button>
              </div>
              <form onSubmit={handleAddCustomOllamaModel} className="flex gap-1">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Model name (e.g. qwen2.5:3b)' : 'اسم النموذج (مثال: qwen2.5:3b)'}
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] font-mono rounded bg-white dark:bg-[#181715] border border-[#DDD8CB] dark:border-[#33312B] text-[#2B2925] dark:text-[#EDEAE4] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customModelInput.trim()}
                  className="px-2.5 py-1 text-[11px] font-medium bg-[#2B2925] dark:bg-[#EDEAE4] text-white dark:text-[#181715] rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {language === 'en' ? 'Run' : 'تشغيل'}
                </button>
              </form>
            </div>
          )}

          {/* Models List */}
          <div className="overflow-y-auto p-1.5 space-y-1 max-h-[240px] sm:max-h-[280px] flex-1 min-h-[120px]">
            {filteredModels.map((model) => renderModelItem(model))}

            {filteredModels.length === 0 && (
              <div className="p-4 text-center text-xs text-[#8E8A80]">
                {language === 'en' ? 'No matching models' : 'لا توجد نماذج مطابقة'}
              </div>
            )}
          </div>

          {/* Clean Footer */}
          <div className="px-3 py-1.5 border-t border-[#EBE7DC] dark:border-[#2C2A25] bg-[#F7F4EC] dark:bg-[#1E1D1A] text-[10.5px] text-[#78746B] dark:text-[#A09B90] flex items-center justify-between">
            <span>{filteredModels.length} {language === 'en' ? 'models' : 'نموذج'}</span>
            <span className="text-[10px] text-[#9A968C]">{currentModel.provider}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

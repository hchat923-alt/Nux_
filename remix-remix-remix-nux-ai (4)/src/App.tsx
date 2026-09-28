import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PanelLeft, 
  Plus, 
  ArrowDown,
  Sliders,
  Glasses,
  Ghost,
  Sun,
  Moon,
} from 'lucide-react';
import { ChatMessage, AIModel, ChatSession, FileAttachment } from './types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelById } from './data/models';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { WelcomeHeader, WelcomeActionChips } from './components/WelcomeScreen';
import { ModelSelector } from './components/ModelSelector';
import { ArtifactModal } from './components/ArtifactModal';
import { SettingsModal } from './components/SettingsModal';
import { GlobalTooltip } from './components/GlobalTooltip';
import { sendChatMessage, sendDualModelDebate } from './services/aiService';
import {
  shouldTriggerWebSearch,
  extractSearchQuery,
  performWebSearch,
  formatSearchContextForModel,
} from './services/webSearchService';
import { getDeepThinkingEnabled } from './services/deepThinkingService';
import { Language, getStoredLanguage, setStoredLanguage, translations } from './utils/i18n';

const SESSIONS_STORAGE_KEY = 'nux_chat_sessions_v1';
const THEME_STORAGE_KEY = 'nux_theme_v1';
const MODEL_STORAGE_KEY = 'nux_active_model_v1';
const EMPTY_MESSAGES: ChatMessage[] = [];

export default function App() {
  // Language state
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
  };

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  const t = translations[language];

  // Theme state: 'light' (Morning) vs 'dark' (Night)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // Default to comfortable morning light mode
  });

  // Apply theme class to HTML element and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Active Model state
  const [currentModel, setCurrentModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    return saved ? getModelById(saved) : getModelById(DEFAULT_MODEL_ID);
  });

  const handleSelectModel = (model: AIModel) => {
    setCurrentModel(model);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, model.id);
    } catch (_) {}
  };

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => ({
          ...s,
          messages: Array.isArray(s.messages) ? s.messages : [],
          updatedAt: s.updatedAt || s.createdAt || Date.now(),
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      const list = data ? JSON.parse(data) : [];
      return Array.isArray(list) && list[0]?.id ? list[0].id : null;
    } catch {
      return null;
    }
  });

  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [artifactData, setArtifactData] = useState<{
    code: string;
    language: string;
  } | null>(null);

  const handleOpenArtifact = useCallback((code: string, artifactLang: string) => {
    setArtifactData({ code, language: artifactLang });
  }, []);

  // Dual Model Collaborative State
  const [isDualModel, setIsDualModel] = useState(false);
  const [secondaryModel, setSecondaryModel] = useState<AIModel>(() =>
    getModelById('gemini-3.1-flash-lite')
  );

  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Export/Import
  const handleExportData = () => {
    const data = {
      sessions,
      theme,
      language,
      currentModelId: currentModel.id,
      exportDate: new Date().toISOString(),
      version: '2.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nux-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.sessions)) {
          setSessions(parsed.sessions);
          if (parsed.sessions.length > 0) {
            setCurrentSessionId(parsed.sessions[0].id);
          }
          if (parsed.language) {
            handleLanguageChange(parsed.language);
          }
          alert(language === 'ar' ? 'تم استيراد المحادثات بنجاح!' : 'Chats imported successfully!');
        } else {
          alert(language === 'ar' ? 'الملف غير متوافق أو لا يحتوي على بنية محادثات صحيحة.' : 'Incompatible file format.');
        }
      } catch {
        alert(language === 'ar' ? 'فشل قراءة الملف. تأكد من أنه ملف JSON سليم.' : 'Failed to read file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save sessions to LocalStorage with debouncing to prevent synchronous main-thread disk I/O thrashing during streaming or rapid typing
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const nonIncognito = sessions.filter((s) => !s.isIncognito);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(nonIncognito));
      } catch (e) {
        console.error('Failed to save sessions to localStorage:', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [sessions]);

  // Current session messages
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || EMPTY_MESSAGES;

  // Dynamically update document.title based on current active chat or 'New Chat'
  useEffect(() => {
    if (currentSession && currentSession.title && currentSession.messages.length > 0) {
      document.title = `${currentSession.title} — NUX AI`;
    } else {
      document.title = 'New Chat — NUX AI';
    }
  }, [currentSession?.title, currentSession?.messages.length]);

  // Scroll detection to toggle "Scroll Down" floating button
  const handleScroll = () => {
    if (!viewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceFromBottom > 50;
    setIsUserScrolledUp((prev) => (prev !== isUp ? isUp : prev));
  };

  const forceScrollToBottom = (smooth: boolean = true) => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
    setIsUserScrolledUp((prev) => (prev ? false : prev));
  };

  // Robust scroll & touch listeners for mobile and desktop viewport tracking
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onScrollCheck = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isUp = distanceFromBottom > 50;
      setIsUserScrolledUp((prev) => (prev !== isUp ? isUp : prev));
    };

    el.addEventListener('scroll', onScrollCheck, { passive: true });
    el.addEventListener('touchmove', onScrollCheck, { passive: true });
    window.addEventListener('resize', onScrollCheck, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScrollCheck);
      el.removeEventListener('touchmove', onScrollCheck);
      window.removeEventListener('resize', onScrollCheck);
    };
  }, [currentSessionId]);

  // Synchronize Google Gemini grounding metadata & sources if returned by server search tool
  useEffect(() => {
    const handleGroundingReceived = (e: any) => {
      const meta = e?.detail;
      if (!meta) return;
      const chunks = meta.groundingChunks;
      if (!Array.isArray(chunks) || chunks.length === 0) return;

      const sources = chunks
        .filter((c: any) => c?.web?.uri)
        .map((c: any) => {
          let domain = '';
          try {
            domain = new URL(c.web.uri).hostname.replace(/^www\./, '');
          } catch {
            domain = c.web.uri;
          }
          return {
            title: c.web.title || domain,
            url: c.web.uri,
            domain,
            snippet: c.web.title || '',
          };
        });

      if (sources.length === 0) return;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSessionId) return s;
          const lastMsg = s.messages[s.messages.length - 1];
          if (!lastMsg || lastMsg.sender !== 'ai') return s;

          const existingSources = lastMsg.searchMetadata?.sources || [];
          const existingUrls = new Set(existingSources.map((x: any) => x.url));
          const newSources = sources.filter((x: any) => !existingUrls.has(x.url));

          return {
            ...s,
            messages: s.messages.map((m, idx) => {
              if (idx === s.messages.length - 1) {
                return {
                  ...m,
                  searchMetadata: {
                    isSearching: false,
                    query: m.searchMetadata?.query || meta.webSearchQueries?.[0] || 'البحث في الويب',
                    sources: [...existingSources, ...newSources],
                  },
                };
              }
              return m;
            }),
          };
        })
      );
    };

    window.addEventListener('gemini-grounding-received', handleGroundingReceived);
    return () => {
      window.removeEventListener('gemini-grounding-received', handleGroundingReceived);
    };
  }, [currentSessionId]);

  // Keep auto-scrolling on streaming/new messages unless user explicitly scrolled up
  useEffect(() => {
    setShowAllMessages(false);
  }, [currentSessionId]);

  const lastMessage = messages[messages.length - 1];
  const lastMessageContentLength = lastMessage?.content?.length || 0;

  useEffect(() => {
    if (!isUserScrolledUp && messages.length > 0) {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }
  }, [messages.length, lastMessageContentLength, isUserScrolledUp]);

  // Switch session cleanly, purging the previous session if it was incognito
  const switchSession = (targetId: string | null) => {
    if (currentSessionId && currentSessionId !== targetId) {
      const activeSession = sessions.find((s) => s.id === currentSessionId);
      if (activeSession?.isIncognito) {
        setSessions((prev) => prev.filter((s) => s.id !== currentSessionId));
      }
    }
    setCurrentSessionId(targetId);
  };

  // Create New Chat Session
  const handleNewChat = (isIncognito?: boolean | any) => {
    if (isLoading) {
      handleStop();
    }
    const isPrivate = isIncognito === true;

    // Purge current session if it was incognito
    if (currentSessionId) {
      const activeSession = sessions.find((s) => s.id === currentSessionId);
      if (activeSession?.isIncognito) {
        setSessions((prev) => prev.filter((s) => s.id !== currentSessionId));
      }
    }

    // Check if we already have an empty chat of the same privacy type (incognito vs normal)
    const existingEmpty = sessions.find(
      (s) => s.messages.length === 0 && !!s.isIncognito === isPrivate
    );

    if (existingEmpty) {
      setCurrentSessionId(existingEmpty.id);
      setInput('');
      setAttachedFiles([]);
      setSidebarOpen(false);
      return;
    }

    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newSession: ChatSession = {
      id: newSessionId,
      title: isPrivate
        ? (language === 'ar' ? 'محادثة خفية' : 'Incognito chat')
        : (language === 'ar' ? 'محادثة جديدة' : 'New chat'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      modelId: currentModel.id,
      isIncognito: isPrivate,
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setInput('');
    setAttachedFiles([]);
    setSidebarOpen(false);
  };

  // Select existing session
  const handleSelectSession = (id: string) => {
    if (isLoading) {
      handleStop();
    }
    switchSession(id);
    const selected = sessions.find((s) => s.id === id);
    if (selected && selected.modelId) {
      const m = getModelById(selected.modelId);
      if (m) setCurrentModel(m);
    }
    setSidebarOpen(false);
    setTimeout(forceScrollToBottom, 100);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    if (currentSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  // Rename session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (isLoading) handleStop();
    setSessions([]);
    setCurrentSessionId(null);
  };

  // Stop generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Send message
  const handleSend = async (customPrompt?: string, customFiles?: FileAttachment[]) => {
    const textToSend = customPrompt !== undefined ? customPrompt.trim() : input.trim();
    const filesToSend = customFiles !== undefined ? customFiles : attachedFiles;

    if (!textToSend && filesToSend.length === 0) return;
    if (isLoading) return;

    let activeSessionId = currentSessionId;
    let targetSession = sessions.find((s) => s.id === activeSessionId);

    // Auto-create session if none exists
    if (!activeSessionId || !targetSession) {
      const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newSessionTitle =
        textToSend.slice(0, 36) ||
        (filesToSend.length > 0 ? filesToSend[0].name : language === 'ar' ? 'محادثة جديدة' : 'New chat');

      targetSession = {
        id: newSessionId,
        title: newSessionTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        modelId: currentModel.id,
      };

      setSessions((prev) => [targetSession!, ...prev]);
      setCurrentSessionId(newSessionId);
      activeSessionId = newSessionId;
    } else if (targetSession.messages.length === 0) {
      // Update title on first message
      const dynamicTitle =
        textToSend.slice(0, 36) ||
        (filesToSend.length > 0 ? filesToSend[0].name : language === 'ar' ? 'محادثة جديدة' : 'New chat');
      handleRenameSession(activeSessionId, dynamicTitle);
    }

    // User Message
    const userMessage: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      role: 'user',
      text: textToSend,
      content: textToSend,
      timestamp: Date.now(),
      attachments: filesToSend.length > 0 ? filesToSend : undefined,
      modelUsed: currentModel.id,
    };

    // Check if autonomous web search is needed or requested
    const needsWebSearch = shouldTriggerWebSearch(textToSend);
    const initialSearchMetadata = needsWebSearch
      ? {
          isSearching: true,
          query: extractSearchQuery(textToSend),
          sources: [],
        }
      : undefined;

    // AI Message (Placeholder)
    const aiMessageId = 'msg_ai_' + Date.now();
    const isDeepThinking = getDeepThinkingEnabled();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      sender: 'ai',
      role: 'assistant',
      text: '',
      content: '',
      timestamp: Date.now(),
      modelId: currentModel.id,
      modelUsed: isDualModel
        ? `${currentModel.name} & ${secondaryModel?.name || ''}`
        : currentModel.name,
      isStreaming: true,
      searchMetadata: initialSearchMetadata,
      isDeepThinking,
    };

    const currentMessages = targetSession.messages || [];
    const updatedMessagesWithUser = [...currentMessages, userMessage];

    // Optimistically update state
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...updatedMessagesWithUser, aiMessage],
              updatedAt: Date.now(),
            }
          : s
      )
    );

    // Clear inputs
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let finalMessagesToSend = updatedMessagesWithUser;

      if (needsWebSearch) {
        try {
          const searchResult = await performWebSearch(textToSend, abortController.signal);
          
          // Update searchMetadata with retrieved websites/sources
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === aiMessageId ? { ...m, searchMetadata: searchResult } : m
                    ),
                  }
                : s
            )
          );

          // Enrich context for the model with grounded real-time search findings
          if (searchResult.sources && searchResult.sources.length > 0) {
            const searchContext = formatSearchContextForModel(searchResult);
            finalMessagesToSend = updatedMessagesWithUser.map((m, idx) => {
              if (idx === updatedMessagesWithUser.length - 1) {
                return {
                  ...m,
                  content: (m.content || m.text || '') + searchContext,
                  text: (m.text || m.content || '') + searchContext,
                };
              }
              return m;
            });
          }
        } catch (searchErr) {
          console.warn('Autonomous web search warning:', searchErr);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === aiMessageId && m.searchMetadata
                        ? { ...m, searchMetadata: { ...m.searchMetadata, isSearching: false } }
                        : m
                    ),
                  }
                : s
            )
          );
        }
      }

      let pendingStreamText = '';
      let streamRafId: number | null = null;

      const pushStreamText = (text: string) => {
        pendingStreamText = text;
        if (streamRafId !== null) return;
        streamRafId = requestAnimationFrame(() => {
          streamRafId = null;
          const currentText = pendingStreamText;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === aiMessageId
                        ? { ...m, text: currentText, content: currentText, isStreaming: true }
                        : m
                    ),
                  }
                : s
            )
          );
        });
      };

      let finalReply = '';
      if (isDualModel && secondaryModel) {
        finalReply = await sendDualModelDebate({
          modelAId: currentModel.id,
          modelBId: secondaryModel.id,
          modelAName: currentModel.name,
          modelBName: secondaryModel.name,
          userQuery:
            textToSend ||
            (filesToSend.length > 0
              ? (language === 'ar' ? `تحليل ومراجعة الملف المرفق: ${filesToSend[0].name}` : `Analyze attached file: ${filesToSend[0].name}`)
              : ''),
          attachments: filesToSend,
          chatHistory: finalMessagesToSend.slice(0, -1).map((m) => ({
            role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
            content: m.content || m.text || '',
            attachments: m.attachments,
            images: m.images,
          })),
          language,
          onChunk: (streamedText) => {
            pushStreamText(streamedText);
          },
        });
      } else {
        finalReply = await sendChatMessage({
          modelId: currentModel.id,
          messages: finalMessagesToSend.map((m) => ({
            role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
            content: m.content || m.text || '',
            attachments: m.attachments,
            images: m.images,
          })),
          onChunk: (chunk, fullText) => {
            const streamedText = fullText || chunk;
            pushStreamText(streamedText);
          },
          signal: abortController.signal,
        });
      }

      if (streamRafId !== null) {
        cancelAnimationFrame(streamRafId);
        streamRafId = null;
      }

      // Mark streaming complete with final validated reply
      const completedText = finalReply || pendingStreamText;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        text: completedText || m.text,
                        content: completedText || m.content,
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMessageId
                      ? {
                          ...m,
                          text: m.text + (language === 'ar' ? ' [تم إيقاف التوليد]' : ' [Generation stopped]'),
                          content: m.content + (language === 'ar' ? ' [تم إيقاف التوليد]' : ' [Generation stopped]'),
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : s
          )
        );
      } else {
        let errorMsg =
          err?.message || (language === 'ar' ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred while generating response.');

        // Clean up raw JSON or billing errors for user
        if (errorMsg.includes('402') || errorMsg.includes('payment method is required') || errorMsg.includes('balance_units')) {
          errorMsg = language === 'ar'
            ? 'هذا النموذج يتطلب اشتراكاً مدفوعاً أو بطاقة دفع على منصته. يرجى اختيار نموذج مجاني مثل Claude أو GPT أو Gemini للاستمرار بسلاسة.'
            : 'This model requires active billing on its provider. Please select a free model like Claude, GPT, or Gemini to continue.';
        } else if (errorMsg.includes('401') || errorMsg.includes('invalid_api_key')) {
          errorMsg = language === 'ar'
            ? 'مفتاح API الخاص بهذا النموذج غير صالح أو منتهي الصلاحية. يمكنك تحديثه من الإعدادات ⚙️ أو اختيار نموذج آخر.'
            : 'The API key for this model is invalid or expired. You can update it in Settings ⚙️ or select another model.';
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMessageId
                      ? {
                          ...m,
                          text: errorMsg,
                          content: errorMsg,
                          isStreaming: false,
                          isError: true,
                          error: true,
                        }
                      : m
                  ),
                }
              : s
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = async () => {
    if (!currentSession || currentSession.messages.length < 2 || isLoading) return;

    const msgs = [...currentSession.messages];
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.sender !== 'ai' && lastMsg.role !== 'assistant') return;

    msgs.pop(); // Remove AI message
    const lastUserMsg = msgs[msgs.length - 1];
    if (!lastUserMsg) return;

    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? { ...s, messages: msgs } : s))
    );

    const prevAttachments = lastUserMsg.attachments || [];
    handleSend(lastUserMsg.text || lastUserMsg.content || '', prevAttachments);
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="flex h-screen w-full bg-[#FAF8F5] dark:bg-[#181715] text-[#22211E] dark:text-[#EDEAE4] overflow-hidden select-text"
    >
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearAllSessions={handleClearAllSessions}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        language={language}
        onSelectLanguage={handleLanguageChange}
        onOpenSettings={() => setShowSettingsModal(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header */}
        <header className="h-13 px-4 sm:px-6 flex items-center justify-between bg-[#FAF8F5]/90 dark:bg-[#181715]/90 backdrop-blur-md z-20 sticky top-0 border-b border-[#E8E2D5] dark:border-[#2C2A25]">
          <div className="flex items-center gap-2.5">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#736E64] dark:text-[#A8A49A] transition-colors cursor-pointer"
              title={t.sidebar}
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-sm tracking-tight text-[#22211E] dark:text-[#FAF8F5]">
              NUX
            </span>
          </div>

          {/* Center: Model Selector Dropdown */}
          <div className="flex items-center">
            <ModelSelector
              currentModel={currentModel}
              onSelectModel={handleSelectModel}
              dropAlign="center"
              language={language}
            />
          </div>

          {/* Right: Consolidated Header Actions (Theme, Ghost, New Chat, Settings) */}
          <div className="flex items-center gap-1.5">
            {/* Morning / Night Theme Quick Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#736E64] dark:text-[#A8A49A] transition-colors cursor-pointer"
              title={
                theme === 'dark'
                  ? (language === 'ar' ? 'تفعيل الوضع الصباحي' : 'Switch to Morning Theme')
                  : (language === 'ar' ? 'تفعيل الوضع الليلي' : 'Switch to Night Theme')
              }
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            <button
              onClick={() => handleNewChat(true)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                currentSession?.isIncognito
                  ? 'bg-black/10 dark:bg-white/10 text-orange-600 dark:text-orange-400'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#736E64] dark:text-[#A8A49A]'
              }`}
              title={language === 'ar' ? 'محادثة مؤقتة' : 'Temporary Chat'}
              aria-label="Temporary Chat"
            >
              <Ghost className="w-4 h-4" />
            </button>

            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#736E64] dark:text-[#A8A49A] transition-colors cursor-pointer"
              title={t.newChat}
              aria-label={t.newChat}
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#736E64] dark:text-[#A8A49A] transition-colors cursor-pointer"
              title={t.settings}
              aria-label={t.settings}
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Incognito Banner */}
        {currentSession?.isIncognito && (
          <div className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-xs text-[#736E64] dark:text-[#A8A49A] font-medium z-15 select-none animate-fadeIn shrink-0">
            <Ghost className="w-4 h-4 text-[#736E64] dark:text-[#A8A49A] shrink-0" />
            <span>{(t as any).incognitoEnabled}</span>
          </div>
        )}

        {/* Message Viewport or Welcome Screen */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden chat-viewport flex flex-col relative w-full max-w-full min-w-0"
          ref={viewportRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-3xl mx-auto my-auto min-w-0">
              <WelcomeHeader language={language} isIncognito={currentSession?.isIncognito} />

              <div className="w-full min-w-0">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  attachedFiles={attachedFiles}
                  setAttachedFiles={setAttachedFiles}
                  onSend={(customText, customFiles) => {
                    handleSend(customText, customFiles);
                    setTimeout(forceScrollToBottom, 100);
                  }}
                  isLoading={isLoading}
                  onStop={handleStop}
                  currentModel={currentModel}
                  onSelectModel={handleSelectModel}
                  isDualModel={isDualModel}
                  setIsDualModel={setIsDualModel}
                  secondaryModel={secondaryModel}
                  onSelectSecondaryModel={setSecondaryModel}
                  className="w-full px-0 pb-1 pt-0 relative"
                  autoFocus
                  language={language}
                />
              </div>

              <WelcomeActionChips
                onSelectPrompt={(text) => {
                  setInput(text);
                }}
                language={language}
              />
            </div>
          ) : (
            <div className="flex-1 py-4 sm:py-6 w-full max-w-full overflow-x-hidden min-w-0">
              {messages.length > 25 && !showAllMessages && (
                <div className="flex justify-center my-3 px-4">
                  <button
                    type="button"
                    onClick={() => setShowAllMessages(true)}
                    className="px-4 py-2 rounded-lg bg-[#F5F2E9] dark:bg-[#252420] border border-[#E2DDD0] dark:border-[#383630] text-xs font-medium text-[#7A766D] dark:text-[#99958C] hover:text-[#262421] dark:hover:text-[#EDE9DF] transition-colors cursor-pointer shadow-2xs"
                  >
                    {language === 'ar' ? `عرض الرسائل السابقة (${messages.length - 25} مخفية)` : `Load earlier messages (${messages.length - 25} hidden)`}
                  </button>
                </div>
              )}

              {((messages.length > 25 && !showAllMessages) ? messages.slice(-25) : messages).map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  language={language}
                  onRegenerate={
                    (message.sender === 'ai' || message.role === 'assistant') &&
                    message.id === messages[messages.length - 1]?.id
                      ? handleRegenerate
                      : undefined
                  }
                  onOpenArtifact={handleOpenArtifact}
                />
              ))}

              <div ref={messagesEndRef} className="h-6" />
            </div>
          )}
        </div>

        {/* Chat Input Floating Area (when messages exist) */}
        {messages.length > 0 && (
          <div className="w-full shrink-0 relative z-30 max-w-full">
            {/* Scroll Down Floating Button pinned right above ChatInput */}
            <AnimatePresence>
              {isUserScrolledUp && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute -top-12 sm:-top-13 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                >
                  <button
                    onClick={() => forceScrollToBottom(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-full bg-[#FAF8F5]/95 dark:bg-[#201F1D]/95 border border-[#DDD6C5] dark:border-[#383530] shadow-md text-[#55524B] dark:text-[#C5C2BA] hover:text-[#B85736] dark:hover:text-[#D97757] text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md select-none touch-manipulation"
                    title={t.scrollDown}
                    aria-label={t.scrollDown}
                  >
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce text-[#B85736] dark:text-[#D97757]" />
                    <span>{t.scrollDown}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <ChatInput
              input={input}
              setInput={setInput}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              onSend={(customText, customFiles) => {
                handleSend(customText, customFiles);
                setTimeout(forceScrollToBottom, 100);
              }}
              isLoading={isLoading}
              onStop={handleStop}
              currentModel={currentModel}
              onSelectModel={handleSelectModel}
              isDualModel={isDualModel}
              setIsDualModel={setIsDualModel}
              secondaryModel={secondaryModel}
              onSelectSecondaryModel={setSecondaryModel}
              language={language}
            />
          </div>
        )}
      </div>

      {/* Artifact Modal */}
      {artifactData && (
        <ArtifactModal
          code={artifactData.code}
          language={artifactData.language}
          onClose={() => setArtifactData(null)}
        />
      )}

      {/* Unified Settings Modal (Appearance, Morning vs Night Theme, Language, API Keys, Local Run, Backup) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        language={language}
        onSelectLanguage={handleLanguageChange}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSetTheme={(newTheme) => setTheme(newTheme)}
        sessions={sessions}
        onClearAllSessions={handleClearAllSessions}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Global Sleek Tooltip Manager */}
      <GlobalTooltip />
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Moon,
  Sun,
  PanelLeftClose,
  Download,
  Upload,
  Sliders,
  Globe,
  Glasses,
  Ghost,
} from 'lucide-react';
import { ChatSession } from '../types';
import { Language, translations } from '../utils/i18n';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: (isIncognito?: boolean) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAllSessions: () => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  language?: Language;
  onSelectLanguage?: (lang: Language) => void;
  onOpenSettings?: () => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClearAllSessions,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  language = 'ar',
  onSelectLanguage,
  onOpenSettings,
  onExportData,
  onImportData,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Clean, Elegant Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 ${
          language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'
        } z-40 w-64 sm:w-72 flex flex-col bg-[#F7F5EE] dark:bg-[#1C1B18] border-[#E6E1D4] dark:border-[#2C2A25] transition-transform duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0'
            : language === 'ar'
            ? 'translate-x-full md:translate-x-0'
            : '-translate-x-full md:translate-x-0'
        } ${!isOpen ? 'md:hidden' : ''}`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[#E6E1D4] dark:border-[#2C2A25] flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight text-[#22211E] dark:text-[#EDEAE4]">
            {t.chats} ({sessions.length})
          </span>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#7D796F] dark:text-[#A8A49A] transition-colors cursor-pointer"
            title={language === 'ar' ? 'إخفاء' : 'Close'}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-2.5 flex flex-col gap-1.5">
          <button
            onClick={() => onNewChat(false)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#2B2925] dark:bg-[#FAF8F5] text-white dark:text-[#22211E] font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newChat}</span>
          </button>

          <button
            onClick={() => onNewChat(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#DDD8CB] dark:border-[#38362F] text-[#7D796F] dark:text-[#A8A49A] hover:bg-black/5 dark:hover:bg-white/5 font-medium text-xs transition-all cursor-pointer"
            title={(t as any).incognitoChatDesc}
          >
            <Ghost className="w-3.5 h-3.5" />
            <span>{(t as any).incognitoChat}</span>
          </button>
        </div>

        {/* Search */}
        {sessions.length > 2 && (
          <div className="px-2.5 pb-2">
            <div className="relative flex items-center">
              <Search
                className={`w-3 h-3 absolute ${
                  language === 'ar' ? 'right-2.5' : 'left-2.5'
                } text-[#9A968C]`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchChats}
                className={`w-full ${
                  language === 'ar' ? 'pr-7 pl-2' : 'pl-7 pr-2'
                } py-1 text-xs rounded-lg bg-white/70 dark:bg-[#252420] border border-[#DDD8CB] dark:border-[#38362F] text-[#22211E] dark:text-[#EDEAE4] placeholder-[#9A968C] focus:outline-none`}
              />
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-6 px-3 text-xs text-[#8E8A80]">
              {searchQuery ? t.noSearchResults : t.noChats}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === currentSessionId;
              const isEditing = editingId === session.id;
              const isIncognito = session.isIncognito;

              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-[#252420] text-[#1E1D1A] dark:text-[#FAF8F5] font-medium shadow-2xs border border-[#E6E1D4] dark:border-[#2C2A25]'
                      : 'text-[#4F4B43] dark:text-[#C5C1B6] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isIncognito ? (
                      <Ghost
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#B85736] dark:text-[#EBE7DC]' : 'text-[#8E8A80]'
                        }`}
                      />
                    ) : (
                      <MessageSquare
                        className={`w-3 h-3 shrink-0 ${
                          isSelected ? 'text-[#B85736]' : 'text-[#8E8A80]'
                        }`}
                      />
                    )}
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(session.id, e);
                            if (e.key === 'Escape') cancelRename(e as any);
                          }}
                          autoFocus
                          className="w-full px-1 py-0.5 text-xs bg-white dark:bg-[#181715] border border-[#B85736] rounded text-[#22211E] dark:text-[#FAF8F5] focus:outline-none"
                        />
                        <button
                          onClick={(e) => saveRename(session.id, e)}
                          className="p-0.5 hover:text-emerald-600"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={cancelRename} className="p-0.5 hover:text-rose-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => startRename(session, e)}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[#7D796F] hover:text-[#22211E] dark:hover:text-[#FAF8F5]"
                        title={t.editTitle}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[#7D796F] hover:text-rose-600"
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions & Controls */}
        <div className="p-2 border-t border-[#E6E1D4] dark:border-[#2C2A25] space-y-0.5 text-xs">
          {/* Unified Settings Modal Trigger */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#555147] dark:text-[#C5C1B6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#B85736]" />
                <span>{t.settings}</span>
              </div>
            </button>
          )}

          {/* Language Switcher in Sidebar */}
          {onSelectLanguage && (
            <button
              onClick={() => onSelectLanguage(language === 'ar' ? 'en' : 'ar')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#555147] dark:text-[#C5C1B6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.language}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EAE5DA] dark:bg-[#2C2A25] text-[#6B665C] dark:text-[#A8A49A] font-medium">
                {language === 'ar' ? 'English' : 'العربية'}
              </span>
            </button>
          )}

          {/* Morning vs Night Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#555147] dark:text-[#C5C1B6] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>{theme === 'dark' ? t.morningTheme : t.nightTheme}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EAE5DA] dark:bg-[#2C2A25] text-[#6B665C] dark:text-[#A8A49A]">
              {theme === 'dark' ? t.night : t.morning}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
});

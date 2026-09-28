import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Globe, ExternalLink } from 'lucide-react';
import { SearchMetadata } from '../types';

interface WebSearchIndicatorProps {
  searchMetadata?: SearchMetadata;
  language?: 'ar' | 'en';
}

export const WebSearchIndicator: React.FC<WebSearchIndicatorProps> = ({
  searchMetadata,
  language = 'ar',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!searchMetadata) return null;

  const { isSearching, query, sources = [] } = searchMetadata;
  const hasSources = sources.length > 0;

  // If search finished with 0 sources and not actively searching, don't clutter the UI
  if (!isSearching && !hasSources) return null;

  const headerLabel = isSearching
    ? language === 'ar'
      ? 'جاري البحث في الويب...'
      : 'Searching the web...'
    : language === 'ar'
    ? `البحث في الويب (${sources.length} مواقع)`
    : sources.length > 0
    ? `Searched ${sources.length} site${sources.length > 1 ? 's' : ''}`
    : 'Searching the web';

  return (
    <div className="mb-3 select-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Search Header Bar matching user reference */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#4A4740] dark:text-[#C8C4BC] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
      >
        {/* Orange Accent Dot matching reference */}
        <span
          className={`w-2 h-2 rounded-full bg-[#E05725] shrink-0 ${
            isSearching ? 'animate-pulse scale-110' : ''
          }`}
        />

        <span className="font-medium text-xs tracking-tight">
          {headerLabel}
        </span>

        {/* Chevron Arrow */}
        <ChevronRight
          className={`w-3.5 h-3.5 text-[#7D796F] dark:text-[#9E9A90] transition-transform duration-200 ${
            isExpanded ? (language === 'ar' ? '-rotate-90' : 'rotate-90') : ''
          }`}
        />
      </button>

      {/* Expandable Websites & Sources View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden mt-1.5"
          >
            <div className="p-3 rounded-xl bg-[#F4EFE6] dark:bg-[#201F1B] border border-[#DDD6C8] dark:border-[#35332D] space-y-2.5 text-xs text-[#33312B] dark:text-[#EDE9E1]">
              {query && (
                <div className="flex items-center justify-between text-[11px] text-[#7A7569] dark:text-[#A09B90] pb-1 border-b border-[#E5DFD1] dark:border-[#2E2C26]">
                  <span>
                    {language === 'ar' ? 'كلمات البحث:' : 'Search query:'}{' '}
                    <span className="font-mono text-[#22211E] dark:text-[#FAF7F2]">
                      "{query}"
                    </span>
                  </span>
                  {isSearching && (
                    <span className="animate-pulse text-[#E05725] font-medium">
                      {language === 'ar' ? 'جاري الفحص...' : 'Scanning...'}
                    </span>
                  )}
                </div>
              )}

              {sources.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {sources.map((src, index) => {
                    const isSafe = /^https?:\/\//i.test(src.url || '');
                    return (
                      <a
                        key={index}
                        href={isSafe ? src.url : '#'}
                        target={isSafe ? "_blank" : undefined}
                        rel={isSafe ? "noopener noreferrer" : undefined}
                        onClick={isSafe ? undefined : (e) => e.preventDefault()}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#FAF7F0] dark:bg-[#181714] border border-[#E3DDD0] dark:border-[#2C2A24] hover:border-[#CFC6B4] dark:hover:border-[#423E36] hover:bg-white dark:hover:bg-[#1E1D19] transition-all group/item text-start no-underline"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Globe Icon */}
                          <Globe className="w-3.5 h-3.5 text-[#E05725] shrink-0" />

                          {/* Website / Domain */}
                          <span className="text-[11px] font-mono text-[#7A7569] dark:text-[#A09B90] shrink-0 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            {src.domain || src.url}
                          </span>

                          {/* Source Title */}
                          <span className="font-medium text-xs text-[#1E1D1A] dark:text-[#FAF8F5] truncate group-hover/item:text-[#E05725] transition-colors">
                            {src.title}
                          </span>
                        </div>

                        {/* External Link Icon */}
                        <ExternalLink className="w-3.5 h-3.5 text-[#999488] dark:text-[#7A756A] group-hover/item:text-[#E05725] transition-colors shrink-0" />
                      </a>
                    );
                  })}
                </div>
              ) : isSearching ? (
                <div className="py-3 text-center text-xs text-[#7A7569] dark:text-[#A09B90]">
                  {language === 'ar'
                    ? 'جاري استعراض محركات البحث وجلب المصادر...'
                    : 'Querying search engines and retrieving sources...'}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

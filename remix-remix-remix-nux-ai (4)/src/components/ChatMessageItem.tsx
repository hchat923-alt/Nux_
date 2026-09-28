import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  FileCode,
  FileText,
  File as FileIcon,
  Music,
  Download,
  Atom,
} from 'lucide-react';
import { ChatMessage, FileAttachment } from '../types';
import { getModelById } from '../data/models';
import { FormattedMessage } from './FormattedMessage';
import { WebSearchIndicator } from './WebSearchIndicator';
import { formatFileSize } from '../utils/fileUtils';

interface ChatMessageItemProps {
  message: ChatMessage;
  language?: 'ar' | 'en';
  onRegenerate?: () => void;
  onOpenArtifact?: (code: string, language: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  message,
  language = 'ar',
  onRegenerate,
  onOpenArtifact,
}) => {
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const isAI = message.sender === 'ai' || message.role === 'assistant';
  const modelInfo = getModelById(message.modelId || '');
  const displayModelName = message.modelUsed || modelInfo.name;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const renderFileCard = (file: FileAttachment) => {
    let icon = <FileIcon className="w-4 h-4 text-[#B85736]" />;
    if (file.fileCategory === 'code') {
      icon = <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    } else if (file.fileCategory === 'pdf') {
      icon = <FileText className="w-4 h-4 text-red-500" />;
    } else if (file.fileCategory === 'audio') {
      icon = <Music className="w-4 h-4 text-purple-500" />;
    }

    return (
      <div
        key={file.id}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#F0ECE1]/90 dark:bg-[#22211C] border border-[#DDD6C5] dark:border-[#333029] text-[#22211E] dark:text-[#EDEAE4] shadow-2xs max-w-sm hover:border-[#B85736]/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[#B85736]/10 dark:bg-[#B85736]/15 text-[#B85736] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate" title={file.name}>
            {file.name}
          </div>
          <div className="text-[10.5px] text-[#7A756B] dark:text-[#9A968C] mt-0.5">
            {formatFileSize(file.size)}
          </div>
        </div>
        {file.data && (
          <a
            href={file.data}
            download={file.name}
            className="p-1.5 rounded-lg text-[#7A756B] dark:text-[#9A968C] hover:text-[#B85736] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title={language === 'ar' ? 'تحميل الملف' : 'Download file'}
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  };

  if (!isAI) {
    // User Question: Clean, minimal, compact, fitting tightly to text and attachments
    const imageAttachments = (message.attachments || []).filter(
      (a) => a.fileCategory === 'image'
    );
    const nonImageAttachments = (message.attachments || []).filter(
      (a) => a.fileCategory !== 'image'
    );
    const legacyImages = message.images || [];

    return (
      <div className="py-1.5 px-4 sm:px-6 w-full max-w-3xl mx-auto flex justify-start">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 460,
            damping: 24,
            mass: 0.55,
          }}
          className="w-fit max-w-[85%] sm:max-w-[78%] space-y-2 flex flex-col items-start"
        >
          {/* Render Non-Image File Cards if any */}
          {nonImageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-start w-full">
              {nonImageAttachments.map((file) => renderFileCard(file))}
            </div>
          )}

          {/* Render Attached Images (modern and legacy) if any */}
          {(imageAttachments.length > 0 || legacyImages.length > 0) && (
            <div className="flex flex-wrap gap-2 justify-start w-full">
              {imageAttachments.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setPreviewImage(file.data)}
                  className="relative group/img cursor-pointer rounded-xl overflow-hidden border border-[#DDD6C5] dark:border-[#383530] bg-black/5 dark:bg-white/5 shadow-2xs transition-transform hover:scale-[1.02]"
                >
                  <img
                    src={file.data}
                    alt={file.name}
                    referrerPolicy="no-referrer"
                    className="max-h-56 max-w-full sm:max-w-xs object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              ))}

              {legacyImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewImage(img)}
                  className="relative group/img cursor-pointer rounded-xl overflow-hidden border border-[#DDD6C5] dark:border-[#383530] bg-black/5 dark:bg-white/5 shadow-2xs transition-transform hover:scale-[1.02]"
                >
                  <img
                    src={img}
                    alt={`Attached ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="max-h-56 max-w-full sm:max-w-xs object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {message.content && (
            <div
              dir="auto"
              className="py-2.5 px-4 rounded-[20px] rounded-se-[4px] bg-[#F0ECE1] dark:bg-[#252420] border border-[#DDD6C5]/70 dark:border-[#383530] text-[#22211E] dark:text-[#EDEAE4] text-[14.5px] leading-relaxed shadow-xs group relative text-start inline-block w-fit max-w-full"
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Subtle copy icon only on hover */}
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 end-1.5">
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-[#78746B] dark:text-[#9A968C] hover:text-[#22211E] dark:hover:text-[#EDEAE4] p-0.5 rounded transition-colors cursor-pointer"
                  title={language === 'ar' ? "نسخ" : "Copy"}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Full Image Preview Lightbox */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-[#1E1C1A] rounded-2xl p-2 border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 end-3 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors z-10 cursor-pointer"
                title={language === 'ar' ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={previewImage}
                alt="Preview full"
                referrerPolicy="no-referrer"
                className="max-h-[82vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Assistant Response: Minimal, spacious, calm typography
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="py-3 sm:py-4 px-4 sm:px-6 w-full max-w-3xl mx-auto group min-w-0 overflow-hidden"
    >
      <div className="flex items-start gap-3 w-full min-w-0">
        {/* Simple model indicator */}
        <div className="w-6 h-6 rounded-full bg-[#E5E0D4] dark:bg-[#2E2C27] text-[#55524B] dark:text-[#C5C1B6] flex items-center justify-center font-mono text-[10px] shrink-0 mt-1 select-none">
          {modelInfo.provider === 'Ollama' ? 'OL' : modelInfo.provider === 'OpenRouter' ? 'OR' : 'AI'}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          {/* Subtle model title */}
          <div className="flex items-center gap-2 mb-1.5 select-none text-xs text-[#7D796F] dark:text-[#99958C]">
            <span className="font-semibold text-[#22211E] dark:text-[#EDEAE4] flex items-center gap-1">
              {displayModelName}
            </span>
            {modelInfo.provider === 'Ollama' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-[#6B655B] dark:text-[#B5B0A4] font-medium">
                {language === 'ar' ? 'محلي (Ollama)' : 'Local (Ollama)'}
              </span>
            )}
            {modelInfo.provider === 'OpenRouter' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                OpenRouter
              </span>
            )}
            {message.isDeepThinking && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-[#B85736]/10 text-[#B85736] dark:text-[#E07A5F] font-medium border border-[#B85736]/20">
                <Atom className="w-2.5 h-2.5" />
                <span>{language === 'ar' ? 'تفكير عميق' : 'Deep Thinking'}</span>
              </span>
            )}
          </div>

          {/* Autonomous Web Search Indicator & Sources Accordion */}
          {message.searchMetadata && (
            <WebSearchIndicator
              searchMetadata={message.searchMetadata}
              language={language}
            />
          )}

          {/* Error message */}
          {(message.error || message.isError) ? (
            <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs flex flex-col gap-2 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">
                  <p className="font-semibold mb-0.5">{language === 'ar' ? 'حدث خطأ أثناء الاتصال بالنموذج' : 'An error occurred while connecting to the model'}</p>
                  <p className="text-[11px] leading-relaxed opacity-90 break-words [overflow-wrap:anywhere] break-all">{message.content}</p>
                </div>
              </div>
              {onRegenerate && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-900 dark:text-red-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إعادة المحاولة الآن' : 'Retry Now'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-start min-w-0 max-w-full overflow-hidden">
              <FormattedMessage
                content={message.content}
                isStreaming={message.isStreaming}
                onOpenArtifact={onOpenArtifact}
                language={language}
              />
            </div>
          )}

          {/* Clean Action Bar (Copy / Retry) */}
          {!message.isStreaming && !(message.error || message.isError) && message.content && (
            <div className="flex items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-[#78746B] dark:text-[#99958C] hover:text-[#22211E] dark:hover:text-[#EDEAE4] py-1 px-1.5 rounded transition-colors cursor-pointer"
                title={language === 'ar' ? "نسخ الإجابة" : "Copy response"}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-600">{language === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{language === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </>
                )}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 text-xs text-[#78746B] dark:text-[#99958C] hover:text-[#22211E] dark:hover:text-[#EDEAE4] py-1 px-1.5 rounded transition-colors cursor-pointer"
                  title={language === 'ar' ? "إعادة المحاولة" : "Retry"}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{language === 'ar' ? 'إعادة' : 'Retry'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.language === next.language &&
    Boolean(prev.onRegenerate) === Boolean(next.onRegenerate) &&
    prev.message.searchMetadata?.isSearching === next.message.searchMetadata?.isSearching &&
    prev.message.searchMetadata?.sources?.length === next.message.searchMetadata?.sources?.length
  );
});


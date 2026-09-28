import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight, Brain, Atom, Sparkles, Clock } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface ThoughtProcessAccordionProps {
  thoughtText: string;
  isStreaming?: boolean;
  language?: string;
  defaultExpanded?: boolean;
}

/**
 * Intelligently separates internal reasoning/chain-of-thought from the actual answer
 * only when the model explicitly starts its final user-facing response or forgets to close the thought tag.
 */
function separateThoughtAndResponse(rawThought: string): { thought: string; answer: string } {
  if (!rawThought || !rawThought.trim()) {
    return { thought: '', answer: '' };
  }

  const trimmed = rawThought.trim();

  // 1. Explicit answer marker tags or headings (e.g. **Answer:**, ### الإجابة, Here is the response:)
  const explicitMarkerRegex =
    /(?:\n+|^)(?:\*\*Answer:\*\*|\*\*Response:\*\*|### Answer\b|### Response\b|### الإجابة|### الرد|\*\*الإجابة:\*\*|\*\*الرد:\*\*|Here is the response:|Here is the answer:|Here's the response:|Final Answer:|الجواب النهائي:|الإجابة النهائية:)([\s\S]*)$/i;
  const markerMatch = trimmed.match(explicitMarkerRegex);
  if (markerMatch && markerMatch.index !== undefined && markerMatch.index > 0) {
    const thought = trimmed.substring(0, markerMatch.index).trim();
    const answer = markerMatch[1].trim();
    if (thought && answer) {
      return { thought, answer };
    }
  }

  // 2. English chain-of-thought explicitly stating "Now I will answer:" or "Final response:"
  const explicitEnglishTransitionRegex =
    /([\s\S]*?(?:Now providing the answer to the user:?|Now answer the user:?|Let's provide the final response:?|Final response to user:?))\s*\n+([\s\S]*)$/i;
  const transitionMatch = trimmed.match(explicitEnglishTransitionRegex);
  if (transitionMatch && transitionMatch[1] && transitionMatch[2]) {
    const thought = transitionMatch[1].trim();
    const answer = transitionMatch[2].trim();
    if (thought && answer) {
      return { thought, answer };
    }
  }

  // Default: Preserve the entire block as thought! Never wipe or discard thoughts.
  return { thought: trimmed, answer: '' };
}

/**
 * Strips leaked meta-deliberation (e.g. "The developer instruction overrides...",
 * "User asks again...", "Need to answer per developer instruction...",
 * "According to developer instruction...", "Must include <thought> tags...", etc.)
 * and moves them to the thoughtText so they NEVER appear in the clean user-facing response.
 */
function sanitizeCleanResponse(
  content: string,
  existingThought: string
): { thoughtText: string; cleanContent: string } {
  let clean = (content || '').trim();
  let collectedThoughts = (existingThought || '').trim();

  // 1. Comprehensive regex for leaked meta-deliberations, developer instruction citations, and chain-of-thought preambles
  const metaLeakRegex =
    /^(?:The developer instruction overrides|User asks again|The user asks|User asks|According to developer|Actually the developer|The developer message|Developer message|Developer instruction|Need to answer per developer|Must include <thought>|So we must comply|Also we must follow|We must follow|We have a user|System instruction|According to system|In compliance with|My instructions|I must follow|As an AI model instructed to)[\s\S]*?(?:after the thought block\.?|tags with reasoning and then answer\.?|must respond:\s*|say:\s*|include\s*|\.\s+|\n+)(?=[\u0600-\u06FF]|I am|I'm|Hello|Hi|أنا|مرحباً|$)/i;

  let leakMatch = clean.match(metaLeakRegex);
  while (leakMatch && leakMatch[0]) {
    const leakedPart = leakMatch[0].trim();
    collectedThoughts = collectedThoughts
      ? `${collectedThoughts}\n\n${leakedPart}`
      : leakedPart;
    clean = clean.substring(leakMatch[0].length).trim();
    leakMatch = clean.match(metaLeakRegex);
  }

  // 2. Specific blacklist for forbidden sentences anywhere in clean text
  const forbiddenSnippets: RegExp[] = [
    /The developer instruction overrides the system instruction:[^\n.]*/gi,
    /The developer instruction overrides the system instruction[^\n.]*/gi,
    /I will provide the answer concisely after the thought block\.?/gi,
    /Need to answer per developer instruction:[^\n.]*/gi,
    /Need to answer per developer instruction[^\n.]*/gi,
    /Must include <thought> tags with reasoning and then answer\.?/gi,
    /Must include <thought> tags[^\n.]*/gi,
    /User asks again "[^"]*"[^\n.]*/gi,
    /User asks again[^\n.]*/gi,
    /According to developer instructions?,?[^\n.]*/gi,
    /Actually the developer message says,?[^\n.]*/gi,
    /So we must comply with that\.?/gi,
    /Also we must follow deep thinking directive[^\n.]*/gi,
    /I must not mention any other organization\.?/gi,
    /I must state that I am an artificial intelligence model trained by Libo[^\n.]*(?=\n|$)/gi,
  ];

  for (const snippet of forbiddenSnippets) {
    if (snippet.test(clean)) {
      clean = clean.replace(snippet, '').trim();
    }
  }

  // 3. Clean up lingering markdown response prefixes
  clean = clean.replace(/^(?:\*\*Answer:\*\*|\*\*Response:\*\*|### Answer|### Response|### الإجابة|\*\*الإجابة:\*\*|---\s*)/i, '').trim();

  // 4. Strip any lingering <thought> or </thought> tags that might have remained in the clean answer
  clean = clean.replace(/<\/?(?:thought|thinking|reasoning|think|thought_process)>/gi, '').trim();

  // 5. If clean is empty, inspect collectedThoughts to see if an answer was trapped inside
  if (!clean && collectedThoughts) {
    const separated = separateThoughtAndResponse(collectedThoughts);
    if (separated.answer) {
      collectedThoughts = separated.thought;
      clean = separated.answer;
    }
  }

  return { thoughtText: collectedThoughts, cleanContent: clean };
}

/**
 * Robustly extracts <thought>, <thinking>, <reasoning>, or <think> blocks from content.
 * Isolate all internal deliberations into thoughtText, ensuring cleanContent is strictly
 * the final readable response without any leaked instructions, code, or meta-commentary.
 */
export function extractThoughtProcess(rawContent: string): {
  thoughtText: string;
  cleanContent: string;
  isThinkingOngoing: boolean;
} {
  if (!rawContent) {
    return { thoughtText: '', cleanContent: '', isThinkingOngoing: false };
  }

  let text = rawContent;
  const thoughts: string[] = [];
  let isThinkingOngoing = false;

  // 1. Match and collect all fully closed thought tags (<thought>...</thought>, <deep_thought>...</deep_thought>, <think>...</think>, etc.)
  const closedTagRegex = /<(thought|deep_thought|thinking|reasoning|think|thought_process)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = closedTagRegex.exec(text)) !== null) {
    const rawBlock = match[2].trim();
    if (rawBlock) {
      const { thought, answer } = separateThoughtAndResponse(rawBlock);
      if (thought) thoughts.push(thought);
      if (answer) {
        // If an answer was trapped inside the closed thought tag, append it to the remaining text
        text = text.replace(match[0], `\n\n${answer}\n\n`);
      }
    }
  }
  text = text.replace(closedTagRegex, '').trim();

  // 2. Check for an unclosed (streaming) thought tag
  const openTagRegex = /<(?:thought|deep_thought|thinking|reasoning|think|thought_process)>([\s\S]*)$/i;
  const openMatch = text.match(openTagRegex);
  if (openMatch) {
    const partialRaw = openMatch[1].trim();
    const { thought, answer } = separateThoughtAndResponse(partialRaw);
    if (answer) {
      // If the model already transitioned to the answer during streaming without closing the tag
      if (thought) thoughts.push(thought);
      text = text.replace(openTagRegex, '').trim() + (text ? '\n\n' : '') + answer;
      isThinkingOngoing = false;
    } else {
      isThinkingOngoing = true;
      if (thought || partialRaw) {
        thoughts.push(thought || partialRaw);
      }
      text = text.replace(openTagRegex, '').trim();
    }
  }

  // 3. Strip any stray opening or closing tags
  text = text.replace(/<\/?(?:thought|deep_thought|thinking|reasoning|think|thought_process)>/gi, '').trim();

  // 4. Check for markdown-based thinking headers (e.g. ### Thinking Process\n... \n### Response)
  const headerRegex =
    /^(?:\*\*Thinking Process:\*\*|\*\*Thought Process:\*\*|Thinking Process:|Thought Process:|### Thinking Process|### Thought Process|### مسار التفكير|مسار التفكير:)\s*([\s\S]*?)(?:\n\n(?:\*\*Answer:\*\*|\*\*Response:\*\*|### Answer|### Response|### الإجابة|\*\*الإجابة:\*\*|---\n*)|$)/i;
  const headerMatch = text.match(headerRegex);
  if (headerMatch && headerMatch[1]) {
    const rawThought = headerMatch[1].trim();
    if (rawThought) {
      const { thought, answer } = separateThoughtAndResponse(rawThought);
      if (thought) thoughts.push(thought);
      if (answer) text = `${answer}\n\n${text}`.trim();
    }
    text = text.replace(headerRegex, '').trim();
  }

  // 5. Sanitize leaked meta-reasoning, instruction debates, or prompt echos from the remaining text
  const combinedThought = thoughts.join('\n\n---\n\n').trim();
  const sanitized = sanitizeCleanResponse(text, combinedThought);

  return {
    thoughtText: sanitized.thoughtText,
    cleanContent: sanitized.cleanContent,
    isThinkingOngoing,
  };
}

export const ThoughtProcessAccordion: React.FC<ThoughtProcessAccordionProps> = ({
  thoughtText,
  isStreaming = false,
  language = 'ar',
  defaultExpanded = false,
}) => {
  // During streaming thoughts, default to open; otherwise default to closed or user preference
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || (isStreaming && Boolean(thoughtText)));
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);

  if (!thoughtText || !thoughtText.trim()) {
    return null;
  }

  const isRtl = language === 'ar';
  const ArrowIcon = isExpanded ? ChevronDown : isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="my-2.5 w-full select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="rounded-xl border border-[#DDD6C5] dark:border-[#383530] bg-[#FAF8F2] dark:bg-[#1C1B18] overflow-hidden shadow-2xs transition-colors">
        {/* Accordion Trigger Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 text-start hover:bg-[#F2ECE0]/60 dark:hover:bg-[#25231F] transition-colors cursor-pointer group"
          aria-expanded={isExpanded}
          title={isExpanded ? (isRtl ? 'طي طريقة التفكير' : 'Collapse thinking') : (isRtl ? 'توسيع طريقة التفكير' : 'Expand thinking')}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Simple toggle arrow */}
            <div className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#78746B] dark:text-[#A39E93] group-hover:text-[#B85736] group-hover:bg-[#B85736]/10 transition-colors shrink-0">
              <ArrowIcon className="w-3.5 h-3.5 transition-transform duration-200" />
            </div>

            {/* Thinking Icon */}
            <Atom className="w-4 h-4 text-[#B85736] dark:text-[#E07A5F] shrink-0" />

            {/* Title */}
            <span className="text-xs font-semibold text-[#2D2A24] dark:text-[#EDE7DA] truncate">
              {isRtl ? 'طريقة تفكير النموذج ومسار الاستدلال' : 'Model Thinking Process & Reasoning'}
            </span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium text-[#7A7569] dark:text-[#9E998E]">
            {isStreaming ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#B85736]/10 text-[#B85736] dark:text-[#E07A5F] animate-pulse text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B85736] dark:bg-[#E07A5F]" />
                <span>{isRtl ? 'يجري التفكير...' : 'Thinking...'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[10.5px]">
                <Clock className="w-3 h-3 text-[#999488]" />
                <span>{isRtl ? 'استدلال مكتمل' : 'Reasoned'}</span>
              </span>
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-[#E8E2D5] dark:border-[#2E2C27]"
            >
              <div
                dir="auto"
                className="p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed text-[#5C574D] dark:text-[#BDB8AB] bg-[#F5F1E6]/40 dark:bg-[#181714]/60 font-sans select-text whitespace-pre-wrap break-words space-y-2"
              >
                <Markdown
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p({ children }) {
                      return <p className="mb-1.5 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-inside space-y-1 my-1 ms-1">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-inside space-y-1 my-1 ms-1">{children}</ol>;
                    },
                    li({ children }) {
                      return <li className="text-[#5C574D] dark:text-[#BDB8AB]">{children}</li>;
                    },
                    code({ children }) {
                      return (
                        <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono text-[11px] text-[#B85736] dark:text-[#E07A5F]">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {thoughtText}
                </Markdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

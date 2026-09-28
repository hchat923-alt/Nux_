import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getStoredLanguage } from '../utils/i18n';

interface MathEquationCardProps {
  formula: string;
  title?: string;
}

/**
 * Normalizes math formulas: converts Unicode combining arrows on letters (e.g. u⃗, F⃗)
 * to proper LaTeX \vec{...} so KaTeX renders vector arrows and letter sizing uniformly.
 */
export function normalizeMathFormula(formula: string): string {
  if (!formula) return '';
  let result = formula;

  // 1. Replace Unicode combining right arrow (\u20D7 or \u20D6) on letters:
  // e.g. "u⃗" or "F⃗" -> "\vec{u}" and "\vec{F}"
  result = result.replace(/([a-zA-Z\u03B1-\u03C9\u0391-\u03A9])[\u20D7\u20D6]/g, '\\vec{$1}');

  // 2. Also normalize single letter followed by arrow: e.g. u-> or F->
  result = result.replace(/([a-zA-Z])\s*->/g, '\\vec{$1}');

  // 3. Fix unbraced \vec followed by single char: \vec F -> \vec{F}
  result = result.replace(/\\vec\s+([a-zA-Z])/g, '\\vec{$1}');

  return result;
}

export const MathEquationCard: React.FC<MathEquationCardProps> = ({ formula, title }) => {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const isEn = getStoredLanguage() === 'en';

  const rawFormula = formula
    .trim()
    .replace(/^```(?:math|latex|equation|formula)?/i, '')
    .replace(/```$/, '')
    .replace(/^\$\$/, '')
    .replace(/\$\$$/, '')
    .trim();

  // Normalize formula to fix vector arrows and character sizing
  const cleanFormula = normalizeMathFormula(rawFormula);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanFormula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let renderedMath = '';
  let renderError = false;

  try {
    renderedMath = katex.renderToString(cleanFormula, {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    renderError = true;
  }

  return (
    <div
      className="group relative my-4 mx-auto max-w-2xl rounded-xl border border-[#E2DDD0] dark:border-[#383630] bg-[#FDFCF7] dark:bg-[#1E1D1A] overflow-hidden shadow-xs hover:border-[#C8C2B4] dark:hover:border-[#48443C] transition-all"
      dir="ltr"
    >
      {/* Top Bar Controls (Copy Icon at Top Right) */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5" dir="ltr">
        {/* Toggle LaTeX Code Button */}
        <button
          onClick={() => setShowCode(!showCode)}
          title={showCode ? (isEn ? 'View Formula' : 'عرض المعادلة') : (isEn ? 'View LaTeX' : 'عرض كود LaTeX')}
          className="p-1.5 rounded-md transition-all text-[#7D796F] hover:text-[#262421] dark:text-[#99958C] dark:hover:text-[#EDE9DF] bg-[#F5F2E9]/90 hover:bg-[#EBE7DD] dark:bg-[#2A2824]/90 dark:hover:bg-[#35332D] border border-[#E2DDD0]/80 dark:border-[#383630]/80 backdrop-blur-xs flex items-center justify-center shadow-2xs opacity-75 group-hover:opacity-100"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        {/* Copy Button at Top Right */}
        <button
          onClick={handleCopy}
          title={copied ? (isEn ? 'Copied to clipboard!' : 'تم نسخ المعادلة!') : (isEn ? 'Copy formula' : 'نسخ المعادلة')}
          className="p-1.5 rounded-md transition-all text-[#7D796F] hover:text-[#262421] dark:text-[#99958C] dark:hover:text-[#EDE9DF] bg-[#F5F2E9]/90 hover:bg-[#EBE7DD] dark:bg-[#2A2824]/90 dark:hover:bg-[#35332D] border border-[#E2DDD0]/80 dark:border-[#383630]/80 backdrop-blur-xs flex items-center justify-center shadow-2xs opacity-85 group-hover:opacity-100"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Optional Title Bar if explicit title provided */}
      {title && (
        <div className="px-4 py-2 border-b border-[#E2DDD0] dark:border-[#383630] bg-[#F5F2E9]/60 dark:bg-[#252420]/60 pr-20 text-xs font-semibold text-[#262421] dark:text-[#EDE9DF]" dir="auto">
          {title}
        </div>
      )}

      {/* Body with math typography styling and balanced height */}
      <div className="p-6 sm:p-7 flex items-center justify-center min-h-[95px] overflow-x-auto text-center bg-[#FDFCF7] dark:bg-[#1E1D1A]" dir="ltr">
        {showCode ? (
          <pre className="font-mono text-xs text-[#B85736] dark:text-[#E0866A] dir-ltr text-left overflow-x-auto p-3 rounded-lg bg-[#F5F2E9] dark:bg-[#252420] border border-[#E2DDD0] dark:border-[#383630] w-full">
            {cleanFormula}
          </pre>
        ) : renderError ? (
          <div className="font-mono text-sm text-[#262421] dark:text-[#EDE9DF] p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            {cleanFormula}
          </div>
        ) : (
          <div
            className="katex-card-content text-[18px] sm:text-[21px] leading-relaxed text-[#262421] dark:text-[#EDE9DF] overflow-x-auto py-1 w-full flex justify-center items-center select-text"
            dangerouslySetInnerHTML={{ __html: renderedMath }}
          />
        )}
      </div>
    </div>
  );
};

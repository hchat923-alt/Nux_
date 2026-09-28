import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Paintbrush,
  Code2,
  Download,
  Copy,
  Check,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  Grid,
  Sparkles,
} from 'lucide-react';
import { highlightCode } from '../utils/prismHelper';
import { getStoredLanguage } from '../utils/i18n';

interface SvgDrawingViewerProps {
  svgCode: string;
  onOpenArtifact?: (code: string, language: string) => void;
}

/**
 * Clean and sanitize raw SVG string for safe rendering
 */
function extractAndSanitizeSvg(raw: string): { cleanSvg: string; isValid: boolean } {
  if (!raw || !raw.trim()) {
    return { cleanSvg: '', isValid: false };
  }

  // Extract <svg>...</svg> block if wrapped with markdown or other text
  const match = /<svg[\s\S]*?<\/svg>/i.exec(raw);
  const targetSvg = match ? match[0] : raw;

  if (typeof window === 'undefined') {
    return { cleanSvg: targetSvg, isValid: true };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(targetSvg, 'image/svg+xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      // Basic regex fallback if strict XML parser had minor entity error
      const cleaned = targetSvg
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
        .replace(/javascript:/gi, '');
      return { cleanSvg: cleaned, isValid: cleaned.includes('<svg') };
    }

    // Remove any potentially hazardous tags
    const badElements = doc.querySelectorAll('script, foreignObject, iframe, embed, object');
    badElements.forEach((el) => el.remove());

    // Strip inline event listeners & javascript URIs
    const all = doc.querySelectorAll('*');
    all.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value.toLowerCase().replace(/[\s\x00-\x1f]+/g, '');
        if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('vbscript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Normalize and beautify mathematical notations, vector arrows, and subscripts inside SVG <text> and <tspan>
    const textNodes = doc.querySelectorAll('text, tspan');
    const SUB_MAP: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
      'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
      'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
      'v': 'ᵥ', 'x': 'ₓ', 'N': 'ₙ', 'T': 'ₜ', 'A': 'ₐ',
      'B': 'ᵦ', 'C': '𝒸', 'D': '𝒹', 'E': 'ₑ', 'F': '𝒻'
    };

    textNodes.forEach((node) => {
      let text = node.textContent || '';
      if (!text || !text.trim()) return;

      // 1. Convert LaTeX vectors: $\vec{R}$, \vec{R}, $vec{R}\$, vec{R} -> R⃗
      text = text.replace(/(?:\$|\\)?\\?vec\{([a-zA-Z\u03B1-\u03C9\u0391-\u03A9])\}(?:\$|\\)?/g, '$1⃗');
      text = text.replace(/\\vec\s+([a-zA-Z\u03B1-\u03C9\u0391-\u03A9])/g, '$1⃗');

      // 2. Convert common LaTeX Greek letters
      text = text
        .replace(/\\alpha\b/g, 'α')
        .replace(/\\beta\b/g, 'β')
        .replace(/\\gamma\b/g, 'γ')
        .replace(/\\theta\b/g, 'θ')
        .replace(/\\phi\b|\\varphi\b/g, 'φ')
        .replace(/\\omega\b/g, 'ω')
        .replace(/\\lambda\b/g, 'λ')
        .replace(/\\mu\b/g, 'μ')
        .replace(/\\pi\b/g, 'π')
        .replace(/\\Delta\b/g, 'Δ')
        .replace(/\\Sigma\b/g, 'Σ')
        .replace(/\\times\b/g, '×')
        .replace(/\\pm\b/g, '±')
        .replace(/\\le\b|\\leq\b/g, '≤')
        .replace(/\\ge\b|\\geq\b/g, '≥')
        .replace(/\\neq\b/g, '≠')
        .replace(/\\approx\b/g, '≈')
        .replace(/\\degree\b|\^\\circ\b/g, '°');

      // 3. Convert simple subscripts: R_N -> Rₙ, R_T -> Rₜ, f_k -> fₖ, v_0 -> v₀
      text = text.replace(/([a-zA-Z\u03B1-\u03C9\u0391-\u03A9])_([0-9a-zA-Z+-]+|\{[0-9a-zA-Z+-]+\})/g, (_m, base, sub) => {
        const cleanSub = sub.replace(/[{}]/g, '');
        const convertedSub = cleanSub.split('').map((ch: string) => SUB_MAP[ch] || ch).join('');
        return `${base}${convertedSub}`;
      });

      // 4. Remove residual lone dollar signs around formulas in SVG
      text = text.replace(/(?:^|\s)\$([^$]+)\$(?:\s|$)/g, ' $1 ');

      // 5. Clean up stray leading/trailing backslashes
      text = text.replace(/\\([a-zA-Z]+)/g, '$1');

      if (node.textContent !== text) {
        node.textContent = text;
      }

      // 6. Ensure proper bidirectional handling for mixed Arabic + Latin in SVG text
      if (/[\u0600-\u06FF]/.test(text)) {
        if (!node.hasAttribute('direction')) {
          node.setAttribute('direction', 'rtl');
        }
        if (!node.hasAttribute('unicode-bidi')) {
          node.setAttribute('unicode-bidi', 'plaintext');
        }
      }
    });

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return { cleanSvg: targetSvg, isValid: false };
    }

    // Ensure responsive SVG rendering
    if (!svgElement.hasAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    return {
      cleanSvg: new XMLSerializer().serializeToString(svgElement),
      isValid: true,
    };
  } catch (err) {
    console.warn('SVG sanitization error:', err);
    return { cleanSvg: targetSvg, isValid: true };
  }
}

export const SvgDrawingViewer: React.FC<SvgDrawingViewerProps> = ({
  svgCode,
  onOpenArtifact,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [bgStyle, setBgStyle] = useState<'checker' | 'light' | 'dark'>('checker');
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isArabic = getStoredLanguage() === 'ar';

  const { cleanSvg, isValid } = useMemo(() => {
    return extractAndSanitizeSvg(svgCode);
  }, [svgCode]);

  const highlightedCode = useMemo(() => {
    return highlightCode(svgCode, 'svg');
  }, [svgCode]);

  // Extract title if available in svg
  const svgTitle = useMemo(() => {
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(svgCode);
    if (titleMatch && titleMatch[1]) return titleMatch[1].trim();
    return isArabic ? 'رسمة وتصميم بصري (SVG)' : 'Visual Drawing (SVG)';
  }, [svgCode, isArabic]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([cleanSvg || svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawing_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    if (!cleanSvg) return;
    setIsDownloadingPng(true);

    try {
      const img = new Image();
      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // High resolution
        const width = img.naturalWidth || 800;
        const height = img.naturalHeight || 800;

        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.scale(scale, scale);
          // Draw white or transparent background
          if (bgStyle === 'dark') {
            ctx.fillStyle = '#1A1916';
            ctx.fillRect(0, 0, width, height);
          } else if (bgStyle === 'light') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);

          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `drawing_${Date.now()}.png`;
          link.click();
        }

        URL.revokeObjectURL(url);
        setIsDownloadingPng(false);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setIsDownloadingPng(false);
        // Fallback to SVG download
        handleDownloadSvg();
      };

      img.src = url;
    } catch {
      setIsDownloadingPng(false);
      handleDownloadSvg();
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 3));
  const zoomOut = () => setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
  const resetZoom = () => setZoom(1);

  return (
    <div className="my-4 rounded-xl border border-[#E0DBCF] dark:border-[#383630] bg-[#FAF8F5] dark:bg-[#1E1D1A] overflow-hidden shadow-sm transition-all text-[#22211E] dark:text-[#EDEAE4]">
      {/* Top Header Controls Bar */}
      <div className="px-4 py-2.5 bg-[#F2EFE8] dark:bg-[#262420] border-b border-[#E0DBCF] dark:border-[#383630] flex items-center justify-between gap-2 flex-wrap">
        {/* Left / Title Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#B85736]/10 text-[#B85736] flex items-center justify-center shrink-0">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1C1A17] dark:text-[#F3F0EA] truncate block">
              {svgTitle}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E5DFD2] dark:bg-[#33302A] text-[#B85736] font-mono font-semibold uppercase shrink-0">
            SVG Art
          </span>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Tab Switcher (Preview vs Code) */}
          <div className="flex items-center bg-[#E5DFD2] dark:bg-[#1A1916] p-0.5 rounded-lg border border-[#D5CFBF] dark:border-[#302E29]">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-[#2E2C27] text-[#1C1A17] dark:text-white shadow-2xs font-semibold'
                  : 'text-[#6B665C] dark:text-[#9E9A90] hover:text-[#1C1A17] dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#B85736]" />
              <span>{isArabic ? 'الرسمة البصرية' : 'Drawing'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-[#2E2C27] text-[#1C1A17] dark:text-white shadow-2xs font-semibold'
                  : 'text-[#6B665C] dark:text-[#9E9A90] hover:text-[#1C1A17] dark:hover:text-white'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>{isArabic ? 'الكود' : 'Code'}</span>
            </button>
          </div>

          {/* Background Toggle (Only in preview tab) */}
          {activeTab === 'preview' && (
            <div className="flex items-center bg-[#E5DFD2] dark:bg-[#1A1916] p-0.5 rounded-lg border border-[#D5CFBF] dark:border-[#302E29]">
              <button
                type="button"
                onClick={() => setBgStyle('checker')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  bgStyle === 'checker' ? 'bg-white dark:bg-[#2E2C27] text-[#B85736]' : 'text-[#7A756B]'
                }`}
                title={isArabic ? 'خلفية مربعات شفافة' : 'Checkerboard background'}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('light')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  bgStyle === 'light' ? 'bg-white dark:bg-[#2E2C27] text-[#B85736]' : 'text-[#7A756B]'
                }`}
                title={isArabic ? 'خلفية بيضاء فاتحة' : 'Light background'}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('dark')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  bgStyle === 'dark' ? 'bg-white dark:bg-[#2E2C27] text-[#B85736]' : 'text-[#7A756B]'
                }`}
                title={isArabic ? 'خلفية داكنة' : 'Dark background'}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          {activeTab === 'preview' && (
            <div className="hidden sm:flex items-center gap-0.5 bg-[#E5DFD2] dark:bg-[#1A1916] p-0.5 rounded-lg border border-[#D5CFBF] dark:border-[#302E29]">
              <button
                type="button"
                onClick={zoomIn}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#6B665C] dark:text-[#9E9A90] cursor-pointer"
                title={isArabic ? 'تكبير' : 'Zoom In'}
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="px-1 text-[10px] font-mono text-[#6B665C] dark:text-[#9E9A90] hover:text-[#1C1A17] cursor-pointer"
                title={isArabic ? 'إعادة ضبط الحجم' : 'Reset Zoom'}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomOut}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#6B665C] dark:text-[#9E9A90] cursor-pointer"
                title={isArabic ? 'تصغير' : 'Zoom Out'}
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Action: Download PNG / SVG */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isDownloadingPng}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#E5DFD2] dark:bg-[#2E2C27] hover:bg-[#D5CFBF] dark:hover:bg-[#383630] text-[11px] font-medium transition-colors cursor-pointer text-[#33302B] dark:text-[#DDD8CE]"
            title={isArabic ? 'تنزيل كصورة PNG' : 'Download as PNG'}
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#E5DFD2] dark:bg-[#2E2C27] hover:bg-[#D5CFBF] dark:hover:bg-[#383630] text-[11px] font-medium transition-colors cursor-pointer text-[#33302B] dark:text-[#DDD8CE]"
            title={isArabic ? 'تنزيل ملف SVG الأصلي' : 'Download SVG'}
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">SVG</span>
          </button>

          {/* Full Screen Artifact Modal */}
          {onOpenArtifact && (
            <button
              type="button"
              onClick={() => onOpenArtifact(svgCode, 'svg')}
              className="p-1.5 rounded-md hover:bg-[#E5DFD2] dark:hover:bg-white/10 text-[#6B665C] dark:text-[#9E9A90] hover:text-[#1C1A17] dark:hover:text-white transition-colors cursor-pointer"
              title={isArabic ? 'فتح في شاشة كاملة' : 'Open in fullscreen'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-[#E5DFD2] dark:hover:bg-white/10 text-[#6B665C] dark:text-[#9E9A90] hover:text-[#1C1A17] dark:hover:text-white transition-colors cursor-pointer"
            title={isArabic ? 'نسخ كود SVG' : 'Copy SVG'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Drawing Canvas / Preview Body */}
      {activeTab === 'preview' ? (
        <div
          ref={containerRef}
          className={`relative w-full min-h-[320px] max-h-[560px] p-6 flex items-center justify-center overflow-auto transition-colors select-none ${
            bgStyle === 'dark'
              ? 'bg-[#151412]'
              : bgStyle === 'light'
              ? 'bg-white'
              : 'bg-[radial-gradient(#d3cec4_1px,transparent_1px)] dark:bg-[radial-gradient(#2d2b27_1px,transparent_1px)] [background-size:16px_16px] bg-[#FAF8F5] dark:bg-[#1A1916]'
          }`}
        >
          {isValid ? (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="flex items-center justify-center max-w-full max-h-full svg-drawing-wrapper [&>svg]:max-w-full [&>svg]:max-h-[480px] [&>svg]:w-auto [&>svg]:h-auto [&>svg]:block [&>svg]:mx-auto [&>svg]:drop-shadow-sm"
              dangerouslySetInnerHTML={{ __html: cleanSvg }}
            />
          ) : (
            <div className="text-center p-6 text-xs text-[#7A756B] dark:text-[#9E9A90]">
              <p className="mb-2 font-semibold text-red-500">
                {isArabic ? 'تعذر تصيير الرسمة التلقائية' : 'Could not render visual preview'}
              </p>
              <button
                onClick={() => setActiveTab('code')}
                className="underline text-[#B85736] cursor-pointer"
              >
                {isArabic ? 'عرض كود الرسمة' : 'View Code'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Code View */
        <div className="p-3 bg-[#12110F] text-[#EDE8DF] text-xs font-mono max-h-[450px] overflow-auto scrollbar-thin" dir="ltr">
          <pre className="!bg-transparent !p-0 !m-0">
            <code
              className="language-svg font-mono"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      )}
    </div>
  );
};

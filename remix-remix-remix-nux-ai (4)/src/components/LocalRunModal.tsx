import React, { useState } from 'react';
import {
  X,
  Laptop,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LocalRunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalRunModal: React.FC<LocalRunModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const oneClickCmd = 'npm install && set OLLAMA_ORIGINS=* && start /b "" ollama serve && start http://localhost:3000 && npm run dev';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] dark:bg-[#1C1B18] border border-[#E6E1D4] dark:border-[#2C2A25] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E6E1D4] dark:border-[#2C2A25] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2B2925] dark:bg-[#FAF8F5] text-white dark:text-[#22211E] flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[#22211E] dark:text-[#EDEAE4]">
                تشغيل التطبيق بنقرة واحدة على حاسوبك
              </h3>
              <p className="text-xs text-[#7D796F] dark:text-[#A8A49A]">
                تشغيل تلقائي كامل مع Ollama بدون أي تعقيد
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#7D796F] dark:text-[#A8A49A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right" dir="rtl">
          {/* Method 1: Double Click File */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>الطريقة الأسهل: ملف التشغيل التلقائي (Double Click)</span>
            </div>
            <p className="text-xs text-[#555147] dark:text-[#C5C1B6] leading-relaxed">
              قمنا بإنشاء ملف باسم <code className="font-bold text-emerald-700 dark:text-emerald-300">run-app.bat</code> داخل مجلد المشروع.
              بمجرد الضغط عليه مرتين بعد تنزيل المشروع، سيقوم بتشغيل Ollama، وتثبيت المكتبات، وفتح المتصفح تلقائياً!
            </p>
          </div>

          {/* Method 2: Single Command Copy */}
          <div className="p-4 rounded-xl bg-[#F4F1E8] dark:bg-[#23211D] border border-[#E6E1D4] dark:border-[#2C2A25] space-y-2.5">
            <h4 className="font-semibold text-xs sm:text-sm text-[#22211E] dark:text-[#EDEAE4]">
              أو: انسخ هذا الأمر الواحد في موجه الأوامر (CMD)
            </h4>
            <p className="text-xs text-[#7D796F] dark:text-[#A8A49A]">
              افتح CMD داخل مجلد المشروع والصق هذا السطر فقط:
            </p>
            <div className="relative">
              <pre
                dir="ltr"
                className="bg-[#181715] text-[#EDEAE4] p-3 rounded-lg text-xs font-mono overflow-x-auto border border-[#2C2A25] flex items-center justify-between"
              >
                <code>{oneClickCmd}</code>
                <button
                  onClick={() => copyCode(oneClickCmd, 1)}
                  className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 ml-2"
                  title="نسخ الأمر بالكامل"
                >
                  {copiedIndex === 1 ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </pre>
            </div>
          </div>

          {/* Steps summary */}
          <div className="text-xs space-y-2 text-[#7D796F] dark:text-[#A8A49A] border-t border-[#E6E1D4] dark:border-[#2C2A25] pt-3">
            <p className="font-medium text-[#22211E] dark:text-[#EDEAE4]">
              خطوات التنزيل الأولى:
            </p>
            <ol className="list-decimal list-inside space-y-1 pr-1">
              <li>اضغط على <strong>Settings / Export</strong> في أعلى صفحة AI Studio واختر <strong>Download ZIP</strong>.</li>
              <li>فك الضغط عن الملف في حاسوبك (Extract All).</li>
              <li>اضغط مرتين على <code>run-app.bat</code> وسيفتح التطبيق فوراً.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E6E1D4] dark:border-[#2C2A25] flex items-center justify-end gap-2 bg-[#F4F1E8]/50 dark:bg-[#23211D]/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#2B2925] dark:bg-[#FAF8F5] text-white dark:text-[#22211E] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

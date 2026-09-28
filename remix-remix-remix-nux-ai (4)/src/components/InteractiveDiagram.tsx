import React, { useState } from 'react';
import { Network, ArrowDown, CheckCircle2 } from 'lucide-react';
import { getStoredLanguage } from '../utils/i18n';

interface DiagramNode {
  id?: string;
  title?: string;
  label?: string;
  name?: string;
  text?: string;
  subtitle?: string;
  subTitle?: string;
  desc?: string;
  caption?: string;
  description?: string;
  summary?: string;
  details?: string[];
  badge?: string;
}

interface DiagramConfig {
  title?: string;
  description?: string;
  nodes: DiagramNode[];
}

export const InteractiveDiagram: React.FC<{ rawJson: string }> = ({ rawJson }) => {
  let config: DiagramConfig | null = null;
  try {
    config = JSON.parse(rawJson);
  } catch (e) {
    return (
      <div className="p-3 my-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-sans">
        Invalid Diagram JSON data
      </div>
    );
  }

  if (!config || !config.nodes || !Array.isArray(config.nodes)) {
    return null;
  }

  const appLang = getStoredLanguage();
  const isEn = appLang === 'en';

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (config?.nodes && config.nodes.length > 0) {
      config.nodes.forEach((n, idx) => {
        const idKey = n.id || `node-${idx}`;
        if (idx === 0) initial[idKey] = true;
      });
    }
    return initial;
  });

  const toggleNode = (idKey: string) => {
    setExpandedIds(prev => ({ ...prev, [idKey]: !prev[idKey] }));
  };

  return (
    <div className="my-3 rounded-lg border border-[#E2DDD0] dark:border-[#383630] bg-[#FDFCF7] dark:bg-[#1E1D1A] overflow-hidden shadow-sm p-4 sm:p-5 max-w-lg mx-auto w-full font-sans" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2DDD0] dark:border-[#383630]">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="p-1 rounded-md bg-[#F5F2E9] dark:bg-[#252420] text-[#B85736] dark:text-[#E0866A] shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#1A1815] dark:text-[#F3F0EA] leading-snug whitespace-normal break-words" dir="auto">
              {config.title || (isEn ? 'Modern Web Architecture' : 'بنية نظام تطوير الويب الحديث')}
            </h3>
            <p className="text-xs text-[#55524B] dark:text-[#D5D1C8] leading-tight mt-0.5" dir="auto">
              {isEn ? 'Click any step to expand details inline' : 'انقر على أي خطوة لعرض تفاصيلها بداخلها مباشرة'}
            </p>
          </div>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded bg-[#EFEBE0] dark:bg-[#2A2824] text-[#55524B] dark:text-[#D5D1C8] font-mono shrink-0">
          Pipeline
        </span>
      </div>

      {/* Vertical Flowchart Stack with Inline Details */}
      <div className="flex flex-col items-center max-w-full mx-auto space-y-2.5">
        {config.nodes.map((node, index) => {
          const nodeId = node.id || `node-${index}`;
          const isExpanded = !!expandedIds[nodeId];
          const nodeTitle = node.title || node.label || node.name || node.text || (isEn ? `Step ${index + 1}` : `الخطوة ${index + 1}`);
          const nodeSubtitle = node.subtitle || node.subTitle || node.desc || node.caption;
          const nodeDescription = node.description || node.summary || (node.text && node.text !== nodeTitle ? node.text : undefined);

          return (
            <React.Fragment key={nodeId}>
              {/* Flow Box */}
              <div
                onClick={() => toggleNode(nodeId)}
                className={`w-full cursor-pointer rounded-lg border transition-all shadow-2xs group overflow-hidden ${
                  isExpanded
                    ? 'bg-[#F5F2E9] dark:bg-[#2A2824] border-[#B85736] dark:border-[#E0866A] ring-1 ring-[#B85736]/20'
                    : 'bg-[#FCFCFA] dark:bg-[#23211D] border-[#E2DDD0] dark:border-[#383630] hover:border-[#C8C2B4] dark:hover:border-[#48443C]'
                }`}
              >
                {/* Main Card Header */}
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 mt-0.5 ${
                      isExpanded ? 'bg-[#B85736] text-white' : 'bg-[#EFEBE0] dark:bg-[#302E29] text-[#55524B] dark:text-[#D5D1C8]'
                    }`}>
                      {index + 1}
                    </span>

                    <div className={`min-w-0 flex-1 ${isEn ? 'text-left' : 'text-right'}`}>
                      <h4 className="text-[13.5px] font-bold text-[#1A1815] dark:text-[#F3F0EA] leading-snug whitespace-normal break-words" dir="auto">
                        {nodeTitle}
                      </h4>
                      {nodeSubtitle && (
                        <p className="text-xs text-[#55524B] dark:text-[#D5D1C8] mt-0.5 whitespace-normal break-words" dir="auto">
                          {nodeSubtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {node.badge && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#EFEBE0] dark:bg-[#302E29] text-[#55524B] dark:text-[#D5D1C8] font-mono shrink-0">
                      {node.badge}
                    </span>
                  )}
                </div>

                {/* Inline Expanded Details */}
                {(isExpanded || nodeDescription || (node.details && node.details.length > 0)) && (
                  <div className={`px-4 pb-3.5 pt-2 border-t border-[#E2DDD0] dark:border-[#383630] bg-[#FCFCFA]/90 dark:bg-[#1E1D1A]/90 ${!isExpanded ? 'hidden' : ''}`} dir="auto">
                    {nodeDescription && (
                      <p className="text-[13px] text-[#2C2A26] dark:text-[#E8E4DA] mb-2.5 leading-relaxed whitespace-normal break-words">
                        {nodeDescription}
                      </p>
                    )}
                    {node.details && node.details.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#E2DDD0]/60 dark:border-[#383630]/60">
                        {node.details.map((detail, dIdx) => (
                          <div key={dIdx} className="flex items-start gap-2 text-[13px] text-[#3D3A35] dark:text-[#D8D4CA]">
                            <CheckCircle2 className="w-4 h-4 text-[#B85736] dark:text-[#E0866A] shrink-0 mt-0.5" />
                            <span className="leading-relaxed whitespace-normal break-words">{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Downward Arrow */}
              {index < config.nodes.length - 1 && (
                <div className="py-1 text-[#C8C2B4] dark:text-[#7A766D]">
                  <ArrowDown className="w-4 h-4 stroke-[2]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

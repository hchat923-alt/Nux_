import React, { useState, useMemo } from 'react';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Table } from 'lucide-react';
import { getStoredLanguage } from '../utils/i18n';

// Vibrant modern color palette for charts matching NUX AI design
const CHART_PALETTE = [
  { stroke: '#3B82F6', fill: '#3B82F6', gradStart: '#3B82F6', gradEnd: 'rgba(59, 130, 246, 0.02)' },
  { stroke: '#10B981', fill: '#10B981', gradStart: '#10B981', gradEnd: 'rgba(16, 185, 129, 0.02)' },
  { stroke: '#8B5CF6', fill: '#8B5CF6', gradStart: '#8B5CF6', gradEnd: 'rgba(139, 92, 246, 0.02)' },
  { stroke: '#F59E0B', fill: '#F59E0B', gradStart: '#F59E0B', gradEnd: 'rgba(245, 158, 11, 0.02)' },
  { stroke: '#EC4899', fill: '#EC4899', gradStart: '#EC4899', gradEnd: 'rgba(236, 72, 153, 0.02)' },
];

interface ChartDataPoint {
  [key: string]: any;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'scatter';
  title?: string;
  data: ChartDataPoint[];
  xKey?: string;
  yKey?: string;
  dataKeys?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

function cleanAndParseJson(raw: string): ChartConfig | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();

  // Extract JSON object from backticks or raw markdown text if present
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Normalize smart quotes and backticks
  cleaned = cleaned
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Remove single line and multi-line comments
  cleaned = cleaned
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      const repaired = cleaned
        .replace(/(:\s*"[\s\S]*?")/g, (match) => match.replace(/\r?\n/g, '\\n'))
        .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

export const InteractiveChart: React.FC<{ rawJson: string }> = React.memo(({ rawJson }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const config = useMemo(() => cleanAndParseJson(rawJson), [rawJson]);

  if (!config || !config.data || !Array.isArray(config.data) || config.data.length === 0) {
    return (
      <div className="p-3 my-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400 font-sans">
        <span className="font-semibold block mb-1">تعذر عرض المبيان التفاعلي تلقائياً</span>
        لم يُرجع النموذج صيغة JSON مكتملة للمبيان. حاول استخدام نموذج استدلال مع أداة المبيانات.
      </div>
    );
  }

  const appLang = getStoredLanguage();
  const isEn = appLang === 'en';

  const chartType = config.type || 'bar';
  const data = config.data;
  const title = config.title;

  // Auto-detect keys if not specified
  const sample = data[0] || {};
  const allKeys = Object.keys(sample);
  const xKey = config.xKey || allKeys[0] || 'name';
  const dataKeys = config.dataKeys || allKeys.filter((k) => k !== xKey && typeof sample[k] === 'number');
  const activeDataKeys = dataKeys.length > 0 ? dataKeys : allKeys.filter((k) => k !== xKey).slice(0, 3);

  const getDisplayNameForKey = (key: string) => {
    const lower = key.toLowerCase().trim();
    if (['value', 'val', 'v', 'y', 'amount', 'count', 'data'].includes(lower)) {
      if (config.yAxisLabel && config.yAxisLabel.trim()) {
        return config.yAxisLabel.trim();
      }
      return isEn ? 'Indicator Value' : 'المؤشر / القيمة';
    }
    return key;
  };

  // Dimensions & bounds for high-performance pure SVG rendering
  const svgWidth = 620;
  const svgHeight = 280;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Find min/max values
  let minVal = 0;
  let maxVal = 1;
  activeDataKeys.forEach((key) => {
    data.forEach((row) => {
      const val = Number(row[key]);
      if (!isNaN(val)) {
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    });
  });
  if (minVal === maxVal) maxVal = minVal + 10;
  const ySpan = maxVal - minVal;
  const yMin = minVal < 0 ? minVal : 0;
  const yMax = maxVal + ySpan * 0.12;

  const getYCoord = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v));
    return padTop + plotHeight - ((clamped - yMin) / (yMax - yMin)) * plotHeight;
  };

  const yZero = getYCoord(0);
  const numItems = data.length;
  const slotW = plotWidth / Math.max(1, numItems);

  // Y-axis 4 grid ticks
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = yMin + (yMax - yMin) * ratio;
    const y = getYCoord(val);
    const displayVal = Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(val % 1 === 0 ? 0 : 1);
    return { val, y, displayVal };
  });

  return (
    <div className="my-4 rounded-xl border border-[#E2DDD0] dark:border-[#383630] bg-[#FDFCF7] dark:bg-[#1E1D1A] overflow-hidden shadow-2xs select-none" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Header & Controls */}
      <div className="px-4 py-2.5 bg-[#F5F2E9] dark:bg-[#252420] border-b border-[#E2DDD0] dark:border-[#383630] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {chartType === 'line' ? (
            <LineIcon className="w-4 h-4 text-[#B85736] dark:text-[#E0866A]" />
          ) : chartType === 'scatter' ? (
            <PieIcon className="w-4 h-4 text-[#B85736] dark:text-[#E0866A]" />
          ) : (
            <BarChart3 className="w-4 h-4 text-[#B85736] dark:text-[#E0866A]" />
          )}
          <span className="text-xs font-semibold text-[#262421] dark:text-[#EDE9DF]">
            {title || (chartType === 'line' ? (isEn ? 'Line Chart' : 'مخطط خطي') : chartType === 'scatter' ? (isEn ? 'Scatter Chart' : 'مخطط مبعثر') : (isEn ? 'Bar Chart' : 'مخطط أعمدة'))}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#EBE7DD] dark:bg-[#302E29] p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-[#FCFCFA] dark:bg-[#1E1D1A] text-[#262421] dark:text-[#EDE9DF] shadow-xs'
                : 'text-[#66635B] dark:text-[#99958C] hover:text-[#262421]'
            }`}
          >
            {isEn ? 'Chart' : 'الرسم البياني'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#FCFCFA] dark:bg-[#1E1D1A] text-[#262421] dark:text-[#EDE9DF] shadow-xs'
                : 'text-[#66635B] dark:text-[#99958C] hover:text-[#262421]'
            }`}
          >
            <Table className="w-3 h-3" />
            {isEn ? 'Table' : 'جدول'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4">
        {viewMode === 'chart' ? (
          <div className="w-full relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[300px] overflow-visible"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                {activeDataKeys.map((key, i) => {
                  const theme = CHART_PALETTE[i % CHART_PALETTE.length];
                  return (
                    <linearGradient key={`grad-${key}`} id={`chart-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.gradStart} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={theme.gradStart} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>

              {/* Grid Lines & Y-ticks */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={tick.y}
                    x2={svgWidth - padRight}
                    y2={tick.y}
                    stroke="currentColor"
                    className="text-[#999487]/20 dark:text-[#555047]/30"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 8}
                    y={tick.y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-[#7A756B] dark:fill-[#9E9A90] font-sans"
                  >
                    {tick.displayVal}
                  </text>
                </g>
              ))}

              {/* Baseline */}
              <line
                x1={padLeft}
                y1={yZero}
                x2={svgWidth - padRight}
                y2={yZero}
                stroke="currentColor"
                className="text-[#999487]/40 dark:text-[#666055]/50"
                strokeWidth="1.2"
              />

              {/* Render Area / Line */}
              {chartType === 'line' && (
                <>
                  {activeDataKeys.map((key, kIdx) => {
                    const theme = CHART_PALETTE[kIdx % CHART_PALETTE.length];
                    const pts = data.map((d, dIdx) => {
                      const cx = padLeft + (dIdx + 0.5) * slotW;
                      const cy = getYCoord(Number(d[key]) || 0);
                      return { cx, cy, val: d[key] };
                    });

                    // Build smooth path
                    const pathD = pts.reduce((acc, pt, idx) => {
                      return idx === 0 ? `M ${pt.cx},${pt.cy}` : `${acc} L ${pt.cx},${pt.cy}`;
                    }, '');

                    const areaD = `${pathD} L ${pts[pts.length - 1].cx},${yZero} L ${pts[0].cx},${yZero} Z`;

                    return (
                      <g key={key}>
                        <path d={areaD} fill={`url(#chart-grad-${kIdx})`} />
                        <path
                          d={pathD}
                          fill="none"
                          stroke={theme.stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {pts.map((pt, pIdx) => (
                          <circle
                            key={pIdx}
                            cx={pt.cx}
                            cy={pt.cy}
                            r={hoveredIdx === pIdx ? 5.5 : 3.5}
                            fill={hoveredIdx === pIdx ? '#FFFFFF' : theme.fill}
                            stroke={theme.stroke}
                            strokeWidth="2"
                            className="transition-all"
                          />
                        ))}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Render Scatter */}
              {chartType === 'scatter' && (
                <>
                  {activeDataKeys.map((key, kIdx) => {
                    const theme = CHART_PALETTE[kIdx % CHART_PALETTE.length];
                    return (
                      <g key={key}>
                        {data.map((d, dIdx) => {
                          const cx = padLeft + (dIdx + 0.5) * slotW;
                          const cy = getYCoord(Number(d[key]) || 0);
                          const isHov = hoveredIdx === dIdx;
                          return (
                            <circle
                              key={dIdx}
                              cx={cx}
                              cy={cy}
                              r={isHov ? 6 : 4}
                              fill={theme.fill}
                              stroke="#FFFFFF"
                              strokeWidth={isHov ? 2 : 1}
                              className="transition-all opacity-85 hover:opacity-100"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Render Bars */}
              {chartType === 'bar' && (
                <>
                  {data.map((d, dIdx) => {
                    const slotCenter = padLeft + (dIdx + 0.5) * slotW;
                    const numBars = activeDataKeys.length;
                    const barW = Math.min(26, Math.max(6, (slotW * 0.72) / numBars));
                    const startX = slotCenter - (numBars * barW) / 2;

                    return (
                      <g key={dIdx}>
                        {activeDataKeys.map((key, kIdx) => {
                          const theme = CHART_PALETTE[kIdx % CHART_PALETTE.length];
                          const val = Number(d[key]) || 0;
                          const barY = getYCoord(val);
                          const yTop = Math.min(barY, yZero);
                          const h = Math.max(3, Math.abs(yZero - barY));
                          const bx = startX + kIdx * barW;
                          const isHov = hoveredIdx === dIdx;

                          return (
                            <rect
                              key={key}
                              x={bx}
                              y={yTop}
                              width={Math.max(2, barW - 2)}
                              height={h}
                              rx="3"
                              ry="3"
                              fill={theme.fill}
                              opacity={hoveredIdx !== null && !isHov ? 0.45 : 0.9}
                              className="transition-opacity cursor-pointer"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis labels and hover hit-areas */}
              {data.map((d, dIdx) => {
                const cx = padLeft + (dIdx + 0.5) * slotW;
                const label = String(d[xKey] ?? '');
                const displayLabel = label.length > 10 ? `${label.slice(0, 9)}…` : label;

                return (
                  <g
                    key={dIdx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(dIdx)}
                  >
                    {/* Transparent Hit Area for hovering */}
                    <rect
                      x={padLeft + dIdx * slotW}
                      y={padTop}
                      width={slotW}
                      height={plotHeight}
                      fill="transparent"
                    />

                    {/* Column highlight guide on hover */}
                    {hoveredIdx === dIdx && (
                      <rect
                        x={padLeft + dIdx * slotW}
                        y={padTop}
                        width={slotW}
                        height={plotHeight}
                        fill="currentColor"
                        className="text-black/5 dark:text-white/5 pointer-events-none"
                      />
                    )}

                    {/* Label below axis */}
                    <text
                      x={cx}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-sans ${
                        hoveredIdx === dIdx
                          ? 'fill-[#262421] dark:fill-[#EDE9DF] font-semibold'
                          : 'fill-[#7A756B] dark:fill-[#9E9A90]'
                      }`}
                    >
                      {displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Popup Overlay */}
            {hoveredIdx !== null && data[hoveredIdx] && (
              <div
                className="absolute z-20 pointer-events-none p-2 rounded-lg bg-[#1E1D1A]/95 text-[#EDE9DF] text-xs shadow-lg border border-[#383630] backdrop-blur-xs transition-all max-w-[200px]"
                style={{
                  top: '10px',
                  left: `${Math.min(
                    svgWidth - 170,
                    Math.max(10, padLeft + (hoveredIdx + 0.5) * slotW - 60)
                  )}px`,
                }}
              >
                <div className="font-semibold text-[11.5px] border-b border-white/10 pb-1 mb-1 truncate">
                  {String(data[hoveredIdx][xKey] ?? '')}
                </div>
                <div className="space-y-1">
                  {activeDataKeys.map((key, kIdx) => {
                    const theme = CHART_PALETTE[kIdx % CHART_PALETTE.length];
                    const val = data[hoveredIdx][key];
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: theme.fill }}
                          />
                          <span className="truncate">{getDisplayNameForKey(key)}</span>
                        </span>
                        <span className="font-mono font-medium">{String(val ?? '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 flex-wrap pt-2 border-t border-[#E2DDD0]/40 dark:border-[#383630]/40 text-xs">
              {activeDataKeys.map((key, i) => {
                const theme = CHART_PALETTE[i % CHART_PALETTE.length];
                return (
                  <div key={key} className="flex items-center gap-1.5 text-[#59554D] dark:text-[#B5B1A6]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: theme.fill }}
                    />
                    <span className="text-[11px] font-medium">{getDisplayNameForKey(key)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto max-h-72">
            <table className={`w-full ${isEn ? 'text-left' : 'text-right'} border-collapse text-[13px]`}>
              <thead>
                <tr className="bg-[#F5F2E9] dark:bg-[#252420] border-b border-[#E2DDD0] dark:border-[#383630]">
                  {[xKey, ...activeDataKeys].map((k) => (
                    <th key={k} className="px-4 py-2.5 font-semibold text-[#262421] dark:text-[#EDE9DF]">
                      {k === 'name' ? (isEn ? 'Item / Year' : 'العنصر / السنة') : getDisplayNameForKey(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DB] dark:divide-[#2B2924]">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F2E9]/50 dark:hover:bg-[#252420]/50">
                    {[xKey, ...activeDataKeys].map((k) => (
                      <td key={k} className="px-4 py-2.5 text-[#383631] dark:text-[#D8D4CA]">
                        {String(row[k] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
});

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getStoredLanguage } from '../utils/i18n';

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  description?: string;
}

export interface TreeConfig {
  title?: string;
  root: TreeNode;
}

interface InteractiveTreeProps {
  rawJson: string;
}

// Clean 8px radius styling in gray & white
const getNodeStyle = (depth: number) => {
  if (depth === 0) {
    // Root Node (Top)
    return 'bg-[#18181B] text-white dark:bg-[#F4F4F5] dark:text-[#18181B] font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-[8px] border border-[#27272A] dark:border-white/30 shadow-xs';
  }
  if (depth === 1) {
    // Level 1 Branches
    return 'bg-[#F4F4F5] text-[#18181B] dark:bg-[#27272A] dark:text-[#F4F4F5] font-medium text-xs px-3 py-1.5 rounded-[8px] border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-[#D4D4D8] dark:hover:border-[#52525B] shadow-2xs transition-colors';
  }
  // Level 2+ Leaves
  return 'bg-white text-[#27272A] dark:bg-[#18181B] dark:text-[#D4D4D8] font-normal text-[11px] sm:text-xs px-2.5 py-1.5 rounded-[8px] border border-[#E4E4E7] dark:border-[#27272A] hover:border-[#D4D4D8] dark:hover:border-[#3F3F46] shadow-xs transition-colors';
};

const TopDownNode: React.FC<{
  node: TreeNode;
  depth: number;
  isEn: boolean;
  collapsedState: Record<string, boolean>;
  onToggle: (path: string) => void;
  currentPath: string;
}> = ({ node, depth, isEn, collapsedState, onToggle, currentPath }) => {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isCollapsed = !!collapsedState[currentPath];
  const nodeStyle = getNodeStyle(depth);

  return (
    <div className="flex flex-col items-center shrink-0 font-sans">
      {/* Node Box */}
      <div className="relative flex flex-col items-center group">
        <div
          onClick={() => hasChildren && onToggle(currentPath)}
          className={`flex items-center justify-center gap-1.5 select-none text-center max-w-[200px] ${nodeStyle} ${
            hasChildren ? 'cursor-pointer hover:opacity-95' : ''
          }`}
          dir="auto"
        >
          <span className="leading-snug break-words">{node.label || 'Node'}</span>

          {/* Expand/Collapse subtle toggle */}
          {hasChildren && (
            <button
              type="button"
              className="p-0.5 rounded text-current opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          )}

          {hasChildren && isCollapsed && (
            <span className="text-[10px] font-mono opacity-60">
              +{node.children!.length}
            </span>
          )}
        </div>

        {node.description && (
          <p
            className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] mt-1 max-w-[160px] text-center leading-tight"
            dir="auto"
          >
            {node.description}
          </p>
        )}
      </div>

      {/* Children Branches flowing Top to Bottom */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical trunk line coming down from parent bottom */}
          <div className="w-px h-4 sm:h-5 bg-[#D4D4D8] dark:bg-[#3F3F46] shrink-0" />

          {/* Children horizontal row (Seamless connected columns) */}
          <div className="flex items-start justify-center w-full relative">
            {node.children!.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === node.children!.length - 1;
              const onlyOne = node.children!.length === 1;

              return (
                <div
                  key={`${currentPath}-${idx}`}
                  className="relative flex flex-col items-center flex-1 min-w-max px-2 sm:px-3"
                >
                  {/* Continuous horizontal connection line spanning adjacent columns without any gaps */}
                  {!onlyOne && (
                    <div
                      className={`absolute top-0 h-px bg-[#D4D4D8] dark:bg-[#3F3F46] pointer-events-none ${
                        isFirst
                          ? isEn
                            ? 'left-1/2 right-0'
                            : 'left-0 right-1/2'
                          : isLast
                          ? isEn
                            ? 'left-0 right-1/2'
                            : 'left-1/2 right-0'
                          : 'left-0 right-0'
                      }`}
                    />
                  )}

                  {/* Vertical drop line down into this child */}
                  <div className="w-px h-4 sm:h-5 bg-[#D4D4D8] dark:bg-[#3F3F46] shrink-0" />

                  {/* Recursive Child Node */}
                  <TopDownNode
                    node={child}
                    depth={depth + 1}
                    isEn={isEn}
                    collapsedState={collapsedState}
                    onToggle={onToggle}
                    currentPath={`${currentPath}-${idx}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const InteractiveTree: React.FC<InteractiveTreeProps> = ({ rawJson }) => {
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  const appLang = getStoredLanguage();
  const isEn = appLang === 'en';

  let config: TreeConfig | null = null;

  try {
    const parsed = JSON.parse(rawJson);
    if (parsed.root && typeof parsed.root === 'object') {
      config = parsed as TreeConfig;
    } else if (parsed.label || parsed.title) {
      config = {
        title: parsed.title || parsed.label,
        root: {
          label: parsed.root?.label || parsed.label || parsed.title || 'Central Topic',
          children: parsed.children || parsed.root?.children || [],
          description: parsed.description || parsed.root?.description,
        },
      };
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      config = {
        title: 'Tree Diagram',
        root: {
          label: 'Central Topic',
          children: parsed,
        },
      };
    }
  } catch (e) {
    return (
      <div className="p-2 my-2 text-xs text-red-500 font-sans">
        Invalid Tree JSON structure
      </div>
    );
  }

  if (!config || !config.root) {
    return null;
  }

  const handleToggle = (path: string) => {
    setCollapsedState((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Auto-fit scaling calculation to make the entire tree visible at first glance without cutting off
  useEffect(() => {
    const updateAutoFit = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const contentWidth = contentRef.current.scrollWidth;
        const contentHeight = contentRef.current.scrollHeight;

        if (contentWidth > 0 && containerWidth > 0) {
          // Calculate scale ratio so the entire diagram fits the screen width
          const fitScale = Math.min(1, (containerWidth - 8) / contentWidth);
          setScale(fitScale);
          setScaledHeight(contentHeight * fitScale + 12);
        }
      }
    };

    updateAutoFit();
    const timer = setTimeout(updateAutoFit, 100);

    window.addEventListener('resize', updateAutoFit);
    const observer = new ResizeObserver(updateAutoFit);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateAutoFit);
      observer.disconnect();
    };
  }, [config, collapsedState]);

  return (
    <div
      ref={containerRef}
      className="my-3 w-full not-prose font-sans overflow-hidden flex flex-col items-center justify-start"
      dir={isEn ? 'ltr' : 'rtl'}
      style={{ minHeight: scaledHeight ? `${scaledHeight}px` : 'auto' }}
    >
      {/* Scaled Top-Down Tree Canvas: Auto-fits container width so user sees the whole diagram at first glance */}
      <div
        ref={contentRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease-out',
        }}
        className="inline-flex justify-center min-w-max py-2"
      >
        <TopDownNode
          node={config.root}
          depth={0}
          isEn={isEn}
          collapsedState={collapsedState}
          onToggle={handleToggle}
          currentPath="root"
        />
      </div>
    </div>
  );
};

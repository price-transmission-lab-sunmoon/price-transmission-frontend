import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useCommodities } from '@/hooks/useCommodities';
import { FreshnessChip } from './FreshnessChip';
import type { ViewTab } from '@/types/literals';

const CLUSTER_LABELS: Record<string, string> = {
  grain: '곡물류',
  oil_sugar: '유지·감미료류',
  tropical: '열대작물',
  livestock: '축산물',
  independent: '과일·견과류',
};

const CLUSTER_ORDER = ['grain', 'oil_sugar', 'tropical', 'livestock', 'independent'];

const GRADE_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-orange-400',
  reference: 'bg-lime-400',
};

interface ViewTabConfig {
  id: ViewTab;
  label: string;
}

// PM 별건 #1 — literals.ts VIEW_TABS SoT(4탭) 정합. methodology 포함.
const VIEW_TABS: ViewTabConfig[] = [
  { id: 'stream', label: '흐름 보기' },
  { id: 'scatter', label: '전달 구조' },
  { id: 'raw-prices', label: '원시 시계열' },
  { id: 'methodology', label: '방법론' },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: commodities, isLoading: commoditiesLoading } = useCommodities();

  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const setPrimaryCommodity = useAppStore((s) => s.setPrimaryCommodity);
  const setSecondaryCommodity = useAppStore((s) => s.setSecondaryCommodity);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [primaryOpen, setPrimaryOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (primaryRef.current && !primaryRef.current.contains(e.target as Node)) {
        setPrimaryOpen(false);
      }
      if (secondaryRef.current && !secondaryRef.current.contains(e.target as Node)) {
        setSecondaryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPrimaryOpen(false);
        setSecondaryOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const primaryCommodity = commodities?.find((c) => c.commodity_id === primaryCommodityId);
  const secondaryCommodity = commodities?.find((c) => c.commodity_id === secondaryCommodityId);

  const grouped = CLUSTER_ORDER.map((cluster) => ({
    cluster,
    items: (commodities ?? []).filter((c) => c.cluster === cluster),
  })).filter((g) => g.items.length > 0);

  function handlePrimarySelect(id: string) {
    setPrimaryCommodity(id);
    if (secondaryCommodityId === id) setSecondaryCommodity(null);
    setPrimaryOpen(false);
  }

  function handleSecondarySelect(id: string) {
    setSecondaryCommodity(id);
    setSecondaryOpen(false);
  }

  function handleTabClick(tab: ViewTab) {
    setActiveTab(tab);
    const targetPath = tab === 'methodology' ? '/methodology' : '/';
    if (location.pathname !== targetPath) navigate(targetPath);
  }

  // URL → activeTab 단방향 동기화. /methodology 직접 진입 시 activeTab=stream 유지 버그 차단.
  useEffect(() => {
    if (location.pathname === '/methodology' && activeTab !== 'methodology') {
      setActiveTab('methodology');
    } else if (location.pathname === '/' && activeTab === 'methodology') {
      setActiveTab('stream');
    }
  }, [location.pathname, activeTab, setActiveTab]);

  return (
    <header
      data-testid="header"
      className="flex items-center justify-between h-14 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0 relative z-10"
    >
      {/* 좌측: 서비스명 + 주 품목 + 보조 품목 + 뷰 탭 */}
      <div className="flex items-center gap-4">
        {/* 서비스명 */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <polyline
              points="1,14 5,8 9,11 13,5 17,2"
              stroke="#e24b4a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-white font-bold text-sm tracking-tight">가격렌즈</span>
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {/* 주 품목 드롭다운 */}
        <div ref={primaryRef} className="relative">
          <button
            aria-label="주 품목 선택"
            aria-haspopup="listbox"
            aria-expanded={primaryOpen}
            disabled={commoditiesLoading}
            onClick={() => setPrimaryOpen((v) => !v)}
            className="flex items-center gap-2 h-8 px-3 bg-slate-800 border border-slate-600 rounded-md text-xs font-medium transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {commoditiesLoading ? (
              <span className="text-slate-400">품목 로딩 중...</span>
            ) : primaryCommodity ? (
              <>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${primaryCommodity.has_anomaly_this_month && primaryCommodity.latest_anomaly_grade ? (GRADE_DOT[primaryCommodity.latest_anomaly_grade] ?? 'bg-slate-500') : 'bg-slate-500'}`}
                />
                <span className="text-slate-200">{primaryCommodity.name_kr}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                <span className="text-slate-400">품목 선택</span>
              </>
            )}
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              className={`text-slate-500 transition-transform ${primaryOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {primaryOpen && (
            <div
              role="listbox"
              aria-label="주 품목 목록"
              className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 py-1 max-h-72 overflow-y-auto"
            >
              {grouped.map(({ cluster, items }) => (
                <div key={cluster}>
                  <div className="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide border-t border-slate-700/50 first:border-t-0">
                    {CLUSTER_LABELS[cluster] ?? cluster}
                  </div>
                  {items.map((c) => (
                    <button
                      key={c.commodity_id}
                      role="option"
                      aria-selected={c.commodity_id === primaryCommodityId}
                      onClick={() => handlePrimarySelect(c.commodity_id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-slate-700 ${c.commodity_id === primaryCommodityId ? 'text-white bg-slate-700/50' : 'text-slate-300'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.has_anomaly_this_month && c.latest_anomaly_grade ? (GRADE_DOT[c.latest_anomaly_grade] ?? 'bg-slate-600') : 'bg-slate-600'}`}
                      />
                      {c.name_kr}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 보조 품목 */}
        <div ref={secondaryRef} className="relative">
          {secondaryCommodity ? (
            <div className="flex items-center gap-1.5 h-8 px-2.5 bg-slate-800 border border-slate-600 rounded-md text-xs">
              <span className="text-slate-300">{secondaryCommodity.name_kr}</span>
              <button
                aria-label={`보조 품목 ${secondaryCommodity.name_kr} 제거`}
                onClick={() => setSecondaryCommodity(null)}
                className="text-slate-500 hover:text-slate-200 ml-0.5"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              aria-label="보조 품목 비교 추가"
              aria-haspopup="listbox"
              aria-expanded={secondaryOpen}
              onClick={() => setSecondaryOpen((v) => !v)}
              className="flex items-center gap-1 h-8 px-3 bg-transparent border border-dashed border-slate-600 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 text-xs transition-colors"
            >
              <span>비교 추가</span>
              <span className="text-base leading-none">+</span>
            </button>
          )}

          {secondaryOpen && (
            <div
              role="listbox"
              aria-label="보조 품목 목록"
              className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 py-1 max-h-72 overflow-y-auto"
            >
              {grouped.map(({ cluster, items }) => (
                <div key={cluster}>
                  <div className="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide border-t border-slate-700/50 first:border-t-0">
                    {CLUSTER_LABELS[cluster] ?? cluster}
                  </div>
                  {items
                    .filter((c) => c.commodity_id !== primaryCommodityId)
                    .map((c) => (
                      <button
                        key={c.commodity_id}
                        role="option"
                        aria-selected={c.commodity_id === secondaryCommodityId}
                        onClick={() => handleSecondarySelect(c.commodity_id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-slate-700 ${c.commodity_id === secondaryCommodityId ? 'text-white bg-slate-700/50' : 'text-slate-300'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                        {c.name_kr}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {/* 뷰 전환 탭 (4탭 SoT — 방법론 포함) */}
        <nav aria-label="뷰 탭" className="flex items-center gap-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => handleTabClick(tab.id)}
              className={`h-7 px-3 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 우측: FreshnessChip + 도움말 */}
      <div className="flex items-center gap-3">
        <FreshnessChip />

        <button
          aria-label="도움말"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
        >
          ?
        </button>
      </div>
    </header>
  );
}

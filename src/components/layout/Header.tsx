import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useCommodities } from '@/hooks/useCommodities';
import { Z_INDEX } from '@/utils/zIndex';
import { ANOMALY_COLORS } from '@/utils/colorUtils';
import { FreshnessChip } from './FreshnessChip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import type { ViewTab } from '@/types/literals';
import type { IconName } from '@/utils/icons';

const CLUSTER_LABELS: Record<string, string> = {
  grain: '곡물류',
  oil_sugar: '유지·감미료류',
  tropical: '열대작물',
  livestock: '축산물',
  independent: '과일·견과류',
};

const CLUSTER_ORDER = ['grain', 'oil_sugar', 'tropical', 'livestock', 'independent'];

const GRADE_DOT_COLOR: Record<string, string> = {
  high: ANOMALY_COLORS.high,
  medium: ANOMALY_COLORS.medium,
  reference: ANOMALY_COLORS.reference,
};

interface ViewTabConfig {
  id: ViewTab;
  label: string;
  icon: IconName;
}

// literals.ts VIEW_TABS SoT(4탭) 정합. methodology 포함.
const VIEW_TABS: ViewTabConfig[] = [
  { id: 'stream', label: '흐름 보기', icon: 'trend-up' },
  { id: 'scatter', label: '전달 구조', icon: 'compare' },
  { id: 'raw-prices', label: '원시 시계열', icon: 'list' },
  { id: 'methodology', label: '방법론', icon: 'info' },
];

// @guide:LAYOUT-02
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
      className="flex items-center justify-between h-[60px] px-6 bg-canvas border-b border-border-default shrink-0 relative"
      style={{ zIndex: Z_INDEX.HEADER }}
    >
      {/* 좌측: 서비스명 + 주 품목 + 보조 품목 + 뷰 탭 */}
      <div className="flex items-center gap-5">
        {/* 서비스명 — brand teal logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden="true"
          >
            <polyline
              points="2,17 6,11 11,14 16,7 20,3"
              stroke="var(--brand)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="3" r="2.5" fill="var(--brand)" />
          </svg>
          <span className="text-primary font-bold text-[15px] tracking-tight">
            가격렌즈
          </span>
        </div>

        <div className="w-px h-[22px] bg-border-default" aria-hidden />

        {/* 주 품목 드롭다운 */}
        <div ref={primaryRef} className="relative">
          <button
            aria-label="주 품목 선택"
            aria-haspopup="listbox"
            aria-expanded={primaryOpen}
            disabled={commoditiesLoading}
            onClick={() => setPrimaryOpen((v) => !v)}
            className={[
              'flex items-center gap-2 h-[34px] pr-2.5 pl-3 min-w-[160px]',
              'bg-surface border rounded-md shadow-e1 text-[13px] font-medium',
              'transition-[border-color,box-shadow] duration-fast ease-out',
              'disabled:cursor-not-allowed disabled:opacity-60',
              primaryOpen
                ? 'border-brand shadow-[0_0_0_3px_var(--brand-subtle)]'
                : 'border-border-default hover:border-border-strong',
            ].join(' ')}
          >
            {commoditiesLoading ? (
              <span className="text-tertiary">품목 로딩 중…</span>
            ) : primaryCommodity ? (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      primaryCommodity.has_anomaly_this_month && primaryCommodity.latest_anomaly_grade
                        ? GRADE_DOT_COLOR[primaryCommodity.latest_anomaly_grade] ?? 'var(--text-muted)'
                        : 'var(--text-muted)',
                  }}
                />
                <span className="text-primary">{primaryCommodity.name_kr}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] shrink-0" />
                <span className="text-tertiary">품목 선택</span>
              </>
            )}
            <Icon
              name="chevron-down"
              size={14}
              className={`text-tertiary ml-auto transition-transform duration-default ease-out ${primaryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {primaryOpen && (
            <div
              role="listbox"
              aria-label="주 품목 목록"
              style={{ zIndex: Z_INDEX.DROPDOWN }}
              className="absolute top-full left-0 mt-1.5 w-[280px] bg-surface border border-border-default rounded-lg shadow-e4 p-1.5 max-h-[380px] overflow-y-auto animate-scale-in"
            >
              {grouped.map(({ cluster, items }) => (
                <div key={cluster}>
                  <div className="px-3 pt-2 pb-1 text-[10px] text-tertiary font-semibold uppercase tracking-widest">
                    {CLUSTER_LABELS[cluster] ?? cluster}
                  </div>
                  {items.map((c) => {
                    const isActive = c.commodity_id === primaryCommodityId;
                    return (
                      <button
                        key={c.commodity_id}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => handlePrimarySelect(c.commodity_id)}
                        className={[
                          'w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-left rounded-sm',
                          'transition-colors duration-fast ease-out',
                          isActive
                            ? 'bg-brand-subtle text-brand-active'
                            : 'text-primary hover:bg-subtle',
                        ].join(' ')}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            background:
                              c.has_anomaly_this_month && c.latest_anomaly_grade
                                ? GRADE_DOT_COLOR[c.latest_anomaly_grade] ?? 'var(--text-muted)'
                                : 'var(--text-muted)',
                          }}
                        />
                        {c.name_kr}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 보조 품목 */}
        <div ref={secondaryRef} className="relative">
          {secondaryCommodity ? (
            <div className="flex items-center gap-1.5 h-[34px] px-3 bg-surface border border-border-default rounded-md text-[13px] shadow-e1">
              <span className="text-primary">{secondaryCommodity.name_kr}</span>
              <button
                aria-label={`보조 품목 ${secondaryCommodity.name_kr} 제거`}
                onClick={() => setSecondaryCommodity(null)}
                className="text-tertiary hover:text-primary ml-1 transition-colors duration-fast"
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          ) : (
            <button
              aria-label="보조 품목 비교 추가"
              aria-haspopup="listbox"
              aria-expanded={secondaryOpen}
              onClick={() => setSecondaryOpen((v) => !v)}
              className="flex items-center gap-1.5 h-[34px] px-3 bg-transparent border border-dashed border-border-strong rounded-md text-tertiary hover:text-brand hover:border-brand hover:bg-brand-subtle text-[12px] transition-[color,border-color,background-color] duration-fast ease-out"
            >
              <Icon name="plus" size={14} />
              <span>비교 추가</span>
            </button>
          )}

          {secondaryOpen && (
            <div
              role="listbox"
              aria-label="보조 품목 목록"
              style={{ zIndex: Z_INDEX.DROPDOWN }}
              className="absolute top-full left-0 mt-1.5 w-[280px] bg-surface border border-border-default rounded-lg shadow-e4 p-1.5 max-h-[380px] overflow-y-auto animate-scale-in"
            >
              {grouped.map(({ cluster, items }) => (
                <div key={cluster}>
                  <div className="px-3 pt-2 pb-1 text-[10px] text-tertiary font-semibold uppercase tracking-widest">
                    {CLUSTER_LABELS[cluster] ?? cluster}
                  </div>
                  {items
                    .filter((c) => c.commodity_id !== primaryCommodityId)
                    .map((c) => {
                      const isActive = c.commodity_id === secondaryCommodityId;
                      return (
                        <button
                          key={c.commodity_id}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSecondarySelect(c.commodity_id)}
                          className={[
                            'w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-left rounded-sm',
                            'transition-colors duration-fast ease-out',
                            isActive
                              ? 'bg-brand-subtle text-brand-active'
                              : 'text-primary hover:bg-subtle',
                          ].join(' ')}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] shrink-0" />
                          {c.name_kr}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-[22px] bg-border-default" aria-hidden />

        {/* 뷰 전환 탭 (4탭 SoT — 방법론 포함) */}
        <nav aria-label="뷰 탭" className="flex items-center gap-0.5">
          {VIEW_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleTabClick(tab.id)}
                className={[
                  'h-[34px] px-3 rounded-md text-[13px] inline-flex items-center gap-1.5',
                  'transition-[background-color,color,border-color] duration-fast ease-out border',
                  isActive
                    ? 'bg-brand-subtle text-brand-active border-brand-border font-semibold'
                    : 'border-transparent text-tertiary hover:bg-subtle hover:text-secondary font-medium',
                ].join(' ')}
              >
                <Icon name={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 우측: FreshnessChip + 도움말 */}
      <div className="flex items-center gap-2.5">
        <FreshnessChip />
        <IconButton
          aria-label="도움말"
          variant="outline"
          size="md"
          icon={<Icon name="help" size={16} />}
        />
      </div>
    </header>
  );
}

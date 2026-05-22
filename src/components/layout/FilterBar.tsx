import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useEvents } from '@/hooks/useEvents';
import { useFreshness } from '@/hooks/useFreshness';
import { presetToFrom, resolveEffectiveDataEnd } from '@/utils/dateUtils';
import { Z_INDEX } from '@/utils/zIndex';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import type {
  PeriodPreset,
  ConfidenceGrade,
  PrimaryPattern,
  SegmentId,
} from '@/types/literals';

interface PeriodPresetConfig {
  id: PeriodPreset;
  label: string;
}

const PERIOD_PRESETS: PeriodPresetConfig[] = [
  { id: '3m', label: '3개월' },
  { id: '6m', label: '6개월' },
  { id: '1y', label: '1년' },
  { id: '3y', label: '3년' },
  { id: '5y', label: '5년' },
  { id: 'all', label: '전체' },
];

interface ConfidenceOption {
  grades: ConfidenceGrade[];
  label: string;
}

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { grades: ['high'], label: '고신뢰만' },
  { grades: ['high', 'medium'], label: '고+중신뢰' },
  { grades: ['high', 'medium', 'reference'], label: '전체' },
];

interface PatternOption {
  patterns: PrimaryPattern[];
  label: string;
}

const PATTERN_OPTIONS: PatternOption[] = [
  { patterns: ['pattern1', 'pattern2', 'pattern3'], label: '전체' },
  { patterns: ['pattern1'], label: '패턴 1' },
  { patterns: ['pattern2'], label: '패턴 2' },
  { patterns: ['pattern3'], label: '패턴 3' },
];

// Filter label + segmented-control wrapper — neutral active (no brand)
const LABEL_CLASS =
  'text-tertiary text-[10px] font-semibold uppercase tracking-widest mr-1';
const GROUP_CLASS =
  'inline-flex items-center bg-subtle border border-border-default rounded-md p-0.5 gap-0.5';
const ITEM_BASE =
  'h-6 px-2.5 rounded-sm text-[12px] font-medium transition-[background-color,color,box-shadow] duration-fast ease-out';
const ITEM_ACTIVE = 'bg-surface text-primary shadow-e1';
const ITEM_IDLE = 'text-tertiary hover:text-secondary';

const DIVIDER = 'w-px h-5 bg-border-default shrink-0';

export function FilterBar() {
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: freshness } = useFreshness();

  const periodPreset = useAppStore((s) => s.periodPreset);
  const setPeriodPreset = useAppStore((s) => s.setPeriodPreset);
  const setFilterRange = useAppStore((s) => s.setFilterRange);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const setConfidenceFilter = useAppStore((s) => s.setConfidenceFilter);
  const patternFilter = useAppStore((s) => s.patternFilter);
  const setPatternFilter = useAppStore((s) => s.setPatternFilter);
  const eventFilter = useAppStore((s) => s.eventFilter);
  const toggleEvent = useAppStore((s) => s.toggleEvent);
  const setEventFilter = useAppStore((s) => s.setEventFilter);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const toggleSegment = useAppStore((s) => s.toggleSegment);
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const commodities = useAppStore((s) => s.commodities);
  const activeTab = useAppStore((s) => s.activeTab);
  const layoutNumber = useAppStore((s) => s.layoutNumber);
  const setLayoutNumber = useAppStore((s) => s.setLayoutNumber);

  const [eventOpen, setEventOpen] = useState(false);
  const eventRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (eventRef.current && !eventRef.current.contains(e.target as Node)) {
        setEventOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setEventOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const primaryCommodity = commodities.find((c) => c.commodity_id === primaryCommodityId);
  const availableSegments: SegmentId[] = primaryCommodity
    ? (primaryCommodity.segments as SegmentId[])
    : [];
  const segmentsDisabled = !primaryCommodityId || availableSegments.length === 0;

  function handlePresetClick(preset: PeriodPreset) {
    setPeriodPreset(preset);
    if (primaryCommodity) {
      // P1-1: freshness.data_up_to가 stale할 수 있으므로 analysis_end와 비교 후 최신값 사용
      const effectiveEnd = resolveEffectiveDataEnd(
        freshness?.data_up_to,
        primaryCommodity.analysis_end,
      );
      if (!effectiveEnd) return;
      const from = presetToFrom(preset, effectiveEnd, primaryCommodity.analysis_start);
      setFilterRange(from, effectiveEnd);
    }
  }

  function isConfidenceActive(option: ConfidenceOption) {
    return (
      option.grades.length === confidenceFilter.length &&
      option.grades.every((g) => confidenceFilter.includes(g))
    );
  }

  function isPatternActive(option: PatternOption) {
    if (option.patterns.length === 3)
      return patternFilter.length === 0 || patternFilter.length === 3;
    return patternFilter.length === 1 && patternFilter[0] === option.patterns[0];
  }

  function handlePatternClick(option: PatternOption) {
    if (option.patterns.length === 3) {
      setPatternFilter([]);
    } else {
      setPatternFilter(option.patterns);
    }
  }

  const selectedEventCount = eventFilter.length;

  return (
    <div
      data-testid="filter-bar"
      className="flex flex-nowrap items-center gap-4 h-[52px] px-6 bg-canvas border-b border-border-default shrink-0 whitespace-nowrap overflow-x-auto"
    >
      {/* 기간 프리셋 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={LABEL_CLASS}>기간</span>
        <div role="group" aria-label="기간 프리셋" className={GROUP_CLASS}>
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.id}
              aria-label={`기간 ${p.label}`}
              aria-pressed={periodPreset === p.id}
              onClick={() => handlePresetClick(p.id)}
              className={[
                ITEM_BASE,
                periodPreset === p.id ? ITEM_ACTIVE : ITEM_IDLE,
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={DIVIDER} aria-hidden />

      {/* 사건 필터 드롭다운 */}
      <div ref={eventRef} className="relative shrink-0">
        <button
          aria-label="사건 필터"
          aria-haspopup="listbox"
          aria-expanded={eventOpen}
          onClick={() => setEventOpen((v) => !v)}
          className={[
            'inline-flex items-center gap-2 h-7 px-3 rounded-md text-[12px] font-medium',
            'transition-[background-color,border-color,color] duration-fast ease-out border',
            selectedEventCount > 0
              ? 'bg-brand-subtle border-brand-border text-brand-active'
              : 'bg-surface border-border-default text-secondary hover:border-border-strong',
          ].join(' ')}
        >
          <Icon name="calendar" size={12} />
          <span>
            사건
            {selectedEventCount > 0 && (
              <span className="text-[var(--text-muted)] ml-1">
                ({selectedEventCount})
              </span>
            )}
          </span>
          <Icon
            name="chevron-down"
            size={12}
            className={`transition-transform duration-default ease-out ${eventOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {eventOpen && (
          <div
            role="listbox"
            aria-label="사건 목록"
            aria-multiselectable="true"
            style={{ zIndex: Z_INDEX.DROPDOWN }}
            className="absolute top-full left-0 mt-1.5 w-[240px] bg-surface border border-border-default rounded-lg shadow-e4 py-1.5 animate-scale-in"
          >
            {selectedEventCount > 0 && (
              <div className="px-3 pb-1.5 mb-1 border-b border-border-subtle">
                <button
                  aria-label="사건 필터 전체 선택 해제"
                  onClick={() => setEventFilter([])}
                  className="text-[11px] text-tertiary hover:text-secondary py-1 transition-colors duration-fast"
                >
                  선택 해제
                </button>
              </div>
            )}
            {eventsLoading || !events ? (
              <div className="px-3 py-2 text-[12px] text-tertiary">이벤트 로딩 중…</div>
            ) : (
              events.map((ev) => {
                const checked = eventFilter.includes(ev.event_key);
                return (
                  <button
                    key={ev.event_key}
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggleEvent(ev.event_key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left hover:bg-subtle transition-colors duration-fast"
                  >
                    <span
                      className={[
                        'w-[14px] h-[14px] rounded-sm flex items-center justify-center shrink-0',
                        'transition-colors duration-fast border',
                        checked ? 'bg-brand border-brand' : 'bg-surface border-border-strong',
                      ].join(' ')}
                    >
                      {checked && (
                        <Icon
                          name="check"
                          size={10}
                          strokeWidth={3}
                          className="text-on-brand"
                        />
                      )}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.color_hex }}
                    />
                    <span className={checked ? 'text-primary' : 'text-secondary'}>
                      {ev.label_kr}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className={DIVIDER} aria-hidden />

      {/* 신뢰도 필터 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={LABEL_CLASS}>신뢰도</span>
        <div role="group" aria-label="신뢰도 필터" className={GROUP_CLASS}>
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              aria-label={`신뢰도 ${opt.label}`}
              aria-pressed={isConfidenceActive(opt)}
              onClick={() => setConfidenceFilter(opt.grades)}
              className={[ITEM_BASE, isConfidenceActive(opt) ? ITEM_ACTIVE : ITEM_IDLE].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={DIVIDER} aria-hidden />

      {/* 패턴 유형 필터 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={LABEL_CLASS}>패턴</span>
        <div role="group" aria-label="패턴 유형 필터" className={GROUP_CLASS}>
          {PATTERN_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              aria-label={`패턴 ${opt.label}`}
              aria-pressed={isPatternActive(opt)}
              onClick={() => handlePatternClick(opt)}
              className={[ITEM_BASE, isPatternActive(opt) ? ITEM_ACTIVE : ITEM_IDLE].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 원시 시계열 뷰 전용: 레이아웃 선택 */}
      {activeTab === 'raw-prices' && (
        <>
          <div className={DIVIDER} aria-hidden />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={LABEL_CLASS}>레이아웃</span>
            <div role="group" aria-label="레이아웃 선택" className={GROUP_CLASS}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  aria-label={`레이아웃 ${n}`}
                  aria-pressed={layoutNumber === n}
                  onClick={() => setLayoutNumber(n)}
                  className={[
                    'h-6 w-6 rounded-sm text-[12px] font-medium font-mono',
                    'transition-[background-color,color,box-shadow] duration-fast ease-out',
                    layoutNumber === n ? ITEM_ACTIVE : ITEM_IDLE,
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 구간 on/off 토글 — brand teal switch */}
      <div className="flex items-center gap-2.5 ml-auto shrink-0">
        <span className={LABEL_CLASS}>구간</span>
        {segmentsDisabled
          ? availableSegments.length === 0 &&
            primaryCommodityId === null && (
              <span className="text-tertiary text-[12px]">—</span>
            )
          : availableSegments.map((seg) => {
              const isOn = activeSegments.includes(seg);
              const label = seg === 'D_prime' ? "D'" : seg;
              return (
                <Switch
                  key={seg}
                  checked={isOn}
                  onChange={() => toggleSegment(seg)}
                  size="sm"
                  label={
                    <span className="text-[12px] font-mono text-tertiary">
                      {label}
                    </span>
                  }
                  labelPosition="before"
                  aria-label={`구간 ${label} ${isOn ? '끄기' : '켜기'}`}
                />
              );
            })}
      </div>
    </div>
  );
}

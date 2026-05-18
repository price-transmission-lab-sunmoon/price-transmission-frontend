import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useEvents } from '@/hooks/useEvents';
import { useFreshness } from '@/hooks/useFreshness';
import { presetToFrom } from '@/utils/dateUtils';
import type { PeriodPreset, ConfidenceGrade, PrimaryPattern, SegmentId } from '@/types/literals';

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
    if (freshness && primaryCommodity) {
      const from = presetToFrom(preset, freshness.data_up_to, primaryCommodity.analysis_start);
      setFilterRange(from, freshness.data_up_to);
    }
  }

  function isConfidenceActive(option: ConfidenceOption) {
    return (
      option.grades.length === confidenceFilter.length &&
      option.grades.every((g) => confidenceFilter.includes(g))
    );
  }

  function isPatternActive(option: PatternOption) {
    if (option.patterns.length === 3) return patternFilter.length === 0 || patternFilter.length === 3;
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
      className="flex items-center gap-3 h-12 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0 overflow-x-auto"
    >
      {/* 기간 프리셋 */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">기간</span>
        <div
          role="group"
          aria-label="기간 프리셋"
          className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5"
        >
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.id}
              aria-label={`기간 ${p.label}`}
              aria-pressed={periodPreset === p.id}
              onClick={() => handlePresetClick(p.id)}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                periodPreset === p.id
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 사건 필터 드롭다운 */}
      <div ref={eventRef} className="relative shrink-0">
        <button
          aria-label="사건 필터"
          aria-haspopup="listbox"
          aria-expanded={eventOpen}
          onClick={() => setEventOpen((v) => !v)}
          className={`flex items-center gap-1.5 h-7 px-2.5 border rounded text-xs transition-colors ${
            selectedEventCount > 0
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <rect x="1" y="1.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 0.5V2.5M7.5 0.5V2.5M1 4.5H10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>사건{selectedEventCount > 0 ? ` (${selectedEventCount})` : ''}</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`transition-transform ${eventOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path
              d="M2.5 4L5 6.5L7.5 4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {eventOpen && (
          <div
            role="listbox"
            aria-label="사건 목록"
            aria-multiselectable="true"
            style={{ zIndex: 200 /* Z_INDEX.DROPDOWN per fe-api-connect §5.5 — z-50은 fe-panel(z=100) 아래로 깔려 차트 위에 안 보임 */ }}
            className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1"
          >
            {selectedEventCount > 0 && (
              <div className="px-3 pb-1 border-b border-slate-700/50">
                <button
                  aria-label="사건 필터 전체 선택 해제"
                  onClick={() => setEventFilter([])}
                  className="text-[11px] text-slate-400 hover:text-slate-200 py-1"
                >
                  선택 해제
                </button>
              </div>
            )}
            {eventsLoading || !events ? (
              <div className="px-3 py-2 text-xs text-slate-500">이벤트 로딩 중...</div>
            ) : (
              events.map((ev) => {
                const checked = eventFilter.includes(ev.event_key);
                return (
                  <button
                    key={ev.event_key}
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggleEvent(ev.event_key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-700 transition-colors"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}
                    >
                      {checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                          <path
                            d="M1.5 4L3 5.5L6.5 2"
                            stroke="white"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.color_hex }}
                    />
                    <span className={checked ? 'text-slate-200' : 'text-slate-400'}>
                      {ev.label_kr}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 신뢰도 필터 */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">신뢰도</span>
        <div
          role="group"
          aria-label="신뢰도 필터"
          className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5"
        >
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              aria-label={`신뢰도 ${opt.label}`}
              aria-pressed={isConfidenceActive(opt)}
              onClick={() => setConfidenceFilter(opt.grades)}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                isConfidenceActive(opt)
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 패턴 유형 필터 */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">패턴</span>
        <div
          role="group"
          aria-label="패턴 유형 필터"
          className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5"
        >
          {PATTERN_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              aria-label={`패턴 ${opt.label}`}
              aria-pressed={isPatternActive(opt)}
              onClick={() => handlePatternClick(opt)}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                isPatternActive(opt)
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 원시 시계열 뷰 전용: 레이아웃 선택 */}
      {activeTab === 'raw-prices' && (
        <>
          <div className="w-px h-5 bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-500 text-[10px] mr-1">레이아웃</span>
            <div
              role="group"
              aria-label="레이아웃 선택"
              className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  aria-label={`레이아웃 ${n}`}
                  aria-pressed={layoutNumber === n}
                  onClick={() => setLayoutNumber(n)}
                  className={`h-6 w-6 rounded text-[11px] font-medium transition-colors ${
                    layoutNumber === n
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 구간 on/off 토글 */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <span className="text-slate-500 text-[10px]">구간</span>
        {segmentsDisabled ? (
          <span className="text-slate-600 text-[11px]">—</span>
        ) : (
          availableSegments.map((seg) => {
            const isOn = activeSegments.includes(seg);
            const label = seg === 'D_prime' ? "D'" : seg;
            return (
              <button
                key={seg}
                aria-label={`구간 ${label} ${isOn ? '끄기' : '켜기'}`}
                aria-pressed={isOn}
                onClick={() => toggleSegment(seg)}
                className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer"
              >
                <span className="text-slate-300 text-[11px] font-mono">{label}</span>
                <span
                  className={`relative w-7 h-3.5 rounded-full transition-colors ${isOn ? 'bg-emerald-500/70' : 'bg-slate-700'}`}
                >
                  <span
                    className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${isOn ? 'translate-x-3.5' : 'translate-x-0.5'}`}
                  />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function FilterBar() {
  // §3.4 — 기간 프리셋 6개. 기본값: 3년
  const periods = ['3개월', '6개월', '1년', '3년', '5년', '전체'];
  const periodActiveIndex = 3;

  // §3.4 — 신뢰도 필터 라디오 (3택1). 기본값: 고신뢰+중신뢰
  const grades = ['고신뢰만', '고신뢰+중신뢰', '전체'];
  const gradeActiveIndex = 1;

  // §3.4 — 패턴 유형 필터 (4택1). 기본값: 전체
  const patterns = ['패턴 1', '패턴 2', '패턴 3', '전체'];
  const patternActiveIndex = 3;

  // §3.4 — 구간 on/off 토글 스위치
  const segments = [
    { id: 'A', enabled: true },
    { id: 'B', enabled: true },
    { id: "D'", enabled: true },
  ];

  return (
    <div
      data-testid="filter-bar"
      className="flex items-center gap-3 h-12 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0 overflow-x-auto"
    >
      {/* 기간 프리셋 — segmented control */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">기간</span>
        <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
          {periods.map((p, i) => (
            <button
              key={p}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                i === periodActiveIndex
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 사건 필터 — 토글 드롭다운 */}
      <button className="flex items-center gap-1.5 h-7 px-2.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 hover:text-white shrink-0">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="1" y="1.5" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3.5 0.5V2.5M7.5 0.5V2.5M1 4.5H10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span>사건</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2.5 4L5 6.5L7.5 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 신뢰도 필터 — 라디오 (3택1) */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">신뢰도</span>
        <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
          {grades.map((g, i) => (
            <button
              key={g}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                i === gradeActiveIndex
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-slate-700 shrink-0" />

      {/* 패턴 유형 필터 (4택1) */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-500 text-[10px] mr-1">패턴</span>
        <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
          {patterns.map((p, i) => (
            <button
              key={p}
              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors ${
                i === patternActiveIndex
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 구간 on/off 토글 스위치 (우측 정렬) */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <span className="text-slate-500 text-[10px]">구간</span>
        {segments.map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-slate-300 text-[11px] font-mono">{s.id}</span>
            <span
              className={`relative w-7 h-3.5 rounded-full transition-colors ${
                s.enabled ? 'bg-emerald-500/70' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                  s.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function Header() {
  // web_plan_vN §3.3 — 뷰 전환 탭: 흐름 보기 / 전달 구조 / 원시 시계열 / 방법론
  const viewTabs = ['흐름 보기', '전달 구조', '원시 시계열', '방법론'];

  return (
    <header
      data-testid="header"
      className="flex items-center justify-between h-14 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0"
    >
      {/* 좌측: 서비스명 + 품목 선택 + 보조 품목 + 뷰 탭 */}
      <div className="flex items-center gap-4">
        {/* 서비스명 */}
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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

        {/* 주 품목 선택 드롭다운 자리 표시자 */}
        <div className="flex items-center gap-2 h-8 px-3 bg-slate-800 border border-slate-600 rounded-md cursor-not-allowed">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-slate-300 text-xs font-medium">품목 선택</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-slate-500">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* 보조 품목 "비교 추가 +" 버튼 (§3.3, §5.2) */}
        <button className="flex items-center gap-1 h-8 px-3 bg-transparent border border-dashed border-slate-600 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 text-xs">
          <span>비교 추가</span>
          <span className="text-base leading-none">+</span>
        </button>

        <div className="w-px h-5 bg-slate-700" />

        {/* 뷰 전환 탭 */}
        <nav className="flex items-center gap-1">
          {viewTabs.map((tab, i) => (
            <button
              key={tab}
              className={`h-7 px-3 rounded text-xs font-medium transition-colors ${
                i === 0 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* 우측: 방법론 탭 + 데이터 기준 시점 칩 + 도움말 */}
      <div className="flex items-center gap-3">
        {/* 방법론 탭 (§3.3) */}
        <button className="h-7 px-3 rounded text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-700">
          방법론
        </button>

        <div className="w-px h-5 bg-slate-700" />

        {/* 데이터 기준 시점 칩 (§2.3, §3.3) — 자리 표시자, 실 데이터는 /freshness */}
        <div className="flex items-center gap-2 h-7 px-2.5 bg-slate-800/60 border border-dashed border-slate-700 rounded-md text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-slate-500 italic">[데이터 기준] 기준 · 다음 갱신 [날짜] 예정</span>
        </div>

        {/* 도움말 */}
        <button
          aria-label="도움말"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs"
        >
          ?
        </button>
      </div>
    </header>
  );
}

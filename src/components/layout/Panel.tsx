// frame 단계 — 패널 구조만 자리 표시자로. 실제 분석 수치·배지·판정 결과는
// feat/fe-panel 브랜치에서 API 응답으로 채움 (frame_spec_frontend_vN §8.6, web_plan_vN §6.1)

export function Panel() {
  // §6.3 — ML 판정 섹션은 항상 3개 모델 행으로 구성 (구조 정의)
  const mlModels = ['Isolation Forest', 'LOF', 'One-Class SVM'];

  // §6.1 — 4개 섹션 순서 고정 (구조 정의)
  const sections = [
    { title: '계량경제학 수치', body: 'metric-grid' as const },
    { title: 'ML 판정', body: 'ml-models' as const },
    { title: '패턴 판정 경로', body: 'judgment-path' as const },
    { title: 'IRF 차트', body: 'irf-chart' as const },
  ];

  return (
    <aside
      data-testid="panel"
      // §6.6 — 너비 드래그 조절 범위 280~520px. frame 기본값은 중앙값(~400px) 적용.
      // feat/fe-panel에서 좌측 경계 드래그 인터랙션 구현 시 panelStore.width와 연동
      style={{ width: '400px' }}
      className="shrink-0 bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden"
    >
      {/* §6.1 패널 헤더 — 구조만 (실 데이터는 feat/fe-panel) */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        {/* 1행: [품목] [구간] [시점]  [×] */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 italic">[품목]</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600 italic">[구간]</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600 italic">[시점]</span>
          </div>
          <button
            aria-label="패널 닫기"
            className="text-slate-500 hover:text-slate-300 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* 2행: [신뢰도] [패턴] [주/보조] [NEW] 배지 슬롯 */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {['신뢰도', '패턴', '주/보조', 'NEW'].map((slot) => (
            <span
              key={slot}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/60 text-slate-600 border border-dashed border-slate-700 italic"
            >
              {slot}
            </span>
          ))}
        </div>
      </div>

      {/* §6.1 섹션 4개 — 구조만. block + space-y로 자연 높이 유지, 부모만 스크롤 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden"
          >
            {/* 섹션 헤더: 제목 + 펼침 토글 (§6.6) */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30">
              <span className="text-slate-300 text-xs font-medium">§ {section.title}</span>
              <span className="text-slate-600 text-[10px]">▾</span>
            </div>

            {/* 섹션 본문 — 자리 표시자 */}
            {section.body === 'metric-grid' && (
              <div className="p-3">
                <div className="h-20 border border-dashed border-slate-700 rounded flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-600 text-[10px]">수치 그리드</span>
                    <span className="text-slate-700 text-[9px] font-mono">feat/fe-panel</span>
                  </div>
                </div>
              </div>
            )}

            {section.body === 'ml-models' && (
              <div className="p-3 flex flex-col gap-1.5">
                {mlModels.map((m) => (
                  <div
                    key={m}
                    className="flex items-center justify-between px-2 py-1.5 border border-dashed border-slate-700 rounded"
                  >
                    <span className="text-slate-500 text-[10px]">{m}</span>
                    <span className="text-slate-700 text-[9px] font-mono">feat/fe-panel</span>
                  </div>
                ))}
              </div>
            )}

            {section.body === 'judgment-path' && (
              <div className="p-3">
                <div className="h-16 border border-dashed border-slate-700 rounded flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-600 text-[10px]">Step-by-step 판정 흐름</span>
                    <span className="text-slate-700 text-[9px] font-mono">feat/fe-panel</span>
                  </div>
                </div>
              </div>
            )}

            {section.body === 'irf-chart' && (
              <div className="p-3">
                <div className="h-20 border border-dashed border-slate-700 rounded flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-600 text-[10px]">IRF 곡선 (D3.js)</span>
                    <span className="text-slate-700 text-[9px] font-mono">feat/fe-panel</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

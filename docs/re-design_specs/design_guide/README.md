# 디자인 변경 가이드

> **목적**: 현재 프론트엔드의 구성요소·기능·레이아웃은 그대로 두고 **시각 디자인만** 바꾸려는 작업자를 위한 완전 가이드.
> 작성일: 2026-05-21. 기준 코드 시점: commit `1935027`.

---

## 0. 사용 원칙

1. **불변**: HTML 구조(컴포넌트 tree), 상호작용 동작(클릭/줌/드래그/단축키), 라우터(`/`, `/methodology`), Zustand 슬라이스, API 응답 매핑 — 전부 그대로 둔다.
2. **가변**: Tailwind 클래스명, inline `style`, SVG attr 색상/굵기/마진/모서리/그림자/폰트, CSS keyframes, 토큰 정의 (`colorUtils.ts`).
3. **단일 변경**: 한 번에 한 토큰만 바꿔서 확인. 토큰 → 컴포넌트 → 특수 케이스 순서.
4. **금지**: 새 라이브러리(`@radix-ui`, `framer-motion` 등) 도입 금지. Tailwind + 직접 CSS keyframes로 해결 가능한 범위만.
5. **검증**: 변경 후 `npx tsc --noEmit && npx vitest run` 통과. `npm run dev`로 4개 페이지/탭(흐름·전달구조·원시·방법론) 직접 확인.
6. **박제 보존**: `docs/CLAUDE.md §StreamChart 설계 계약 rev.6` 정책은 디자인 변경으로도 깨면 안 됨. 특히 줌 동작 / Y축 viewport 동적 sync / 노드 X 정확 위치 / curveMonotoneX / area fill 금지 / 단일 라인 / warmup band 표시 / 펄스 CSS keyframes.

---

## 1. 적용 순서 (권장)

```
01_design_tokens     ← 먼저. 토큰만 바꿔도 절반 이상 바뀜
   ↓
02_layout            ← AppShell · Banner · Header · FilterBar
03_panel             ← 분석 수치 사이드 패널 + inline 차트 8종 공통
04_main_views        ← Stream · Scatter · RawPrices · Minimap (메인 4뷰)
05_methodology       ← 방법론 페이지 6섹션 + 파이프라인 다이어그램
06_modals_overlays   ← Help모달 · Onboarding · Floating ? · Toast · ErrorBoundary
   ↓
07_chart_palette     ← 차트 색상 통합 (PANEL_CHART_COLORS 8종 + 4 SoT)
08_states            ← loading · empty · error · disabled 4종 표준
09_motion_interaction ← hover · focus · transition · pulse · glow
```

---

## 2. 파일 인덱스

| 파일 | 다루는 영역 | 줄 수 (대략) |
|---|---|---|
| [`01_design_tokens.md`](./01_design_tokens.md) | color · typo · spacing · radius · shadow · motion · z-index | ~280 |
| [`02_layout.md`](./02_layout.md) | AppShell · Banner · Header · FilterBar · FreshnessChip | ~280 |
| [`03_panel.md`](./03_panel.md) | Panel 컨테이너 · 섹션 카드 · StatRow · MlBarRow · inline 차트 공통 | ~280 |
| [`04_main_views.md`](./04_main_views.md) | StreamChart · ScatterChart · RawPricesChart · Minimap | ~280 |
| [`05_methodology.md`](./05_methodology.md) | MethodologyView 6섹션 · PipelineFlowDiagram | ~250 |
| [`06_modals_overlays.md`](./06_modals_overlays.md) | HelpModal · OnboardingGuide · HelpFloatingButton · Toast · ErrorBoundary | ~280 |
| [`07_chart_palette.md`](./07_chart_palette.md) | `colorUtils.ts` 4 SoT · 8종 panel chart 색상 통합 | ~220 |
| [`08_states.md`](./08_states.md) | loading skeleton · empty · error · disabled 표준 | ~220 |
| [`09_motion_interaction.md`](./09_motion_interaction.md) | hover · focus · transition · pulse · drag handle | ~220 |

총 약 2500줄.

---

## 3. 변경 시 주의 사항

### 3.1 `colorUtils.ts` 변경
- `ANOMALY_COLORS`, `SEGMENT_COLORS_PRIMARY/SECONDARY`, `RAW_PRICE_COLORS`, `PANEL_CHART_COLORS` 는 SoT. 차트 컴포넌트는 전부 여기서 import.
- 색 값 바꿀 때 `feature_spec_fe-*_vN.md`의 §색상 항목과 정합 깨질 수 있음 → PM 검토 필요.

### 3.2 컴포넌트 className 변경
- 단일 className 한 줄에 10~15개 utility가 모여 있는 게 정상. 토큰 변경 시 grep으로 일괄 변경 가능.
- 예: `bg-slate-800` 전부 `bg-zinc-900`으로 → `grep -rn "bg-slate-800" src/`

### 3.3 D3 SVG attr 변경
- inline `cssText`로 박힌 tooltip 스타일 (StreamChart line 577, IRFChart line 124) — 8개 차트가 거의 동일하게 가짐. 공통 helper (`src/utils/chartTooltip.ts`)로 추출 권장.
- 축 색상 `#64748b` (slate-500) 모든 inline 차트 통일. 한 곳만 바꾸려면 전부 찾아서 수정.

### 3.4 z-index
- `src/utils/zIndex.ts` `Z_INDEX` 토큰 사용. 컴포넌트 직접 숫자 박지 말 것.
- 현재 위반: OnboardingGuide (8999/9000/9001), HelpModal (8000/8001), HelpFloatingButton (7000), StreamChart tooltip (9999) — 디자인 변경 기회에 토큰화 권장.

### 3.5 글꼴 변경
- Tailwind 기본 sans 사용 중. 다른 폰트 도입 시 `index.html` `<link>` + `tailwind.config.ts` `theme.extend.fontFamily` 추가.
- 한글 폰트는 시스템 의존이라 OS별 모양 다름. Pretendard, IBM Plex Sans KR 등 webfont 권장.

### 3.6 다크 → 라이트 모드 전환
- 현재 다크 모드 단일. 라이트 모드 도입 시 prefers-color-scheme 또는 `<html class="dark">` 토글 필요.
- 현 시점 권고: **다크 유지하되 톤·액센트만 정비**. 라이트 모드는 별 작업으로 분리.

---

## 4. 진단 요약 (현 디자인의 문제점)

토큰 통계 + 컴포넌트 스캔 기반.

| 항목 | 현 상태 | 진단 |
|---|---|---|
| Typography | `text-xs` 63회 / 그 외 합 ~80회 | 위계 평탄, 어디가 중요한지 모름 |
| Color | slate 9그레이드 + 액센트 산발 | brand color 없음, 무미건조 |
| Spacing | py-0.5/1.5 등 극협 | 답답, 정보 밀도 과다 |
| Radius | `rounded`(4)/`rounded-md`(6)/`rounded-lg`(8)/`rounded-xl`(12) 4종 혼재 | 컴포넌트별 규칙 없음 |
| Shadow | 모달·드롭다운·플로팅만 있음 | 카드/패널 flat → 깊이감 빈약 |
| Buttons | 전부 flat 사각 + bg | primary/secondary/ghost 구분 없음 |
| State viz | 텍스트 + opacity만 | empty/loading/error illustration 없음 |
| Chart palette | d3 default (`#1f77b4` 등) 섞임 | UI brand와 분리됨 |
| Font | 시스템 sans | brand font 없음 |
| Motion | `transition-colors`만 99% | UI 전반 정적 |
| z-index | 토큰 있지만 일부 inline 숫자 | 정합 깨짐 |

이 가이드는 각 항목별로 **현 코드의 정확한 위치**와 **무엇을 어떻게 바꿀지** 안내한다.

---

## 5. 가이드 외 — 디자이너에게

코드 모르는 디자이너가 이 가이드를 받았다면:
- `01_design_tokens.md`에서 색상/타이포/spacing 후보값을 정하면 됨. 나머지는 개발자가 그 값으로 일괄 치환.
- 컴포넌트별 시각 mockup이 필요하면 `02`~`06` 파일에 있는 "현재 className" 부분을 Figma 등에 옮기고 변형하면 됨.
- 차트 색상 후보는 `07_chart_palette.md`에 통합 제안.

---

*변경 이력은 git commit으로만 추적. 이 가이드 자체는 살아있는 문서로 유지.*

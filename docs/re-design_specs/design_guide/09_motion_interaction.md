# 09. Motion & Interaction (hover · focus · transition · pulse · drag)

> 현재 UI의 99%가 `transition-colors`만 적용. 인터랙션 모션이 거의 부재.
> 적은 비용으로 큰 인지 개선 가능한 영역. JS 애니메이션 lib 도입 금지 (CSS keyframes + Tailwind만).

---

## 1. Hover 표준

### 1.1 현재 패턴

| 컴포넌트 | hover 변화 |
|---|---|
| 일반 버튼 | `hover:bg-slate-700` 또는 `hover:text-slate-200` (text only) |
| 드롭다운 항목 | `hover:bg-slate-700` |
| 카드 (Methodology) | hover 효과 없음 |
| 드래그 핸들 | `hover:bg-slate-500/40` |
| 차트 노드 | d3 `mouseenter/leave`로 r 1.4배 확대 |
| 차트 line | hover 없음 |

### 1.2 권장 hover 표준

**A. 일반 버튼** (`h-7~9 px-3~5`):
```tsx
className="
  bg-slate-800 text-slate-300
  hover:bg-slate-700 hover:text-slate-100
  active:bg-slate-700 active:scale-[0.98]
  transition-all duration-150
"
```
- 배경 + 텍스트 색 둘 다 변화.
- active 시 미세 축소 (`scale-[0.98]`) — 클릭 피드백.
- duration 150ms (motion-fast).

**B. Primary CTA** (brand 색):
```tsx
className="
  bg-[var(--brand-primary)] text-white
  hover:bg-[var(--brand-primary-hover)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/30
  active:scale-[0.98]
  transition-all duration-200
  shadow-md shadow-[var(--brand-primary)]/20
"
```
- hover 시 그림자 강화 + 색 그림자.
- duration 200ms.

**C. Ghost 버튼** (텍스트만):
```tsx
className="
  text-slate-400
  hover:text-slate-100 hover:bg-slate-800/60
  active:bg-slate-800
  transition-colors duration-150
  rounded-md px-2 py-1
"
```

**D. 카드 (선택 가능)**:
```tsx
className="
  bg-slate-900/60 border border-slate-800
  hover:border-slate-700 hover:bg-slate-900/80
  hover:shadow-md hover:translate-y-[-1px]
  transition-all duration-200
  cursor-pointer
"
```
- 보더 + 배경 + 미세 그림자 + 위로 살짝 떠오름.

**E. 카드 (정보 표시만, 클릭 없음)**:
- hover 효과 없음. cursor default.

**F. 차트 노드** (d3 d3 attr 변경):
```ts
// 현재
d3.select(this).attr('r', r * 1.4);

// 권장: transition + stroke 추가
d3.select(this)
  .transition().duration(150).ease(d3.easeCubicOut)
  .attr('r', r * 1.4)
  .attr('stroke-width', 2)
  .attr('stroke', '#ffffff80');
```
- 부드러운 r 변화.
- 흰색 outline으로 시각 강조.

---

## 2. Focus 표준 (키보드 접근성)

### 2.1 현재
- Tailwind 기본 `focus:outline` 자동 적용.
- 명시적 focus 스타일 없음.

### 2.2 권장

```tsx
className="
  ...
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
"
```

- `focus-visible` 사용 — 키보드 탭으로만 표시 (마우스 클릭 시 X).
- `ring-2` (2px outline).
- `ring-offset` 으로 border와 분리.
- brand 색 ring.

### 2.3 적용 우선순위

| 컴포넌트 | focus ring 적용 |
|---|---|
| 모든 버튼 | ✓ |
| 입력 필드 | ✓ (입력은 거의 없음) |
| 토글 / 체크박스 | ✓ |
| 링크 / 클릭 가능 카드 | ✓ |
| 드롭다운 토글 | ✓ |
| 슬라이더 thumb | ✓ (`:focus-visible` 별도 CSS) |
| 차트 노드 (SVG circle) | △ — d3에서 tabindex + stroke 추가 |

### 2.4 차트 노드 키보드 접근

```ts
// d3 노드 생성 시
.attr('tabindex', 0)
.attr('role', 'button')
.attr('aria-label', `이상 탐지: ${period} ${grade}`)
.on('focus', function() {
  d3.select(this).attr('stroke', '#5b8cff').attr('stroke-width', 2);
})
.on('blur', function() {
  d3.select(this).attr('stroke', null).attr('stroke-width', 0);
});
```

---

## 3. Transition Duration & Easing

### 3.1 표준

```css
/* index.css 또는 별도 motion.css */
:root {
  --motion-instant: 0ms;
  --motion-fast: 100ms;          /* hover */
  --motion-default: 200ms;       /* 일반 전환 */
  --motion-emph: 300ms;          /* 패널 열림 등 */
  --motion-slow: 500ms;          /* 강조 진입 */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emph: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

Tailwind 클래스 매핑:
- `duration-100` → motion-fast
- `duration-200` → motion-default
- `duration-300` → motion-emph
- `duration-500` → motion-slow

### 3.2 사용 가이드

| 상황 | duration | easing |
|---|---|---|
| 색 hover | 100~150ms | ease-out |
| 배경 hover | 150~200ms | ease-out |
| transform (scale, translate) | 200~250ms | ease-out |
| 모달 진입 | 250ms | ease-emph |
| 모달 퇴장 | 150ms | ease-in |
| 드롭다운 열림 | 200ms | ease-out |
| 패널 폭 변경 (drag) | 즉시 (transition X) | — |
| 차트 데이터 전환 | 800ms | ease-out (이미 사용 중) |

**박제 보존**: StreamChart 줌 후 transition 금지 (CLAUDE.md).

---

## 4. Pulse / Glow (강조 모션)

### 4.1 현재

```css
/* StreamChart high-grade anomaly */
@keyframes anomaly-pulse {
  0%   { r: var(--pulse-min, 8px);  opacity: 0.35; }
  50%  { r: var(--pulse-max, 12px); opacity: 0.10; }
  100% { r: var(--pulse-min, 8px);  opacity: 0.35; }
}
.anomaly-pulse-high {
  animation: anomaly-pulse 1.6s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
```

`Tailwind animate-pulse` (skeleton에 사용) — opacity 0.5↔1 1초 무한.
`Tailwind animate-ping` (사용 X) — scale + opacity, ripple 효과.

### 4.2 권장 추가 패턴

**A. Live data indicator** (FreshnessChip):
```css
@keyframes live-dot {
  0%, 100% { box-shadow: 0 0 0 0 currentColor; }
  50%      { box-shadow: 0 0 0 4px transparent; }
}
.live-indicator {
  animation: live-dot 2s ease-in-out infinite;
  color: var(--semantic-success);
}
```
- 점에서 ring이 퍼지는 효과 — "라이브 데이터" 신호.

**B. Onboarding spotlight**:
```css
@keyframes onboarding-pulse {
  0%, 100% { outline-color: rgba(91, 140, 255, 1); outline-width: 2.5px; }
  50%      { outline-color: rgba(91, 140, 255, 0.6); outline-width: 4px; }
}
```
- (`06_modals_overlays.md §2.3` 참고)

**C. Anomaly node glow** (현 `filter: blur` + opacity):
```css
@keyframes anomaly-glow-pulse {
  0%, 100% { opacity: 0.35; filter: blur(3px); }
  50%      { opacity: 0.55; filter: blur(5px); }
}
.anomaly-glow-high {
  animation: anomaly-glow-pulse 1.6s ease-in-out infinite;
}
```

**D. NEW 배지 깜빡임** (선택, 과하면 노이즈):
```css
@keyframes new-badge-blink {
  0%, 70%, 100% { opacity: 1; }
  85%           { opacity: 0.5; }
}
.new-badge {
  animation: new-badge-blink 2s ease-in-out infinite;
}
```
권장하지 않음 — 깜빡임은 인지 부하. 현 정적 색 유지.

### 4.3 모션 끄기 (Accessibility)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

이 미디어 쿼리 `index.css` 마지막에 추가. 사용자 OS 설정 따라 모션 비활성.

**예외**:
- anomaly pulse 유지 (시각 정보 hint) — `@media (prefers-reduced-motion: reduce) { .anomaly-pulse-high { animation: none; } }` 별도 처리.

---

## 5. Drag Interactions

### 5.1 Panel DragHandle (현재)

```tsx
<div onMouseDown={onMouseDown}
     className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-500/40 transition-colors" />
```

### 5.2 권장 변경

```tsx
<div onMouseDown={onMouseDown}
     className="
       absolute left-0 top-0 bottom-0 w-[3px]
       cursor-col-resize group
       transition-colors duration-150
       hover:bg-[var(--brand-primary)]/30
       active:bg-[var(--brand-primary)]/60
     ">
  {/* 호버 시 시각적 hint */}
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                  w-1 h-12 rounded-full bg-slate-700 group-hover:bg-[var(--brand-primary)]
                  transition-colors opacity-0 group-hover:opacity-100" />
</div>
```
- hover 시 핸들 위치에 작은 막대 표시 (drag 가능 hint).
- active(dragging) 시 더 진한 색.

### 5.3 Drag 중 cursor 전체 적용

drag 시작 시 document.body cursor 변경 — 핸들 밖으로 마우스 이동해도 유지:
```ts
const onMouseDown = useCallback((e: React.MouseEvent) => {
  isDragging.current = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const onMouseMove = ...;
  const onMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // ...
  };
  // ...
}, []);
```

---

## 6. Scroll / Overflow 모션

### 6.1 부드러운 스크롤

`<main>` (AppShell의 `overflow-auto`) + Panel 본문 (`overflow-y-auto`) 모두:
```css
html, .scroll-smooth {
  scroll-behavior: smooth;
}
```
또는 컨테이너에 `scroll-smooth` Tailwind 클래스.

### 6.2 스크롤바 디자인

기본 스크롤바는 OS 의존. 다크 모드 일관성 위해 커스텀:
```css
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.4);  /* slate-500 / 40% */
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.6);
  background-clip: content-box;
}
```

Firefox: `scrollbar-width: thin; scrollbar-color: rgba(100,116,139,0.4) transparent;`

---

## 7. Reduced Data (느린 네트워크 대응)

본 가이드 범위 외. 추후 검토.

---

## 8. 키보드 단축키 (현재 일부 구현)

- `Esc`: HelpModal 닫기, 드롭다운 닫기. **OnboardingGuide 미구현** → 추가 권장 (`06 §6.3` 참고).
- 화살표 키: 차트 노드 간 이동 (현 미구현). 향후 검토.

키보드 단축키 표는 HelpModal 마지막 항목에 추가 권장:
```ts
{
  title: '키보드 단축키',
  content: 'Esc: 모달/온보딩 닫기\n탭: 다음 요소로 포커스\nEnter/Space: 선택된 버튼 활성',
}
```

---

## 9. 인터랙션 상태 시각화 요약 표

| 상태 | 시각 단서 | 모션 |
|---|---|---|
| Default | 기본 색 | (없음) |
| Hover | 색 + (옵션) scale / shadow | 150ms ease-out |
| Focus (keyboard) | brand ring 2px | (없음, 즉시) |
| Active (pressing) | 어두운 색 + scale 98% | 100ms |
| Disabled | 어두운 배경 + slate-600 텍스트 | (없음) |
| Loading (in element) | 스피너 / 점 3개 | 1~2s 무한 |
| Selected | brand 배경 + 보더 | 200ms ease-out |
| Drag (active) | brand 색 핸들 | (color transition) |

---

## 10. 변경 체크리스트

- [ ] `:root` CSS 변수에 motion duration·easing 정의
- [ ] 모든 버튼 hover에 `transition-all duration-150 active:scale-[0.98]`
- [ ] Primary CTA brand 색 + 색 그림자 hover 효과
- [ ] focus-visible ring 일괄 적용 (모든 인터랙티브)
- [ ] 차트 노드 d3 transition 부드럽게 (150ms)
- [ ] 차트 노드 tabindex + ARIA 추가
- [ ] FreshnessChip dot 펄스 (live-indicator)
- [ ] anomaly node glow 펄스 강화
- [ ] OnboardingGuide spotlight 펄스
- [ ] `prefers-reduced-motion` 미디어 쿼리 적용
- [ ] DragHandle hover hint 추가
- [ ] Drag 중 document.body cursor 전체 적용
- [ ] 커스텀 스크롤바 적용
- [ ] OnboardingGuide Esc 키 닫기

---

*이상 가이드 끝. 우선순위는 `README.md §1` 참고.*

# 06. Modals · Overlays · Floating UI · Toast · ErrorBoundary

> 화면 위에 떠 있는 UI 5종. z-index 정합 + backdrop + 모션이 핵심.

참고: [`01_design_tokens.md §7 z-index`](./01_design_tokens.md#7-z-index)

---

## 1. HelpModal — `src/components/layout/HelpModal.tsx`

### 1.1 현재 구조

```tsx
<>
  {/* 배경 오버레이 */}
  <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.5)' }}
       onClick={onClose} />

  {/* 모달 본문 컨테이너 */}
  <div style={{ position: 'fixed', inset: 0, zIndex: 8001, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '16px',
                pointerEvents: 'none' }}>
    <div style={{ pointerEvents: 'auto', maxHeight: '80vh' }}
         className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
         onClick={(e) => e.stopPropagation()}>

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
        <h2 className="text-white font-semibold text-sm">도움말</h2>
        <button className="text-slate-400 hover:text-white transition-colors text-lg leading-none">✕</button>
      </div>

      {/* 아코디언 목록 */}
      <div className="overflow-y-auto flex-1 px-3 py-2">
        {HELP_ITEMS.map((item, index) => (
          <div className="border-b border-slate-700/50 last:border-0">
            <button className="w-full flex items-center justify-between px-2 py-3 text-left hover:bg-slate-700/30 rounded transition-colors">
              <span className="text-slate-200 text-sm font-medium">{item.title}</span>
              <span className="text-slate-400 text-xs ml-2 shrink-0 transition-transform"
                    style={{ transform: ... }}>▾</span>
            </button>
            {expandedItems.has(index) && (
              <div className="px-2 pb-3">
                <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">{item.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
</>
```

### 1.2 분석
- z-index 직접 박힘 (8000, 8001). `Z_INDEX.MODAL` 토큰 사용 X.
- 오버레이 `rgba(0,0,0,0.5)` — 다크 모드에선 너무 약함. 모달이 배경과 충분히 분리 안 됨.
- 모달 너비 `max-w-lg` (512px) — 텍스트 컨텐츠 위주라 적절.
- 헤더 `text-sm` 작음. 모달 타이틀로는 위계 약함.
- 아코디언 화살표 `▾` 텍스트.
- 본문 텍스트 `text-xs` (12px) — 도움말 읽기엔 약간 작음.

### 1.3 권장 변경

**z-index 토큰화**:
```tsx
import { Z_INDEX } from '@/utils/zIndex';

<div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.MODAL_OVERLAY, ... }} />
<div style={{ ..., zIndex: Z_INDEX.MODAL_CONTENT, ... }} />
```

**오버레이 강화**:
```tsx
<div className="fixed inset-0 bg-black/70 backdrop-blur-sm motion-fade-in" style={{ zIndex: Z_INDEX.MODAL_OVERLAY }} onClick={onClose} />
```
- `rgba(0,0,0,0.5)` → `bg-black/70` (70% — 다크 배경 위에서도 분리됨).
- `backdrop-blur-sm` 추가 — 뒤가 흐려져 집중도 ↑.
- fade-in 모션 (`01 §6.2`).

**모달 본체**:
```tsx
<div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-2xl flex flex-col motion-scale-in"
     style={{ pointerEvents: 'auto', maxHeight: '85vh' }}
     onClick={(e) => e.stopPropagation()}>
```
- 배경 `bg-slate-800` → `bg-slate-900`. 더 깊은 톤.
- 보더 `border-slate-600` → `border-slate-700`.
- radius `rounded-xl` (12) → `rounded-2xl` (16). 모달은 큰 radius.
- 그림자 `shadow-2xl shadow-black/60` (색 그림자로 강화).
- 폭 `max-w-lg` → `max-w-2xl` (672px). 텍스트 가독성 ↑.
- 높이 `80vh` → `85vh`.
- `motion-scale-in` 진입 모션.

**헤더**:
```tsx
<div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
  <div>
    <h2 className="text-slate-50 text-lg font-bold tracking-tight">도움말</h2>
    <p className="text-slate-400 text-xs mt-0.5">서비스 사용 안내</p>
  </div>
  <button className="text-slate-500 hover:text-slate-100 hover:bg-slate-800 transition-colors w-9 h-9 flex items-center justify-center rounded-lg">
    <svg className="w-4 h-4"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
  </button>
</div>
```
- 타이틀 `text-sm` → `text-lg font-bold`.
- 서브타이틀 추가.
- 닫기 ✕ → SVG icon + hover 배경.
- padding `px-5 py-4` → `px-6 py-5`.

**아코디언 항목**:
```tsx
<div className="border-b border-slate-800 last:border-0">
  <button className="w-full flex items-center justify-between px-3 py-4 text-left hover:bg-slate-800/60 transition-colors group">
    <span className="text-slate-100 text-sm font-medium">{item.title}</span>
    <svg className={`w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`} ...>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  </button>
  {expanded && (
    <div className="px-3 pb-5 pt-1">
      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
    </div>
  )}
</div>
```
- 본문 `text-xs text-slate-400` → `text-sm text-slate-300`.
- 화살표 `▾` → SVG chevron.
- padding `py-3` → `py-4`.

---

## 2. OnboardingGuide — `src/components/layout/OnboardingGuide.tsx`

### 2.1 현재 (스포트라이트 + 툴팁)

```tsx
{/* 배경 (스포트라이트 컷아웃 외 어둡게) */}
<div style={{ position: 'fixed', inset: 0, zIndex: 8999 }} onClick={...} />

{/* 스포트라이트 */}
<div style={{
  position: 'fixed',
  left: spotX, top: spotY, width: spotW, height: spotH,
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
  borderRadius: 4,
  outline: '2px solid rgb(34, 211, 238)',  // cyan-400
  outlineOffset: 2,
  zIndex: 9000,
  pointerEvents: 'none',
}} />

{/* 툴팁 */}
<div style={{ position: 'fixed', left: ..., top: ..., width: 340, zIndex: 9001 }}
     className="bg-slate-800 text-white rounded-lg p-4 shadow-xl border border-slate-600"
     onClick={(e) => e.stopPropagation()}>
  <p className="text-sm leading-relaxed mb-4">{STEP_TEXT[step - 1]}</p>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {step > 1 && (
        <button className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors">이전</button>
      )}
      <span className="text-xs text-slate-400 select-none">{step}/4</span>
      <button className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded transition-colors">{step < 4 ? '다음' : '완료'}</button>
    </div>
    <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors">스킵</button>
  </div>
</div>
```

### 2.2 분석
- z-index 직접 박힘 (8999/9000/9001).
- 스포트라이트 outline cyan-400 — 명확한 강조.
- `boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)'` — 컷아웃 외 60% 어둡게.
- 툴팁 width 340px 고정. 모바일에선 좁아질 수 있음.
- CTA `bg-cyan-600 hover:bg-cyan-500` — brand color (다른 곳에 안 쓰임).

### 2.3 권장 변경

**z-index 토큰화**:
```ts
ONBOARDING_OVERLAY: 8500,
ONBOARDING_SPOTLIGHT: 8501,
ONBOARDING_TOOLTIP: 8502,
```

**스포트라이트 outline 색**:
- `cyan-400` (`rgb(34, 211, 238)`) → `var(--brand-primary)` (`#5b8cff`) 또는 brand 일관 색.
- outline 굵기 `2px` → `2.5px`.

**스포트라이트 펄스 모션** 추가:
```css
@keyframes onboarding-pulse {
  0%, 100% { outline-color: rgba(91, 140, 255, 1); outline-width: 2.5px; }
  50%      { outline-color: rgba(91, 140, 255, 0.7); outline-width: 4px; }
}
.onboarding-spotlight {
  animation: onboarding-pulse 1.8s ease-in-out infinite;
}
```

**툴팁 디자인**:
```tsx
<div className="bg-slate-900/95 backdrop-blur text-white rounded-xl p-5 shadow-2xl shadow-black/60 border border-slate-700 motion-slide-up"
     style={{ position: 'fixed', left: ..., top: ..., width: 360, zIndex: Z_INDEX.ONBOARDING_TOOLTIP }}>

  {/* step 번호 + 진행 표시 */}
  <div className="flex items-center justify-between mb-3">
    <span className="text-[var(--brand-primary)] text-xs font-bold uppercase tracking-wider">단계 {step}/4</span>
    <div className="flex gap-1">
      {[1,2,3,4].map((s) => (
        <span key={s} className={`w-6 h-1 rounded-full ${s <= step ? 'bg-[var(--brand-primary)]' : 'bg-slate-700'}`} />
      ))}
    </div>
  </div>

  {/* 메인 텍스트 */}
  <p className="text-slate-100 text-sm leading-relaxed mb-5">{STEP_TEXT[step - 1]}</p>

  {/* 버튼 영역 */}
  <div className="flex items-center justify-between gap-2">
    <button className="text-slate-400 hover:text-slate-200 text-xs transition-colors">건너뛰기</button>
    <div className="flex items-center gap-2">
      {step > 1 && (
        <button className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors">
          이전
        </button>
      )}
      <button className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-lg transition-colors shadow-md shadow-[var(--brand-primary)]/30">
        {step < 4 ? '다음' : '완료'}
      </button>
    </div>
  </div>
</div>
```

핵심:
- 폭 340 → 360.
- 배경 `bg-slate-800` → `bg-slate-900/95 backdrop-blur`.
- radius `rounded-lg` → `rounded-xl`.
- 그림자 강화.
- 단계 진행 표시 (4개 막대) — 직관적 진행 hint.
- 단계 번호 brand 색으로 강조.
- "스킵" 텍스트 → "건너뛰기" 좌측 / "이전"·"다음" 우측 그룹화.
- CTA 그림자 + 색 그림자.

---

## 3. HelpFloatingButton — `src/components/layout/HelpFloatingButton.tsx`

### 3.1 현재

```tsx
<button
  style={{
    position: 'fixed',
    right: 24, bottom: 24,
    zIndex: 7000,
    width: 48, height: 48,
    borderRadius: '50%',
  }}
  className="bg-slate-800 text-white shadow-lg border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-colors flex items-center justify-center text-base font-medium">
  ?
</button>
```

### 3.2 분석
- 우하단 24px offset, 48×48 원형.
- 텍스트 ?만. icon 없음.

### 3.3 권장 변경

```tsx
<button
  style={{ position: 'fixed', right: 24, bottom: 24, zIndex: Z_INDEX.OVERLAY }}
  className="group w-12 h-12 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-lg shadow-[var(--brand-primary)]/40 hover:shadow-xl hover:shadow-[var(--brand-primary)]/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
  aria-label="도움말 열기">
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</button>
```

핵심:
- 색 `bg-slate-800` → `bg-[var(--brand-primary)]`. brand CTA로.
- 그림자 색 그림자 (brand 색 glow).
- hover 시 scale 105% + 그림자 강화.
- active scale 95% (눌림 피드백).
- 텍스트 `?` → 명확한 SVG icon (help/question circle).

---

## 4. Toast — `src/components/ui/Toast.tsx`

### 4.1 현재

```tsx
<div className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none" style={{ zIndex: Z_INDEX.TOAST }}>
  {toasts.map((toast) => (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm w-full pointer-events-auto ${
      toast.variant === 'error' ? 'bg-red-700 text-white'
        : toast.variant === 'warning' ? 'bg-yellow-600 text-white'
        : 'bg-slate-700 text-white'
    }`}>
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      {toast.onRetry && (
        <button className="shrink-0 text-sm font-semibold underline whitespace-nowrap">재시도</button>
      )}
      <button className="shrink-0 text-sm opacity-70 hover:opacity-100">✕</button>
    </div>
  ))}
</div>
```

### 4.2 분석
- 우하단 위치 + 위로 스택.
- 3 variant: error/warning/info (slate).
- 단순 solid 배경.
- 닫기 ✕ 텍스트.

### 4.3 권장 변경

```tsx
<div className="fixed bottom-6 right-6 flex flex-col gap-3 pointer-events-none" style={{ zIndex: Z_INDEX.TOAST }}>
  {toasts.map((toast) => {
    const variantClass = {
      error: 'bg-red-500/10 border-red-500/40 text-red-200',
      warning: 'bg-amber-500/10 border-amber-500/40 text-amber-200',
      info: 'bg-slate-800/95 border-slate-700 text-slate-100',
    }[toast.variant];
    const iconColor = {
      error: 'text-red-400',
      warning: 'text-amber-400',
      info: 'text-slate-400',
    }[toast.variant];
    return (
      <div key={toast.id}
           role="alert"
           className={`flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-xl shadow-black/40 backdrop-blur border max-w-sm w-full pointer-events-auto motion-slide-up ${variantClass}`}>
        <svg className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} ...>
          {/* variant별 icon: error=×, warning=!, info=i */}
        </svg>
        <p className="flex-1 text-sm leading-snug font-medium">{toast.message}</p>
        {toast.onRetry && (
          <button onClick={toast.onRetry}
                  className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
            재시도
          </button>
        )}
        <button onClick={() => dispatch({ type: 'DISMISS', id: toast.id })}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition-all">
          <svg className="w-3.5 h-3.5"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
      </div>
    );
  })}
</div>
```

핵심:
- 위치 `bottom-4 right-4` → `bottom-6 right-6`.
- gap `gap-2` → `gap-3`.
- 배경 solid → 반투명 + `backdrop-blur` + border.
- radius `rounded-lg` → `rounded-xl`.
- 그림자 색 그림자 (`shadow-black/40`).
- variant별 아이콘 추가.
- 재시도 버튼 underline → 카드형 (`bg-white/10 rounded-md`).
- 닫기 ✕ → SVG + hover bg.
- 진입 모션 `motion-slide-up`.

---

## 5. ErrorBoundary fallback — `src/components/ui/ErrorBoundary.tsx`

### 5.1 현재

```tsx
<div className="flex items-center justify-center h-full text-slate-400 p-8">
  <p>오류가 발생했습니다. 페이지를 새로고침 해주세요.</p>
</div>
```

### 5.2 권장 변경

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
    <svg className="w-8 h-8 text-red-400" ...>
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
  <div className="flex flex-col gap-1.5">
    <h2 className="text-slate-100 text-base font-semibold">예기치 못한 오류가 발생했습니다</h2>
    <p className="text-slate-400 text-sm leading-relaxed max-w-md">
      페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
      문제가 계속되면 관리자에게 문의하세요.
    </p>
  </div>
  <button onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold rounded-lg shadow-md shadow-[var(--brand-primary)]/30 transition-all">
    페이지 새로고침
  </button>
</div>
```

핵심:
- 단일 텍스트 → 아이콘 + 타이틀 + 본문 + CTA 4단계 구성.
- 아이콘은 red-400 경고 삼각형.
- 새로고침 버튼 추가 (사용자가 직접 새로고침 안 해도 됨).
- max-w-md로 텍스트 폭 제한.

---

## 6. 모달·모션 공통 표준

### 6.1 진입/퇴장 모션

```css
/* index.css */
@keyframes modal-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes modal-content-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-overlay { animation: modal-overlay-in 200ms ease-out; }
.modal-content { animation: modal-content-in 250ms cubic-bezier(0.2, 0.8, 0.2, 1); }
```

### 6.2 배경 dimming 표준

| 컴포넌트 | 권장 |
|---|---|
| HelpModal | `bg-black/70 backdrop-blur-sm` |
| OnboardingGuide | `boxShadow 0 0 0 9999px rgba(0,0,0,0.75)` (현 60% → 75%) |
| 일반 dropdown | (오버레이 없음, click outside만) |
| 차트 hover tooltip | (오버레이 없음) |

### 6.3 닫기 인터랙션

| 컴포넌트 | 닫기 트리거 |
|---|---|
| HelpModal | ✕ 버튼 / Esc 키 / 오버레이 클릭 |
| OnboardingGuide | ✕ 또는 "건너뛰기" / Esc (현재 X) / 오버레이 (스포트라이트 외) |
| Toast | ✕ / 8초 자동 dismiss |
| Dropdown | click outside / Esc / 다른 항목 선택 |

**개선 권고**: OnboardingGuide에 Esc 키 닫기 추가:
```tsx
useEffect(() => {
  if (!isOnboardingVisible) return;
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') completeOnboarding(); };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isOnboardingVisible, completeOnboarding]);
```

---

## 7. 변경 체크리스트

- [ ] HelpModal z-index `Z_INDEX.MODAL_*` 토큰 사용
- [ ] HelpModal 오버레이 `bg-black/70 backdrop-blur-sm`
- [ ] HelpModal max-w `lg` → `2xl` 폭 확장
- [ ] HelpModal 타이틀 위계 (lg + 서브타이틀)
- [ ] HelpModal 아코디언 화살표 SVG + 본문 text-sm
- [ ] OnboardingGuide z-index 토큰 (ONBOARDING_*) 추가
- [ ] OnboardingGuide outline 색 brand 통일
- [ ] OnboardingGuide 스포트라이트 펄스 모션
- [ ] OnboardingGuide 툴팁 진행 막대 표시
- [ ] OnboardingGuide Esc 키 닫기
- [ ] HelpFloatingButton brand 색 + glow + hover scale
- [ ] HelpFloatingButton 텍스트 ? → SVG icon
- [ ] Toast 반투명 + backdrop-blur + variant 아이콘
- [ ] Toast 재시도 카드형 버튼
- [ ] ErrorBoundary 아이콘 + 본문 + 새로고침 CTA
- [ ] 모달·toast 진입 모션 keyframes 정의 + 적용

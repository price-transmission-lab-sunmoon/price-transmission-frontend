# Feature 명세서 — 온보딩 가이드 및 상시 도움말

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-onboarding`
**담당자**: 하대수
**작성일**: 2026-05-06
**상태**: 초안

**변경 이력**
- v1 (2026-05-06): 최초 작성
- v2 (2026-05-10): `plan_feature_specs_alignment_v1.md` 감사 결과 반영 — **구조적 재작성**
  - **P0 ①**: **localStorage 전면 제거** — `frame_spec_frontend_vN §8.10` / CLAUDE.md §15.1 / `feature_dev_list_vN §feat/fe-onboarding` "Zustand 세션 상태로 관리. localStorage 사용 금지" 절대 금지 위반. 모든 영속 저장 로직을 Zustand `isOnboardingVisible` + `hasSeenOnboardingThisSession`로 교체. **새로고침 시 온보딩이 다시 시작됨** (세션 단위 관리)
  - **P0 ②**: 고신뢰 노드 부재 시 `selectedAnomalyId === null` 분기 삭제 — `web_plan_vN §9` + CLAUDE.md §16 "자동 선택: 가장 최근 고신뢰 이상 노드 + 패널 자동 오픈" SoT가 자동 선택 보장. 1단계 항상 실행 가능
  - **P0 ③**: 헤더 `기능 번호: FE-ONBOARD` 제거
  - **P0 ④**: 참조 문서 `feature_spec_FE-STREAM_v1.md` → `feature_spec_fe-stream-chart_vN.md`, `feature_spec_FE-PANEL_v1.md` → `feature_spec_fe-panel_vN.md`
  - **P1 ⑤**: 상시 도움말 "?" 버튼 위치 PM 별건 격상 (web_plan §9.2 우하단 vs Header)
  - **P1 ⑥**: `FE-D3-003` 미매핑 → `FE-STORE-001` (exception_spec_vN §8 매핑)로 일원화
  - **P1 ⑦**: setter명 `setOnboardingVisible` / `setIsOnboardingVisible` 혼용 → `setOnboardingVisible` 통일
  - **P3 ⑩**: §3.3 ④ 코드 스니펫 localStorage 분기 → Zustand 분기로 치환

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `web_plan_vN.md §9, §9.1, §9.2` | 최신(`docs_manifest.md` 조회) | 온보딩 4단계 안내 텍스트·상시 도움말 항목 11종 원문·"?" 버튼 위치 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·`feat/fe-onboarding` 매핑 = `FE-STORE-001` |  ☐ |
| `frame_spec_frontend_vN.md §2, §6.2, §8.10` | 최신(`docs_manifest.md` 조회) | 디렉토리·OverlayState SoT·**localStorage 절대 금지 원칙** | ☐ |
| `feature_dev_list_vN.md §feat/fe-onboarding` | 최신(`docs_manifest.md` 조회) | "Zustand 세션 상태로 관리. localStorage 사용 금지" 명시 | ☐ |
| CLAUDE.md `frontend repo` §15-1, §16 | 최신 | 절대 금지 사항·온보딩 자동 선택 정책 SoT | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | 상시 도움말 "?" 버튼 위치 | `web_plan_vN §9.2`: "화면 우하단 고정 위치 '?' 버튼" / 본 명세 v1: "Header '?' 버튼" | **web_plan §9.2 채택** (우하단 고정 floating button). PM 결재 후 Header 위치라면 fe-layout-filter v4 Header 명세에 추가 필요 |
| 2 | 자동 선택 정책 명문화 위치 | fe-stream-chart v2 §3.3 자동 진입 동작 vs fe-panel v2 — 어느 쪽이 자동 선택 책임 | **fe-stream-chart v2 채택** (이미 §3.3 자동 진입 동작 명세). 본 feat는 자동 선택 결과를 전제로 함 |
| 3 | 새로고침 후 온보딩 재시작 | localStorage 금지로 새로고침 시 매번 온보딩 표시됨 | **세션 단위 채택** — 다음 세션 진입 시 다시 표시. 이는 사용자가 명시적으로 도움말 모달 "다시 보기"를 누르지 않아도 같은 효과. PM 이견 시 새로운 메커니즘(서버 사이드 사용자 환경설정 API 등) 별도 명세 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

세션 최초 진입 시 실제 화면 위에서 4단계 스포트라이트 가이드를 실행하고, 같은 세션 내 재진입(탭 전환·라우트 이동)에서는 스킵하며, 우하단 "?" 도움말 버튼(PM 별건 #1)에서 11개 항목 모달을 제공한다.

### 1.2 데이터 흐름

```
앱 마운트 (activeTab === 'stream', 세션 시작)
  → useAppStore.hasSeenOnboardingThisSession === false (초기값)
  → fe-stream-chart 자동 진입 동작에 의해 selectedAnomalyId 자동 설정 (CLAUDE.md §16 SoT)
  → useAppStore.setOnboardingVisible(true)
  → OnboardingGuide.tsx 표시

4단계 진행 (로컬 state: step 1→2→3→4→완료)
  → 1단계: 자동 선택된 이상 노드 DOM 요소 스포트라이트 + 툴팁
  → 2단계: 계량경제학 수치 섹션 스포트라이트
  → 3단계: ML 판정 섹션 스포트라이트
  → 4단계: 방법론 탭 (Header) 스포트라이트
  → 완료: useAppStore.setOnboardingVisible(false) + setHasSeenOnboardingThisSession(true)

세션 내 재진입 (탭 전환·라우트 이동·동일 세션 내 마운트 재발생)
  → hasSeenOnboardingThisSession === true → 온보딩 시작 스킵

새 세션 진입 (페이지 새로고침·새 탭)
  → hasSeenOnboardingThisSession === false (Zustand 메모리 초기화)
  → 온보딩 다시 표시 (PM 별건 #3 — 의도된 동작)

"?" 버튼 클릭 (우하단 floating, PM 별건 #1)
  → HelpModal.tsx 열림 (로컬 state: isHelpOpen)
  → 11개 항목 아코디언 표시
  → "온보딩 다시 보기" 버튼 클릭 → setHasSeenOnboardingThisSession(false) + setOnboardingVisible(true)

스토어 쓰기: isOnboardingVisible (OverlayState), hasSeenOnboardingThisSession (OverlayState 신규)
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | OverlayState에 `hasSeenOnboardingThisSession: boolean` (초기값 `false`) 신규 + `setHasSeenOnboardingThisSession` 액션. `isOnboardingVisible`은 fe-layout-filter v4가 이미 추가 |
| 수정 | `src/components/layout/AppShell.tsx` | `<OnboardingGuide />` + `<HelpModal />` + `<HelpFloatingButton />` 마운트 (AppShell 최상위에 추가 — 항상 마운트, 표시는 조건부) |
| 신규 | `src/components/layout/OnboardingGuide.tsx` | 4단계 스포트라이트 오버레이 컴포넌트. Tailwind 기반 (D3 미사용) |
| 신규 | `src/components/layout/HelpModal.tsx` | "?" 버튼 클릭 시 열리는 도움말 모달. 11개 항목 아코디언 (정적 콘텐츠) |
| 신규 | `src/components/layout/HelpFloatingButton.tsx` | 우하단 고정 "?" 버튼 (PM 별건 #1 잠정 채택) |

> **D3 미사용**: 온보딩 오버레이·도움말 모달은 순수 Tailwind CSS + React 상태로 구현.
> **fixture 없음**: 온보딩은 전용 API 엔드포인트가 없으므로 fixture 파일 불필요.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | 4단계 스포트라이트 온보딩 (스킵 버튼·이전/다음 버튼·완료), Zustand 세션 플래그(`hasSeenOnboardingThisSession`), 같은 세션 내 재진입 스킵, 우하단 floating "?" 도움말 버튼·모달 (11개 항목 아코디언), "온보딩 다시 보기", `isOnboardingVisible`·`hasSeenOnboardingThisSession` OverlayState 연동 |
| **비구현** | 온보딩 완료 상태 영구 저장 (전용 API 없음 + localStorage 절대 금지), 온보딩 커스텀 애니메이션, 복수 언어 지원 |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` (`isOnboardingVisible` OverlayState) + `feat/fe-stream-chart` (자동 선택 동작 — PM 별건 #2) + `feat/fe-panel` (1~3단계 타겟 요소 존재 필수) → `develop` 머지 완료 |

---

## 2. 입력 데이터

### 2.1 API 데이터

없음. 온보딩 가이드는 전용 API 엔드포인트가 없다.

### 2.2 useAppStore 읽기 상태 (fe-layout-filter v4 SoT 정합)

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| OverlayState | `isOnboardingVisible: boolean` | 온보딩 오버레이 표시 여부 |
| OverlayState | `hasSeenOnboardingThisSession: boolean` | 같은 세션 내 재진입 스킵 판단 (본 feat 신규) |
| ViewState | `selectedAnomalyId: number \| null` | 1단계 타겟 (fe-stream-chart 자동 선택 결과) |
| ViewState | `isPanelOpen: boolean` | 2·3단계 시작 전 패널 열림 확인 |
| ViewState | `activeTab: ViewTab` | 스트림 탭에서만 시작 |

### 2.3 영속 저장소 사용 — **금지**

**localStorage·sessionStorage 사용 금지** (`frame_spec_frontend_vN.md §8.10`, CLAUDE.md §15-1).
온보딩 완료 상태는 Zustand 메모리 슬라이스만 사용. 새 세션 진입 시 자동 재시작.

---

## 3. 출력 데이터

### 3.1 useAppStore 쓰기

| 액션 | 트리거 | 효과 |
|------|--------|-----|
| `setOnboardingVisible(true)` | 세션 최초 진입 + `hasSeenOnboardingThisSession === false` + `selectedAnomalyId !== null` (자동 선택 완료) | OverlayState `isOnboardingVisible` ← `true` |
| `setOnboardingVisible(false)` | 4단계 완료 또는 스킵 | OverlayState `isOnboardingVisible` ← `false` |
| `setHasSeenOnboardingThisSession(true)` | 4단계 완료 또는 스킵 | OverlayState `hasSeenOnboardingThisSession` ← `true` |
| `setHasSeenOnboardingThisSession(false)` | 도움말 모달 "다시 보기" 클릭 | OverlayState `hasSeenOnboardingThisSession` ← `false` (다음 useEffect tick에서 setOnboardingVisible(true) 트리거) |

### 3.2 시각화 규격 (web_plan_vN §9 기준)

#### ① 온보딩 오버레이 구조

```
┌─────────────────────────────────────────────────┐
│  반투명 다크 배경 (전체 화면, opacity: 0.6)      │
│                                                  │
│    [타겟 요소 영역] ← 투명 컷아웃               │
│    ┌──────────────────┐                          │
│    │ 타겟 요소 강조    │                          │
│    │ (ring 2px cyan)  │                          │
│    └──────────────────┘                          │
│       │                                          │
│    ┌──────────────────────────────────┐          │
│    │ 툴팁 버블 (bg-slate-800)         │          │
│    │ "{단계 안내 텍스트}"              │          │
│    │                                  │          │
│    │ [이전] [1/4]  [다음] / [완료]    │          │
│    │              [스킵]              │          │
│    └──────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

#### ② 4단계 안내 명세 (web_plan_vN §9.1 원문)

| 단계 | 타겟 요소 DOM 셀렉터 기준 | 안내 텍스트 |
|------|--------------------------|-------------|
| 1 | 자동 선택된 이상 노드 SVG circle (`data-anomaly-id={selectedAnomalyId}`) | "이 빨간 점이 이상 탐지 시점입니다. 클릭하면 분석 수치를 볼 수 있습니다" |
| 2 | 분석 패널 계량경제학 섹션 (`data-testid="stat-section"`) | "계량경제학 수치 항목을 클릭하면 해당 지표의 개별 그래프를 확인할 수 있습니다" |
| 3 | 분석 패널 ML 판정 섹션 (`data-testid="ml-section"`) | "ML 모델 행을 클릭하면 각 모델이 분석한 결과맵을 볼 수 있습니다" |
| 4 | Header 방법론 탭 버튼 (`data-testid="tab-methodology"`) | "방법론 탭에서 파이프라인 전체 설명을 확인하세요" |

> **타겟 요소 접근 방식**: `document.querySelector()` 또는 `ref` 기반으로 `getBoundingClientRect()`를 구해 스포트라이트 위치 계산.
> **1단계 자동 선택 전제**: `selectedAnomalyId !== null` (CLAUDE.md §16 SoT 보장). null 케이스 분기 없음 — 자동 선택이 보장되지 않으면 fe-stream-chart 자동 진입 동작 또는 자동 선택 정책 자체의 결함이며 본 feat 범위 밖.
> **2·3단계 조건**: `isPanelOpen === true` 필요. 2단계 진입 시 false이면 자동 `selectAnomaly(selectedAnomalyId)` 또는 패널 오픈 액션 호출 후 약 300ms 대기.

#### ③ 스포트라이트 렌더링 방식

- **배경**: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.6)`, `z-index: 9000`
- **컷아웃**: `clip-path: polygon(...)` 또는 `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)` 방식으로 타겟 영역 투명 처리
- **강조 링**: 타겟 요소 위에 `ring-2 ring-cyan-400 rounded` Tailwind 클래스 동적 추가
- **툴팁 버블**: `position: fixed`, 타겟 `getBoundingClientRect()` 기반 좌표 계산. 화면 경계 초과 시 반대 방향으로 자동 전환

#### ④ 온보딩 시작 조건 로직 (Zustand 분기)

```typescript
// AppShell 또는 OnboardingGuide.tsx에서 처리
useEffect(() => {
  if (hasSeenOnboardingThisSession) return;        // 같은 세션 내 재진입 스킵
  if (activeTab !== 'stream') return;              // 스트림 탭에서만 시작
  if (selectedAnomalyId === null) return;          // 자동 선택 완료 대기 (정상 케이스)
  setOnboardingVisible(true);
}, [selectedAnomalyId, activeTab, hasSeenOnboardingThisSession]);

// 완료/스킵 핸들러
const completeOnboarding = () => {
  setOnboardingVisible(false);
  setHasSeenOnboardingThisSession(true);
};
```

> **localStorage 사용 금지**: `frame_spec_frontend_vN.md §8.10` / CLAUDE.md §15-1. 영속 플래그 필요 시 별도 API 명세 PM 결재.

#### ⑤ 우하단 도움말 floating 버튼 (PM 별건 #1)

- **위치**: `position: fixed`, `right: 24px`, `bottom: 24px`, `z-index: 7000`
- **모양**: 원형 버튼 (직경 48px), 텍스트 "?", `bg-slate-800`, `text-white`, `shadow-lg`
- **클릭**: `setIsHelpOpen(true)` (HelpModal 열기)

#### ⑥ 도움말 모달 (web_plan_vN §9.2)

- 모달 (`position: fixed`, `z-index: 8000`, 중앙 정렬)
- 11개 항목 아코디언 (정적 콘텐츠):

| # | 항목 제목 |
|---|-----------|
| 1 | 이 서비스가 뭔가요? |
| 2 | 흐름 보기는 어떻게 읽나요? |
| 3 | 전달 구조는 어떻게 읽나요? |
| 4 | 원시 시계열은 무엇인가요? |
| 5 | 신뢰도 등급이란? |
| 6 | 패턴 유형이란? |
| 7 | 전이율이란? |
| 8 | IRF란? |
| 9 | ML 판정이란? |
| 10 | ML 결과맵이란? |
| 11 | 데이터 출처는? |

- 각 항목 클릭 시 설명 텍스트 아코디언 확장 (다중 동시 확장 허용)
- 모달 하단: "온보딩 가이드 다시 보기" 버튼 → `setHasSeenOnboardingThisSession(false)` + 모달 닫힘 + (useEffect를 통해) `setOnboardingVisible(true)` 트리거
- 모달 닫기: ✕ 버튼 또는 배경 클릭 또는 `Escape` 키

---

## 4. 예외처리

### 4.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-STORE-001` | `isOnboardingVisible` 또는 `hasSeenOnboardingThisSession` 상태 hydration 실패 | FE_FALLBACK — 온보딩 미표시로 안전 처리 (앱 전체 블록 없음). exception_spec_vN §8 `feat/fe-onboarding` 매핑 |

> **타겟 요소 미존재 케이스 (예: 패널 미열림 상태)**: 별도 예외 코드 없이 해당 단계 스킵 후 다음 단계 진행. 콘솔 경고만.

### 4.2 신규 예외 코드 제안

해당 없음.

---

## 5. 완료 기준

| 항목 | 기준 |
|------|------|
| 세션 최초 진입 온보딩 시작 | 스트림 차트 자동 선택 완료 후 OnboardingGuide 표시 확인 (`selectedAnomalyId !== null` + `hasSeenOnboardingThisSession === false`) |
| 같은 세션 내 재진입 스킵 | 온보딩 완료 후 탭 전환·라우트 이동 시 온보딩 미표시 확인 (`hasSeenOnboardingThisSession === true`) |
| 새 세션 시 재시작 | 페이지 새로고침 후 온보딩 다시 표시 확인 (Zustand 메모리 초기화로 의도된 동작) |
| 1단계 스포트라이트 | 자동 선택된 이상 노드 위치에 스포트라이트 + "이 빨간 점이..." 툴팁 표시 확인 |
| 2단계 스포트라이트 | 계량경제학 섹션 위치에 스포트라이트 표시 확인. 패널 미열림 시 자동 오픈 확인 |
| 3단계 스포트라이트 | ML 판정 섹션 위치에 스포트라이트 표시 확인 |
| 4단계 스포트라이트 | Header 방법론 탭 버튼 스포트라이트 표시 확인 |
| 스킵 버튼 | 스킵 클릭 시 온보딩 즉시 종료 + `hasSeenOnboardingThisSession === true` 확인 |
| 완료 | 4단계 완료 후 온보딩 종료 + `hasSeenOnboardingThisSession === true` 확인 |
| "?" 우하단 floating 버튼 | 화면 우하단에 floating 버튼 렌더링 확인 (PM 별건 #1) |
| "?" 도움말 모달 | "?" 클릭 시 모달 열림 확인 |
| 11개 항목 아코디언 | 각 항목 클릭 시 설명 확장/접기 확인 |
| 다시 보기 | 도움말 모달 "다시 보기" 클릭 → `hasSeenOnboardingThisSession=false` + 온보딩 재시작 확인 |
| ESC 닫기 | 도움말 모달에서 `Escape` 키로 모달 닫기 확인 |
| localStorage 미사용 | grep 검증: `localStorage` / `sessionStorage` 키워드 본 feat 코드에서 0건 확인 |
| FE-STORE-001 처리 | 상태 hydration 실패 시 온보딩 미표시 안전 처리 확인 |

---

## 6. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| **`localStorage` / `sessionStorage` 사용** | `frame_spec_frontend_vN §8.10` 절대 금지 + `feature_dev_list_vN §feat/fe-onboarding` 명시 + CLAUDE.md §15-1. 본 feat의 모든 영속 저장은 Zustand 메모리 한정 |
| D3.js 사용 | 온보딩 UI는 순수 React + Tailwind로 구현 가능 |
| 온보딩 완료 전 사용자 인터랙션 전면 차단 | 스킵 버튼·배경 클릭으로 언제든 종료 가능. 강제 온보딩 금지 |
| 온보딩 중 API 추가 호출 | 온보딩은 기존 스토어 상태만 읽음 |
| `selectedAnomalyId === null` 분기 처리 | 자동 선택이 보장되므로 (CLAUDE.md §16) 1단계 스킵 분기 자체가 SoT 이탈. null 케이스 발생 시 fe-stream-chart 자동 진입 동작 결함으로 처리 |
| setter명 혼용 (`setIsOnboardingVisible` 등) | `setOnboardingVisible`로 통일 |

---

## 7. PR 체크리스트

### Feature 명세
`docs/feature_spec_fe-onboarding_vN.md` (최신 버전)

### 체크리스트
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] **grep 검증**: `localStorage` / `sessionStorage` 키워드 본 feat 코드에서 0건
- [ ] OverlayState `hasSeenOnboardingThisSession` 신규 필드 추가 + 액션 정의 확인
- [ ] HelpFloatingButton 우하단 fixed 위치 확인 (PM 별건 #1)
- [ ] 이상 노드 SVG에 `data-anomaly-id` 속성 추가 확인 (feat/fe-stream-chart 협의)
- [ ] 계량경제학 섹션에 `data-testid="stat-section"` 속성 확인 (feat/fe-panel 협의)
- [ ] ML 판정 섹션에 `data-testid="ml-section"` 속성 확인 (feat/fe-panel 협의)
- [ ] 방법론 탭 버튼에 `data-testid="tab-methodology"` 속성 확인 (feat/fe-layout-filter 협의)
- [ ] 스킵·완료 시 `hasSeenOnboardingThisSession=true` 확인
- [ ] "다시 보기" 클릭 시 `hasSeenOnboardingThisSession=false` 확인
- [ ] 새로고침 시 온보딩 재시작 동작 확인 (의도된 동작)

### PM 별건 처리 결과
- [ ] PM 별건 #1 — "?" 버튼 위치 (우하단 vs Header) 결재 결과 반영
- [ ] PM 별건 #2 — 자동 선택 정책 책임 위치 (fe-stream-chart vs fe-panel) 결재 결과 반영
- [ ] PM 별건 #3 — 새로고침 후 온보딩 재시작 정책 결재. 영속 저장 필요 시 서버 사이드 사용자 환경설정 API 별도 명세

---

## 8. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `web_plan_vN.md` | `§9, §9.1, §9.2` | 온보딩 4단계 안내 텍스트·도움말 항목 11종 원문·"?" 버튼 위치 |
| `CLAUDE.md` `frontend repo` | `§15-1, §16` | localStorage 절대 금지·자동 선택 정책 SoT |
| `frame_spec_frontend_vN.md` | `§2, §6.2, §8.10` | 디렉토리·OverlayState SoT·localStorage 절대 금지 |
| `feature_dev_list_vN.md` | `§feat/fe-onboarding` | "Zustand 세션 상태로 관리. localStorage 사용 금지" 명시 |
| `feature_spec_fe-stream-chart_vN.md` | `§3.3 자동 진입 동작` | 자동 선택 책임 (PM 별건 #2) |
| `feature_spec_fe-panel_vN.md` | `§1.3` | `data-testid` 속성 (stat-section, ml-section) |
| `feature_spec_fe-layout-filter_vN.md` | `§3.1 OverlayState` | `isOnboardingVisible` 정의 |

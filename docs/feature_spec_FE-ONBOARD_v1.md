# Feature 명세서 — 온보딩 가이드 및 상시 도움말

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-ONBOARD`  
**브랜치명**: `feat/fe-onboarding`  
**담당자**: 하대수  
**작성일**: 2026-05-06  
**상태**: 초안  

**변경 이력**
- v1 (2026-05-06): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `web_plan_vN.md §9` | 최신(`docs_manifest.md` 조회) | 온보딩 4단계 안내 텍스트·상시 도움말 항목 11종 원문 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §8` | 최신(`docs_manifest.md` 조회) | 디렉토리 구조·절대 금지 사항 | ☐ |
| `feature_dev_list_vN.md §feat/fe-onboarding` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준 | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다.

---

## ⚠️ Action Items — 미결 불일치 항목

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| `localStorage` 사용 예외 | `feature_spec_FE-STREAM_v1 §8 금지사항`: "localStorage, sessionStorage 사용 — 세션 상태는 Zustand 메모리 기반 단일 관리 원칙" | 온보딩 완료 여부는 페이지 새로고침 후에도 유지되어야 함 (`재진입 시 스킵` 요건). 전용 API 엔드포인트 없음 | 온보딩 완료 플래그는 세션 상태가 아닌 영구 사용자 환경설정. `localStorage.setItem('onboardingCompleted', 'true')` 사용이 유일한 클라이언트 사이드 구현 방법. FE-STREAM §8 금지는 세션 상태를 대상으로 하므로 이 케이스에는 미적용 해석이 타당하나 PM 확정 필요 |
| 고신뢰 노드 없을 때 온보딩 1단계 처리 | `web_plan_vN §9.1` 1단계: "최근 고신뢰 노드 가리킴" | `useAppStore.selectedAnomalyId === null` (고신뢰 노드 없음) 상태에서 1단계 타겟이 없음 | 두 가지 방안: ① 1단계 스킵 후 2단계 진행, ② 고신뢰 노드 없음 시 온보딩 전체 연기. 본 명세는 **1단계를 스킵하고 2단계부터 시작**으로 명세. PM 확정 필요 |
| 온보딩 시작 시점 | 앱 마운트 즉시 vs 스트림 차트 데이터 로드 완료 후 | 1단계가 이상 노드를 가리키므로 `useStreamData` 로드 완료 + 자동 선택 완료 후 시작 필요 | 본 명세: `selectedAnomalyId !== null` 상태가 확인된 후 온보딩 시작. 상태 변화 감지는 `useEffect` 의존성 배열 활용 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

최초 접속 시 실제 화면 위에서 4단계 스포트라이트 가이드를 실행하고, 이후 재진입 시 스킵하며, 상시 "?" 도움말 버튼에서 11개 항목 모달을 제공한다.

### 1.2 데이터 흐름

```
앱 최초 마운트 (activeTab === 'stream')
  → localStorage.getItem('onboardingCompleted')
  → null이면 온보딩 예약 상태 (isOnboardingVisible 대기)
  → selectedAnomalyId !== null 감지 (스트림 차트 자동 선택 완료)
  → useAppStore.setOnboardingVisible(true)
  → OnboardingGuide.tsx 표시

4단계 진행 (로컬 state: step 1→2→3→4→완료)
  → 1단계: 이상 노드 DOM 요소 스포트라이트 + 툴팁
  → 2단계: 계량경제학 수치 섹션 스포트라이트
  → 3단계: ML 판정 섹션 스포트라이트
  → 4단계: 방법론 탭 (Header) 스포트라이트
  → 완료: useAppStore.setOnboardingVisible(false) + localStorage.setItem('onboardingCompleted', 'true')

"?" 버튼 클릭 (Header)
  → HelpModal.tsx 열림 (로컬 state: isHelpOpen)
  → 11개 항목 아코디언 표시
  → "온보딩 다시 보기" 버튼 클릭 → localStorage 삭제 + setIsOnboardingVisible(true)

스토어 쓰기: isOnboardingVisible (OverlayState)
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/components/layout/AppShell.tsx` | `<OnboardingGuide />` + `<HelpModal />` 마운트 (AppShell 최상위에 추가 — 항상 마운트, `isOnboardingVisible` / `isHelpOpen` 조건부 표시) |
| 수정 | `src/components/layout/Header.tsx` | "?" 버튼에 `onClick` 핸들러 추가 → `HelpModal` 열기 트리거. 현재는 버튼만 렌더링된 자리표시자 상태 |
| 신규 | `src/components/layout/OnboardingGuide.tsx` | 4단계 스포트라이트 오버레이 컴포넌트. Tailwind 기반 (D3 미사용) |
| 신규 | `src/components/layout/HelpModal.tsx` | "?" 버튼 클릭 시 열리는 도움말 모달. 11개 항목 아코디언 (정적 콘텐츠) |

> **D3 미사용**: 온보딩 오버레이·도움말 모달은 순수 Tailwind CSS + React 상태로 구현. D3 불필요.  
> **`src/hooks/`, `src/utils/` 폴더**: `feat/fe-layout-filter`에서 신규 생성됨. 온보딩 전용 훅은 없음.  
> **fixture 없음**: 온보딩은 전용 API 엔드포인트가 없으므로 fixture 파일 불필요.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | 4단계 스포트라이트 온보딩 (스킵 버튼·이전/다음 버튼·완료), localStorage 완료 플래그, 재진입 스킵, 상시 "?" 도움말 모달 (11개 항목 아코디언), 온보딩 다시 보기, `isOnboardingVisible` OverlayState 연동, 고신뢰 노드 없음 시 1단계 스킵 |
| **비구현** | 온보딩 완료 상태 서버 동기화 (전용 API 없음), 온보딩 커스텀 애니메이션 (CSS transition 수준으로 충분), 복수 언어 지원 (한국어 단일) |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` + `feat/fe-stream-chart` + `feat/fe-panel` → `develop` PR 머지 완료 (1~3단계 타겟 요소 존재 필수) |

---

## 2. 입력 데이터

### 2.1 API 데이터

없음. 온보딩 가이드는 전용 API 엔드포인트가 없다. 기존 스토어 상태만 읽는다.

### 2.2 useAppStore 읽기 상태

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| OverlayState | `isOnboardingVisible: boolean` | 온보딩 오버레이 표시 여부 |
| ViewState | `selectedAnomalyId: number \| null` | 1단계 시작 가능 여부 판단 |
| ViewState | `isPanelOpen: boolean` | 2·3단계 시작 전 패널 열림 확인 |

### 2.3 localStorage

| 키 | 값 | 용도 |
|----|-----|------|
| `'onboardingCompleted'` | `'true'` | 온보딩 완료 여부 영구 저장. 앱 마운트 시 조회, 완료 시 저장 |

---

## 3. 출력 데이터

### 3.1 useAppStore 쓰기

| 필드 | 트리거 | 값 |
|------|--------|-----|
| `isOnboardingVisible: boolean` | 온보딩 시작 조건 충족 | `true` |
| `isOnboardingVisible: boolean` | 온보딩 완료·스킵 | `false` |

### 3.2 localStorage 쓰기

| 키 | 트리거 | 값 |
|----|--------|-----|
| `'onboardingCompleted'` | 온보딩 4단계 완료 또는 스킵 | `'true'` |
| (삭제) | 도움말 모달 "온보딩 다시 보기" 클릭 | `localStorage.removeItem('onboardingCompleted')` |

### 3.3 시각화 규격 (web_plan_vN §9 기준)

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
| 1 | 이상 노드 SVG circle (`data-anomaly-id={selectedAnomalyId}`) | "이 빨간 점이 이상 탐지 시점입니다. 클릭하면 분석 수치를 볼 수 있습니다" |
| 2 | 분석 패널 계량경제학 섹션 (`data-testid="stat-section"`) | "계량경제학 수치 항목을 클릭하면 해당 지표의 개별 그래프를 확인할 수 있습니다" |
| 3 | 분석 패널 ML 판정 섹션 (`data-testid="ml-section"`) | "ML 모델 행을 클릭하면 각 모델이 분석한 결과맵을 볼 수 있습니다" |
| 4 | Header 방법론 탭 버튼 (`data-testid="tab-methodology"`) | "방법론 탭에서 파이프라인 전체 설명을 확인하세요" |

> **타겟 요소 접근 방식**: `document.querySelector()` 또는 `ref` 기반으로 타겟 요소 `getBoundingClientRect()`를 구해 스포트라이트 위치 계산. 각 타겟 컴포넌트에 `data-testid` 속성 추가 필요.  
> **1단계 조건**: `selectedAnomalyId !== null`일 때만 실행. `null`이면 1단계 스킵 후 2단계부터 시작 (단계 번호는 "1/3" 등으로 재조정).  
> **2·3단계 조건**: `isPanelOpen === true` 필요. 2단계 진입 시 `isPanelOpen`이 false이면 자동으로 `setPanelOpen(true)` 호출 후 패널 애니메이션 완료 대기(약 300ms) 후 스포트라이트 표시.

#### ③ 스포트라이트 렌더링 방식

- **배경**: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.6)`, `z-index: 9000`
- **컷아웃**: `clip-path: polygon(...)` 또는 `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)` 방식으로 타겟 영역 투명 처리
- **강조 링**: 타겟 요소 위에 `ring-2 ring-cyan-400 rounded` Tailwind 클래스 동적 추가
- **툴팁 버블**: `position: fixed`, 타겟 `getBoundingClientRect()` 기반 좌표 계산. 화면 경계 초과 시 반대 방향으로 자동 전환

#### ④ 온보딩 시작 조건 로직

```typescript
// AppShell 또는 OnboardingGuide.tsx에서 처리
useEffect(() => {
  const completed = localStorage.getItem('onboardingCompleted');
  if (completed) return;                        // 이미 완료
  if (activeTab !== 'stream') return;           // 스트림 탭에서만 시작
  if (selectedAnomalyId === null && step === 1) return; // 1단계: 노드 대기
  setOnboardingVisible(true);
}, [selectedAnomalyId, activeTab]);
```

#### ⑤ 도움말 모달 (web_plan_vN §9.2)

- Header "?" 버튼 클릭 시 열리는 모달 (`position: fixed`, `z-index: 8000`)
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
- 모달 하단: "온보딩 가이드 다시 보기" 버튼 → `localStorage.removeItem('onboardingCompleted')` + 모달 닫힘 + `setIsOnboardingVisible(true)`
- 모달 닫기: ✕ 버튼 또는 배경 클릭 또는 `Escape` 키

---

## 4. 예외처리

### 4.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-D3-003` (유사) | 타겟 요소 `getBoundingClientRect()` 반환 width/height = 0 (패널 미열림·화면 밖 등) | 해당 단계 스킵 후 다음 단계 진행. 콘솔 경고 |
| `FE-STORE-001` | `isOnboardingVisible` 상태 복구 실패 | 온보딩 미표시로 안전 처리 (앱 전체 블록 없음) |

### 4.2 신규 예외 코드 제안

해당 없음.

---

## 5. 완료 기준

| 항목 | 기준 |
|------|------|
| 최초 진입 온보딩 시작 | 스트림 차트 자동 선택 완료 후 OnboardingGuide 표시 확인 |
| 재진입 스킵 | 온보딩 완료 후 새로고침 시 온보딩 미표시 확인 (`localStorage` 키 존재 확인) |
| 1단계 스포트라이트 | 선택된 이상 노드 위치에 스포트라이트 + "이 빨간 점이..." 툴팁 표시 확인 |
| 2단계 스포트라이트 | 계량경제학 섹션 위치에 스포트라이트 표시 확인. 패널 미열림 시 자동 오픈 확인 |
| 3단계 스포트라이트 | ML 판정 섹션 위치에 스포트라이트 표시 확인 |
| 4단계 스포트라이트 | Header 방법론 탭 버튼 스포트라이트 표시 확인 |
| 스킵 버튼 | 스킵 클릭 시 온보딩 즉시 종료 + localStorage 완료 플래그 저장 확인 |
| 완료 | 4단계 완료 후 온보딩 종료 + localStorage 완료 플래그 저장 확인 |
| 고신뢰 노드 없음 | `selectedAnomalyId === null` 상태에서 1단계 스킵 후 2단계부터 시작 확인 |
| "?" 도움말 모달 | Header "?" 클릭 시 모달 열림 확인 |
| 11개 항목 아코디언 | 각 항목 클릭 시 설명 확장/접기 확인 |
| 다시 보기 | 도움말 모달 "다시 보기" 클릭 → localStorage 삭제 → 온보딩 재시작 확인 |
| ESC 닫기 | 도움말 모달에서 `Escape` 키로 모달 닫기 확인 |

---

## 6. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| 온보딩 완료 상태 외 Zustand 외 다른 상태를 localStorage에 저장 | 온보딩 플래그 예외 인정(Action Item) 외 나머지 상태는 여전히 localStorage 금지 |
| D3.js 사용 | 온보딩 UI는 순수 React + Tailwind로 구현 가능. D3 불필요 |
| 온보딩 완료 전 사용자 인터랙션 전면 차단 | 스킵 버튼·배경 클릭으로 언제든 종료 가능. 강제 온보딩 금지 |
| 온보딩 중 API 추가 호출 | 온보딩은 기존 스토어 상태만 읽음. 신규 API 호출 없음 |

---

## 7. PR 체크리스트

- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] Header "?" 버튼에 `onClick` 핸들러 연결 확인
- [ ] 이상 노드 SVG에 `data-anomaly-id` 속성 추가 확인 (feat/fe-stream-chart 수정 필요 시 별도 협의)
- [ ] 계량경제학 섹션에 `data-testid="stat-section"` 속성 확인
- [ ] ML 판정 섹션에 `data-testid="ml-section"` 속성 확인
- [ ] 방법론 탭 버튼에 `data-testid="tab-methodology"` 속성 확인
- [ ] localStorage `onboardingCompleted` 키 저장/삭제 동작 확인
- [ ] 스킵 시 localStorage 플래그 저장 확인

---

## 8. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `web_plan_vN.md` | `§9` | 온보딩 4단계 안내 텍스트·도움말 항목 11종 원문 |
| `CLAUDE.md` | `§16` | 온보딩 규칙 (4단계 텍스트 확인) |
| `frame_spec_frontend_vN.md` | `§2, §8` | 디렉토리 구조·절대 금지 사항 |
| `feature_spec_FE-STREAM_v1.md` | `§8 금지사항` | localStorage 금지 원칙 및 온보딩 예외 근거 확인 |
| `feature_spec_FE-PANEL_v1.md` | `§1.3` | `data-testid` 속성 목록 (stat-section, ml-section) 확인 |

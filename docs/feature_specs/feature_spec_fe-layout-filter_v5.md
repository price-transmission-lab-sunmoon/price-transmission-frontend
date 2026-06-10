# Feature 명세서 — 레이아웃 + 필터 바

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-layout-filter`
**담당자**: 하대수
**작성일**: 2026-05-01
**상태**: 초안

**변경 이력**
- v1 (2026-04-30): 최초 작성
- v2 (2026-05-01): 11개 자체 검증 항목 반영 (타입·fixture·Banner dedup·신규 디렉토리 등)
- v3 (2026-05-03~04): `_vN` 표기 일괄 적용 + 6건 SoT 대조 검증 반영
- v4 (2026-05-10): `plan_feature_specs_alignment_v1.md` 감사 결과 반영 (ViewTab 4탭·Zustand 필드명 SoT·`granularity`·events fixture 등)
- v5 (2026-05-14): cross-spec 점검 결과 반영
  - **C2**: §3.1 CommodityState 표에 `setPrimaryCommodity(id: string \| null) => void` 액션 명시 추가 — Banner 배지 클릭·fe-api-connect AnomalySummaryBanner 배지 클릭의 호출 대상
  - **C1**: Banner.tsx 소유권 명확화 — **본 feat가 신규 생성하는 단일 컴포넌트**. fe-api-connect는 본 feat가 만든 Banner의 mock→실연결 활성화·`onError`/Toast 통합만 담당 (별도 컴포넌트 생성 금지)
  - **C4**: URL 라우팅 전략 PM 별건 §0 추가 — 1차 출시 단일 SPA·`/`+`/methodology` 두 라우트만, 새로고침 시 상태 초기화 채택
  - **I8**: §3.2 글로벌 로딩 상태 UI 정책 추가 — `commodities`/`freshness` 미로드 시 점 placeholder 통일
  - **I9**: A11Y(접근성) 정책 PM 별건 §0 추가 — 1차 출시는 데스크탑 마우스 인터랙션 중심 (키보드 네비·ARIA 보강은 차후)
  - 본 feat가 생성하는 신규 컴포넌트 목록 §1.3 명시 보강 (FreshnessChip은 frame 단계 자리표시자 → 본 feat가 활성화)

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities, §/freshness, §/anomalies/summary, §/events` | 최신 | 엔드포인트·request·response 필드명 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*` | 최신 | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §6.2` | 최신 | 디렉토리·타입 매트릭스·Zustand 필드명 SoT | ☐ |
| `web_plan_vN.md §3, §3.3` | 최신 | 레이아웃·헤더·배너·필터 바·뷰 탭 4종 명세 | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌·미정 내용 | 본 명세 잠정 채택 |
|---|------|---------------|-------------------|
| 1 | 방법론 탭 라우팅 | 4탭 통합 vs 3탭+버튼 vs 4탭+라우트 동시 갱신 | **4탭 + `/methodology` 라우트 동시 갱신** (literals.ts SoT 4탭) |
| 2 | Zustand 필드명 SoT | frame_spec / CLAUDE.md 표기 vs 명세서 v3 표기 | **frame_spec / CLAUDE.md SoT 채택** (v4에서 일괄 교체) |
| 3 | `segments: SegmentId[]` 좁히기 | api_spec `string[]` vs frame `SegmentId[]` | 좁히기 유지. PARSE-ENUM-002 fallback 정책 PM 결정 |
| 4 | **URL 라우팅 전략 (v5 신규)** | `/` + `/methodology` 두 라우트만 vs 뷰별 URL 분리(`/stream`, `/scatter`, ...) vs URL params (품목·필터) | **1차 출시: `/` + `/methodology` 두 라우트만**. 품목·뷰탭·필터는 Zustand 메모리만 유지. **새로고침 시 모든 상태 초기화 (의도된 동작)**. 향후 URL params 도입 시 별도 명세 |
| 5 | **A11Y 정책 (v5 신규)** | 키보드 네비게이션·ARIA·색맹 대응 명세 없음 | **1차 출시는 데스크탑 마우스 인터랙션 중심**. 최소 요건만: ① 모든 버튼·드롭다운 `aria-label` 추가, ② Tab 키 포커스 이동 가능, ③ Esc 키 패널·모달 닫기. 키보드 단축키·스크린리더 풀 지원은 차후 명세 |

---

## ⚠️ Action Items — 미결 불일치 항목

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| `primary_pattern` 타입 | CLAUDE.md §6: `1 \| 2 \| 3` 숫자 | `'pattern1' \| 'pattern2' \| 'pattern3'` 문자열 | api_spec_vN 응답값 |
| `pattern_types` 타입 | `number[]` | `PrimaryPattern[]` | 동일 |
| `anomaly_id` 타입 | `string` | `number` (integer) | api_spec_vN |
| CLAUDE.md 헤더 참조 표기 | 구버전 박힘 | `_vN` 표기 | `abcd_vN.md` 규칙 |
| 로컬 `docs/` 폴더 동기화 | 구버전 다수 | 매니페스트 §1 표 최신본 | `docs_manifest.md §2.2` |

---

## 1. 기능 개요

### 1.1 한 줄 요약

프레임 stub 상태인 AppShell·Header·FilterBar를 실제 동작 컴포넌트로 구현하고, **Banner(이달의 이상 요약)와 FreshnessChip(데이터 기준 시점 칩)을 신규 생성**하며, useAppStore를 5-슬라이스 SoT 정합 구조로 확장한다.

### 1.2 데이터 흐름

```
GET /commodities       → useAppStore.commodities      → Header 품목 드롭다운 + FilterBar 구간 토글
GET /freshness         → useAppStore.freshness        → FreshnessChip + 기간 프리셋 기준월
GET /anomalies/summary → Banner 배지 (dedup 후)
GET /events            → useAppStore.events           → FilterBar 사건 드롭다운

useAppStore (primaryCommodityId, secondaryCommodityId, periodPreset, filterFrom, filterTo,
             granularity, confidenceFilter, patternFilter, activeSegments, eventFilter,
             activeTab, selectedAnomalyId, isPanelOpen, layoutNumber)
  → Header / FilterBar / Banner / FreshnessChip 렌더링 제어
  → 후속 feat/* 시각화가 이 상태를 읽어 API 호출 파라미터로 사용
```

### 1.3 프레임 내 위치

> D3 컴포넌트 위치 정책: `frame_spec_frontend_vN §8.6` (`src/components/charts/`). 본 feat는 layout 컴포넌트 중심.

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | CommodityState `setPrimaryCommodity` 액션 추가; `secondaryCommodityId` 추가; FilterState 전면 확장(SoT 정합); ViewState 4탭 + `selectedAnomalyId`/`isPanelOpen` 추가; OverlayState `events`/`layoutNumber`/`isOnboardingVisible`/`hasSeenOnboardingThisSession` 추가. **PanelState는 본 feat 미생성** (`feat/fe-panel`) |
| 수정 | `src/types/literals.ts` | `SegmentId`, `PeriodPreset`, `ViewTab(4탭)` 신규 |
| 수정 | `src/api/client.ts` | mock 인터셉터에 `/anomalies/summary`, `/events` 분기 추가 |
| 수정 | `src/router/index.tsx` | `/methodology` 라우트 추가 (PM 별건 #4 — 1차 출시 단일 추가 라우트) |
| 수정 | `src/components/layout/AppShell.tsx` | Banner 마운트 + 2컬럼 레이아웃 |
| 수정 | `src/components/layout/Header.tsx` | 품목 드롭다운·보조 품목·4뷰 탭·**`FreshnessChip` 마운트** 구현 |
| 수정 | `src/components/layout/FilterBar.tsx` | 기간 프리셋 6종·사건 토글·신뢰도·패턴·구간 토글 구현 |
| 수정 | `src/fixtures/commodities.json` / `freshness.json` | 필드값 보강 |
| **신규** | **`src/components/layout/Banner.tsx`** | **이달의 이상 요약 배너 — 본 feat 단일 소유. fe-api-connect는 실연결 활성화만 (C1)** |
| **신규** | **`src/components/layout/FreshnessChip.tsx`** | **데이터 기준 시점 칩 — 본 feat 단일 소유. fe-api-connect는 실연결 활성화만 (C1)** |
| 신규 | `src/hooks/` + `useCommodities.ts`, `useFreshness.ts`, `useAnomaliesSummary.ts`, `useEvents.ts` | React Query 훅 4종. 폴더 신규 생성 |
| 신규 | `src/utils/` + `dateUtils.ts` | `YYYY-MM` 파싱·포맷·`subtractMonths()` 등 |
| 신규 | `src/fixtures/anomalies_summary.json` / `anomalies_summary_empty.json` | mock fixture |
| 신규 | `src/pages/MethodologyPage.tsx` | placeholder (실제 구현은 `feat/fe-methodology-tab`) |

> **C1 소유권 명확화**: `Banner.tsx`와 `FreshnessChip.tsx`는 **본 feat 단독 소유**. fe-api-connect v3는 mock→실연결 활성화·`QueryCache.onError` 통합·Toast 발화 연결만 담당. 본 feat가 만든 컴포넌트를 재생성하지 않는다.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | AppShell 2컬럼 레이아웃, Header (품목 드롭다운·보조 품목·4뷰 탭·방법론 라우팅 동기화·**FreshnessChip**), **Banner (이달의 이상 요약 배지·증감·배지 클릭)**, FilterBar (기간 프리셋 6종·사건 드롭다운·신뢰도·패턴·구간 토글), useAppStore 5-슬라이스 확장, `/methodology` 라우트, **글로벌 로딩 placeholder 정책 (I8)** |
| **비구현** | 스트림·산점도·원시 시계열 차트, PanelState 슬라이스·분석 수치 패널, 방법론 본문, 온보딩, MethodologyPage 본문, URL params·딥링크 (PM 별건 #4) |
| **선행 조건** | `frame/frontend` → `develop` PR #1 머지 완료 |

---

## 2. 입력 데이터

(v4 §2와 동일 — `/commodities`, `/freshness`, `/anomalies/summary`, `/events` 4종 + dedup용 필드)

---

## 3. 출력 데이터

### 3.1 useAppStore 확장 명세 (v5 — `setPrimaryCommodity` 명시 추가)

**CommodityState 추가**

| 필드 / 액션 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `primaryCommodityId` | `string \| null` | (frame 기본값 유지) | 주 품목 ID — frame_spec SoT 명칭 |
| **`setPrimaryCommodity`** | **`(id: string \| null) => void`** | — | **주 품목 설정 액션 (v5 신규 명시)**. Banner 배지 클릭·AnomalySummaryBanner 배지 클릭의 호출 대상 |
| `secondaryCommodityId` | `string \| null` | `null` | 보조 품목 ID |
| `setSecondaryCommodity` | `(id: string \| null) => void` | — | 보조 품목 설정 액션 |

> **C2 해소**: v4까지 `setPrimaryCommodity` 액션이 정의 위치가 모호했음. v5에서 본 명세 §3.1을 SoT로 확정. 호출 시 `activeSegments`를 새 품목의 `segments` 전체로 초기화 (§3.2 참조). frame 단계에 `setPrimaryCommodity`가 이미 정의되어 있을 경우 본 feat는 기존 구현 재사용·확장만 수행.

**FilterState / ViewState / OverlayState / PanelState** (v4 §3.1 표 참조 — 변경 없음)

| 슬라이스 | 필드 (요약) | 비고 |
|----------|-------------|------|
| FilterState | `filterFrom`, `filterTo`, `granularity`, `periodPreset`, `confidenceFilter`, `patternFilter`, `eventFilter`, `activeSegments` + setters | v4 SoT 정합 |
| ViewState | `activeTab(ViewTab 4탭)`, `selectedAnomalyId`, `isPanelOpen` + `setActiveTab`, `selectAnomaly`, `closePanel` | 본 feat 신규 |
| OverlayState | `events`, `layoutNumber`, `isOnboardingVisible`, `hasSeenOnboardingThisSession` (후자 2개는 fe-onboarding v2 신규) + setters | 일부는 후속 feat 호환용 placeholder |
| PanelState | 본 feat 미생성 (`feat/fe-panel`) | — |

### 3.2 컴포넌트 렌더링 명세

(Banner dedup 규칙, Header 품목 드롭다운, 4뷰 탭, 데이터 기준 시점 칩, FilterBar 프리셋 6종·사건·신뢰도·패턴·구간 토글 — v4 §3.2 동일)

**v5 추가 — 글로벌 로딩 placeholder 정책 (I8)**

API 미로드 상태의 컴포넌트는 아래 통일 규칙을 따른다:

| 컴포넌트 | 로딩 placeholder |
|----------|-----------------|
| Header 품목 드롭다운 | 회색 placeholder 텍스트 "품목 로딩 중..." + `disabled` |
| FreshnessChip | 텍스트 `…` (점 3개) `animate-pulse` |
| Banner | 스켈레톤 박스 (배너 높이 유지, 레이아웃 밀림 방지) |
| FilterBar 구간 토글 | 비활성 회색. `commodities` 로드 후 활성화 |
| FilterBar 사건 드롭다운 | 빈 목록 + 회색 텍스트 "이벤트 로딩 중..." |

> **에러 상태**: 각 컴포넌트는 `QueryCache.onError`가 Toast를 발화하므로 컴포넌트 자체는 `null` 반환 또는 placeholder 유지. 컴포넌트 레벨 에러 UI 중복 표시 금지.

### 3.3 mock 인터셉터 분기 추가

(v4 §3.3 동일 — `/anomalies/summary`, `/events` 분기 추가)

---

## 4. 파라미터 제약 조건 / 환경 변수

(v4 §4 동일)

---

## 5. 예외처리

(v4 §5.1 동일 — FE-API-001~005, FE-STORE-001/002, FE-MOCK-001, PARSE-DATE-002, PARSE-ENUM-002, PARSE-SCHEMA-001)

---

## 6. 목업 및 실제 데이터 전환 조건

(v4 §6 동일)

---

## 7. 완료 기준

(v4 §7 항목 + v5 추가)

| v5 신규 항목 | 기준 |
|------|------|
| **`setPrimaryCommodity` 액션 동작** | Banner 배지 클릭 시 `setPrimaryCommodity(commodity_id)` 호출 → `primaryCommodityId` 갱신 + `activeSegments` 초기화 확인 |
| **Banner / FreshnessChip 단독 소유** | grep 검증: 본 feat 외 브랜치에서 `Banner.tsx`/`FreshnessChip.tsx` 신규 생성 코드 0건 |
| **글로벌 로딩 placeholder** | API 미로드 상태 5개 컴포넌트 모두 §3.2 표 placeholder 표시 확인 |
| **A11Y 최소 요건** | 모든 버튼·드롭다운에 `aria-label` 부여, Tab 키 포커스 이동 가능, Esc 키 패널·모달 닫기 동작 확인 |
| **URL 라우팅 전략** | `/` 진입 시 메인 화면, `/methodology` 진입 시 방법론 페이지. 새로고침 시 `/` → 품목·필터 초기 상태로 복원 |

---

## 8. 금지 사항

(v4 §8 동일 + v5 추가)

| 금지 사항 (v5 신규) | 이유 |
|-----------|------|
| 본 feat 외 브랜치에서 `Banner.tsx` / `FreshnessChip.tsx` 신규 생성 | C1 소유권 충돌 방지. fe-api-connect는 활성화·통합만 담당 |
| URL params로 품목·필터 상태 인코딩 (`?commodity=wheat&from=2023-04`) | PM 별건 #4 — 1차 출시 미적용. 향후 별도 명세 |
| 새로고침 후 상태 복원 로직 (localStorage·sessionStorage·URL params) | frame_spec_frontend §8.10 / PM 별건 #4 — 의도된 초기화 |

---

## 9. Pull Request 템플릿

```markdown
## 개요
- **브랜치**: feat/fe-layout-filter
- **Feature 명세**: `docs/feature_spec_fe-layout-filter_vN.md` (최신)
- **담당자**: 하대수

## 구현 완료 항목
- [ ] AppShell·Header·Banner·FreshnessChip·FilterBar 전 컴포넌트 구현
- [ ] useAppStore 5-슬라이스 확장 (Commodity `setPrimaryCommodity` 명시 + Filter SoT 정합 + ViewState 4탭/selectedAnomalyId/isPanelOpen + Overlay events/layoutNumber/isOnboardingVisible/hasSeenOnboardingThisSession)
- [ ] literals.ts 신규 타입 (SegmentId, PeriodPreset, ViewTab 4탭)
- [ ] mock 인터셉터에 /anomalies/summary, /events 분기 추가
- [ ] /methodology 라우트 placeholder
- [ ] hooks/, utils/ 폴더 신규 생성
- [ ] 글로벌 로딩 placeholder 5개 컴포넌트 통일 적용
- [ ] A11Y 최소 요건 (aria-label, Tab 포커스, Esc 닫기)
- [ ] 예외처리 (FE-API-001~005, FE-STORE-001/002, FE-MOCK-001, PARSE-DATE-002, PARSE-ENUM-002, PARSE-SCHEMA-001)
- [ ] 목업 실행 성공

## 필드명 일치 확인
- [ ] Zustand 필드명이 frame_spec_vN §6.2 SoT 일치
- [ ] `setPrimaryCommodity` 액션 정의 + 호출 케이스 검증

## 단독 소유 검증
- [ ] grep: `Banner.tsx`/`FreshnessChip.tsx` 신규 생성 코드가 본 feat에만 존재

## 리뷰어 확인 사항
- 구 필드명 잔존 grep 검증
- 4뷰 탭 + /methodology 라우트 동시 갱신 동작
- Banner dedup 규칙(§3.2) 일치
- 글로벌 로딩 placeholder 5개 컴포넌트 일치
- PM 별건 #4 (URL 라우팅) 정책 준수

## PM 별건 처리 결과
- [ ] #1~#5 결재 결과 반영
```

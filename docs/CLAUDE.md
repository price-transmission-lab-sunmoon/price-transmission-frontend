# CLAUDE.md — Frontend

> **Claude Code 세션 자동 참조 컨텍스트 파일 (프론트엔드 repo 전용)**  
> 이 파일은 세션마다 반복 입력이 필요한 전역 제약·설계 결정·파라미터를 집중 관리한다.  
> 변경 시 단독 커밋: `[CLAUDE.md] Update {변경 내용}`

**최초 작성**: 2026-05-07  
**담당**: 하대수 (sprint_plan_vN §3.2)  
**버전 해석 단일 출처 (SoT)**: [`docs/docs_manifest.md`](docs/docs_manifest.md) — 본 파일 및 모든 명세 문서의 `abcd_vN.md` 표기는 manifest §1 표로 해석한다.

**참조 기준 문서** (모두 manifest §1 표로 최신 해석): `frame_spec_frontend_vN`, `api_spec_vN`, `db_schema_vN`, `web_plan_vN`, `exception_spec_vN`, `exception_design_vN`, `pipeline_output_spec_vN`, `doc1_technical_pipeline_vN`, `doc3_research_proposal_vN`, `feature_dev_list_vN`

**⚠️ 작업 착수 전 필수 체크**: manifest §1 표의 파일이 `docs/`에 모두 존재하는지 확인. 누락 시 작업 중단 + PM 알림 (manifest §2.2).

---

## 1. 프로젝트 요약

- **과제명**: 계량경제학 모형과 머신러닝 기반 소비자 물가 분석 및 이상 탐지를 위한 모델 개발
- **이 repo의 역할**: React 프론트엔드 — FastAPI 백엔드의 분석 결과를 D3.js로 시각화
- **데이터 흐름**: 파이프라인 repo (CSV 산출) → PostgreSQL → FastAPI 백엔드 → **이 repo (React + D3.js)**
- **핵심 원칙**: 읽기 전용 소비자. 백엔드 API 응답 구조 변경 권한 없음. snake_case 필드명 그대로 보관.

---

## 2. 팀 역할

| 역할 | 담당 | 범위 |
|------|------|------|
| 프론트엔드 리드 | 하대수 | React·D3·Zustand·API 연동 — 이 repo 주담당 |
| PM | 최수안 | 명세 승인·게이트 체크 |
| 백엔드 리드 | 바게스타니 샤킬라 | FastAPI 백엔드 repo. 이 repo의 API 제공자 |
| 파이프라인 리드 | 예병성 | 파이프라인 repo. 백엔드 DB 적재 제공 |

---

## 3. 디렉토리 구조

```
price-transmission-frontend/
├── CLAUDE.md                       ← 이 파일 (AI 컨텍스트 기준)
├── README.md
├── docs/                           ← 참조 명세 사본 (읽기 전용)
│   ├── CLAUDE.md                   ← 이 파일의 사본
│   ├── frame_spec_frontend_vN.md
│   ├── api_spec_vN.md
│   ├── db_schema_vN.md
│   ├── web_plan_vN.md
│   ├── exception_spec_vN.md
│   ├── exception_design_vN.md
│   ├── pipeline_output_spec_vN.md
│   └── docs_manifest.md            ← 버전 해석 SoT
├── src/
│   ├── api/
│   │   ├── client.ts               ← Axios 인스턴스 + Mock 인터셉터 + 에러 파서
│   │   ├── endpoints.ts            ← 18종 경로 상수
│   │   ├── error.ts                ← FEError / ApiError 클래스 + parseApiError
│   │   ├── errorChain.ts           ← traceErrorChain / formatErrorChain / formatErrorChainSummary
│   │   └── globalErrorHandler.ts   ← registerGlobalErrorHandler (window.onerror 등록)
│   ├── components/
│   │   ├── layout/                 ← AppShell · Header · FilterBar · Panel
│   │   └── charts/                 ← (feat/fe-*에서 D3 차트 추가)
│   ├── fixtures/                   ← Mock 응답 JSON (VITE_USE_MOCK=true 전용)
│   │   ├── commodities.json
│   │   ├── segments.json
│   │   ├── events.json
│   │   └── freshness.json
│   ├── pages/                      ← MainPage 등
│   ├── router/                     ← React Router v6 설정
│   ├── services/                   ← (feat/fe-*에서 데이터 변환 로직 추가)
│   ├── stores/                     ← Zustand 전역 스토어 (5 슬라이스)
│   ├── types/                      ← TypeScript 타입 (API 응답과 1:1, snake_case 유지)
│   │   ├── literals.ts             ← 모든 enum-like Literal의 단일 출처 (SoT)
│   │   └── ...
│   ├── App.tsx
│   ├── main.tsx                    ← Vite 진입점, 전역 에러 핸들러 등록
│   └── index.css
├── tests/
│   ├── setup.ts
│   └── frame_smoke.test.ts         ← Frame 단계 smoke test 3건
├── .env.example
├── package.json                    ← 27개 패키지 정확 버전 고정 (^ ~ 금지)
└── vite.config.ts
```

---

## 4. 기술 스택 (확정)

| 항목 | 선택 | 버전 |
|------|------|------|
| 언어 | TypeScript | 5.4.5 |
| 런타임 | Node.js | 20.11.1 |
| 번들러 | Vite | 5.2.11 |
| UI 프레임워크 | React | 18.3.1 |
| 시각화 | D3.js | 7.9.0 |
| 상태 관리 | Zustand | 4.5.2 |
| 라우터 | React Router | 6.23.0 |
| HTTP 클라이언트 | Axios | 1.6.8 |
| 서버 상태 | TanStack Query | 5.32.0 |
| 스타일 | Tailwind CSS | 3.4.3 |
| 테스트 | Vitest | 1.6.0 |
| 패키지 관리 | npm | 10.2.4 |

---

## 5. API 소비 원칙

1. **읽기 전용 소비자** — 전 엔드포인트 GET 방식. 이 repo는 백엔드 API를 소비하기만 한다.
2. **Base URL**: `VITE_API_BASE_URL` 환경 변수 (기본값: `http://localhost:8000/api/v1`)
3. **날짜 형식**: API 요청·응답 모두 `YYYY-MM` 문자열. `Date` 객체 자동 변환 **절대 금지** (frame_spec_frontend_vN §6.5).
4. **필드명**: snake_case 그대로 TypeScript 타입에 매핑. camelCase 변환 인터셉터 **절대 금지** (frame_spec_frontend_vN §6.1).
5. **에러 응답**: `{"error": {"code": "...", "message": "...", "context": {...}}}` envelope. `ApiError` 클래스로 wrapping.
6. **Mock 모드**: `VITE_USE_MOCK=true` 시 `src/fixtures/` 정적 JSON 반환. Mock 인터셉터 패턴은 frame_spec_frontend_vN §8.1 정책.
7. **이벤트 오버레이**: `/events` 별도 엔드포인트. 시계열 응답에 이벤트 데이터 포함 금지.
8. **시계열 envelope**: 응답에 항상 `requested_from`/`requested_to`/`actual_from`/`actual_to`/`granularity`/`total_points` 포함.

---

## 6. 엔드포인트 목록

| 그룹 | 메서드 | 경로 | 설명 |
|------|--------|------|------|
| 참조 | GET | `/commodities` | 품목 목록 + 메타 정보 |
| 참조 | GET | `/commodities/{commodity_id}` | 단일 품목 상세 |
| 참조 | GET | `/segments` | 분석 구간 정의 목록 |
| 참조 | GET | `/events` | 외부 충격 이벤트 목록 |
| 참조 | GET | `/freshness` | 데이터 기준 시점 및 다음 갱신 예정일 |
| 요약 | GET | `/anomalies/summary` | 이달의 이상 요약 배너 |
| 시각화 | GET | `/commodities/{commodity_id}/stream` | 스트림 그래프 시계열 + 이상 노드 |
| 시각화 | GET | `/commodities/{commodity_id}/stream/minimap` | 미니맵 전용 (전체 기간 압축) |
| 시각화 | GET | `/commodities/{commodity_id}/scatter` | 전달 구조 산점도 |
| 시각화 | GET | `/commodities/{commodity_id}/raw-prices` | 원시 시계열 (2020=100 지수 포함) |
| 시각화 | GET | `/commodities/{commodity_id}/raw-prices/minimap` | 원시 시계열 미니맵 |
| 패널 | GET | `/anomalies/{anomaly_id}/detail` | 분석 수치 패널 전체 |
| 패널 | GET | `/anomalies/{anomaly_id}/stat-series` | 지표별 인라인 시계열 |
| 패널 | GET | `/anomalies/{anomaly_id}/stat-snapshot` | 비시계열 지표 스냅샷 |
| 패널 | GET | `/anomalies/{anomaly_id}/irf` | IRF 차트 데이터 |
| 패널 | GET | `/anomalies/{anomaly_id}/ml-map` | ML 결과맵 2D 투영 데이터 |
| 방법론 | GET | `/meta/pipeline` | 파이프라인 플로우 데이터 (정적) |
| 방법론 | GET | `/meta/analysis-params` | 파이프라인 파라미터 기준값 (정적) |

---

## 7. Zustand 스토어 슬라이스 (web_plan_vN §11.1)

| 슬라이스 | 주요 상태 |
|----------|-----------|
| CommodityState | `commodities`, `primaryCommodityId`, `secondaryCommodityId` |
| FilterState | `filterFrom`, `filterTo`, `granularity`, `periodPreset`(6종·null=커스텀), `confidenceFilter`, `patternFilter`, `eventFilter`, `activeSegments` |
| ViewState | `activeTab`, `selectedAnomalyId`, `isPanelOpen`, `scatterSegment`(초기값 `'A'`) |
| OverlayState | `events`, `freshness`, `layoutNumber`, `isOnboardingVisible`, `hasSeenOnboardingThisSession`(세션 단위 온보딩 노출 제어) |
| PanelState | `panelWidth` (280~520), `expandedSections`, `expandedInlineCharts`, `expandedMLMaps` |

**주요 액션 이름 규칙** (IS-1 반영):
- 품목 선택: `setPrimaryCommodity(id)` / `setSecondaryCommodity(id)` (구 `selectPrimary/Secondary` 사용 금지)
- 필터 범위: `setFilterRange(from, to)` 통합 / `setFilterFrom(from)` · `setFilterTo(to)` 개별 (미니맵 브러시 핸들 개별 제어용)
- 산점도 구간: `setScatterSegment(segment)` (feature_spec_fe-scatter-chart_vN §1.3)
- 기간 프리셋: `setPeriodPreset(preset)` — 클릭 시 from/to 자동 계산은 FilterBar 컴포넌트 담당

---

## 8. 월 식별자 변환 규칙

| 계층 | 형식 | 예시 |
|------|------|------|
| DB (PostgreSQL) | `DATE` YYYY-MM-01 고정 | `'2022-03-01'` |
| API (백엔드) | `YYYY-MM` 문자열 (Pydantic serializer) | `"2022-03"` |
| **프론트엔드 (이 repo)** | `string` YYYY-MM — 변환 없이 그대로 유지 | `"2022-03"` |

**구현 규칙**:
- TypeScript 타입: 모든 날짜 필드 `string` 유지 (`Date` 변환 금지)
- 사용 시점에만 `date-fns` 파싱 (표시·비교 필요할 때만)
- `last_updated` 등 타임스탬프: ISO 8601 그대로 `string` 유지

---

## 9. 시계열 공통 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `from` | `YYYY-MM` | 품목별 `analysis_start` | 조회 시작 월 (inclusive) |
| `to` | `YYYY-MM` | 최신 데이터 기준 월 | 조회 종료 월 (inclusive) |
| `granularity` | string | `"monthly"` | `"monthly"` \| `"quarterly"` \| `"yearly"` |

---

## 10. 품목 분류 (db_schema_vN §commodities 초기 데이터 기준)

### 3구간 품목 — A-B-D′ (7종)

`commodity_id`: `wheat`, `maize`, `soybean`, `palm_oil`, `sugar`, `coffee`, `beef`  
`has_wholesale: false`, `route_type: "3seg"`, `segments: ["A", "B", "D_prime"]`

### 4구간 품목 — A-B-C-D (3종)

`commodity_id`: `groundnuts`, `banana`, `orange`  
`has_wholesale: true`, `route_type: "4seg"`, `segments: ["A", "B", "C", "D"]`

> ⚠️ `commodity_id` SoT는 `db_schema_vN` + `src/fixtures/commodities.json`. 다른 문서의 표기(`corn`, `peanut` 등)가 있더라도 이쪽이 정답이다.

---

## 11. 신뢰도 등급

| 등급 | API 값 | 의미 |
|------|--------|------|
| 고신뢰 | `"high"` | 통계 + ML 동시 확인 |
| 중신뢰 | `"medium"` | 통계 확인 + ML 미탐지 |
| 참고 | `"reference"` | ML 탐지 + 통계 미탐지 |

---

## 12. 예외 코드 (이 repo 담당 도메인)

### FE 도메인 (FE-*)

| 코드 | 원인 | 처리 방침 |
|------|------|-----------|
| `FE-API-001` | React Query 요청 실패 (네트워크) | toast + retry |
| `FE-API-002` | 400 에러 응답 (잘못된 파라미터) | 필터 UI 오류 표시 |
| `FE-API-003` | 404 에러 응답 (리소스 미존재) | 빈 상태 UI |
| `FE-API-004` | 500 에러 응답 (서버 오류) | fallback UI |
| `FE-API-005` | MOCK 모드 경로 미매칭 | warn 로그 |
| `FE-D3-001` | D3 SVG 렌더링 실패 | 차트 영역 fallback |
| `FE-D3-002` | 스케일 입력 데이터 비어있음 | 빈 차트 표시 |
| `FE-D3-003` | IRF/ML맵 데이터 파싱 실패 | 섹션 fallback |
| `FE-STORE-001` | Zustand 상태 업데이트 실패 | console.error |
| `FE-STORE-002` | 패널 너비 범위 초과 | clamp(280, 520) |
| `FE-MOCK-001` | fixture JSON 파싱 실패 | console.error + empty |

### PARSE 도메인 (API→FE 경계)

| 코드 | 원인 | 처리 방침 |
|------|------|-----------|
| `PARSE-DATE-002` | API `YYYY-MM` 형식 아닌 값 수신 | FE-API-004로 상승 |
| `PARSE-NUM-002` | API 숫자 필드 `null` / `NaN` | D3 필터링 |
| `PARSE-ARR-002` | API 배열 필드 비배열 수신 | FE-API-004로 상승 |
| `PARSE-ENUM-002` | API Literal 값 범위 외 | warn 로그 |
| `PARSE-SCHEMA-001` | 응답 구조 전체 불일치 | FE-API-004로 상승 |

### 외부 코드 (api_spec_vN §에러 코드 정의)

`COMMODITY_NOT_FOUND`, `ANOMALY_NOT_FOUND`, `WARMUP_PERIOD_ONLY`, `INVALID_DATE_RANGE`, `INVALID_GRANULARITY`, `INVALID_SEGMENT`, `WHOLESALE_NOT_AVAILABLE`, `INTERNAL_ERROR` 등 13종 + `INTERNAL_ERROR` 1종

> ⚠️ 신규 예외 상황은 `exception_spec_vN.md`에 등록 확정 전까지 임의 코드 사용 금지. 신규 상황은 `(proposed)` 표식으로 PM에게 제안.

**예외 사용 패턴** (IS-6/IS-7 반영 — `cause`를 `context.cause`로 보관):
```typescript
// FEError: cause를 context 필드로 보관 (ES2022 Error.cause 사용 금지)
throw new FEError('FE-D3-001', '데이터 빈 배열', {
  cause: originalError,
  chart_type: 'stream',
});

// ApiError: parseApiError가 생성. 직접 생성 시 body.context.cause에 원인 삽입
throw new ApiError(
  { code: 'FE-API-003', message: '품목 미존재', context: { commodityId, cause: originalError } },
  httpStatus,
);
```

---

## 13. 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | 백엔드 Base URL |
| `VITE_USE_MOCK` | `true` | `true` = src/fixtures/ 정적 데이터, `false` = 실 API |
| `VITE_APP_TITLE` | `가격 전달 이상 탐지` | `<title>` 태그 |

---

## 14. 필드명 드리프트 방지

API JSON 키 이름 ↔ TypeScript 타입 필드명은 동일한 `snake_case` 유지.

기준 문서 체인: `api_spec_vN.md` → `src/types/*.ts`

코드 생성 시 명시:
```
"이 필드명은 api_spec_vN.md §{엔드포인트}의 response.{field}와 동일한 이름을 사용해줘."
```

---

## 15. 절대 금지사항 (frame_spec_frontend_vN §8.10)

1. **`localStorage` / `sessionStorage` 사용 금지** — 상태는 Zustand, 캐시는 React Query 전용
2. **`Date` 자동 변환 금지** — API 날짜 필드를 JS `Date` 객체로 자동 변환하는 인터셉터·util 생성 금지. 사용 시점에만 `date-fns` 파싱
3. **camelCase 변환 인터셉터 금지** — axios 응답을 camelCase로 변환하는 코드 생성 금지
4. **미등록 예외 코드 생성 금지** — `exception_spec_vN.md`에 없는 에러 코드 임의 생성 금지. 신규 상황은 `(proposed)` 표식으로 제안
5. **feat/* 브랜치 선행 구현 금지** — Feature 명세 PM 승인 전 `feat/` 브랜치 생성 및 코드 생성 금지
6. **이벤트 데이터 시계열 응답 포함 금지** — 이벤트 오버레이는 `/events` 엔드포인트 분리
7. **명세 없는 Literal 추가 금지** — `src/types/literals.ts`에 `db_schema_vN` / `api_spec_vN` 미등록 값 추가 금지 (PM 검토 중인 `'symmetric'` 예외)
8. **구체 버전 하드코딩 금지** — 코드 주석·docstring에 `exception_design_v3`, `api_spec_v5` 등 구체 버전 표기 금지. `_vN` 사용 (manifest §2.1)

---

## 16. 자동 선택 정책

> 참조 위치: `feature_spec_fe-stream-chart_vN §1.3`, `feature_spec_fe-onboarding_vN §1.2`

품목 자동 선택 및 상태 초기화 규칙:

| 조건 | 동작 |
|------|------|
| `/commodities` 응답 수신 + `primaryCommodityId === null` | `setCommodities` 이후 `setPrimaryCommodity(commodities[0].id)` 자동 호출 |
| 주 품목 변경 (`setPrimaryCommodity`) | `activeSegments`를 해당 품목의 `commodity.segments` 전체로 초기화 (구현: `useAppStore.ts`) |
| 보조 품목 | 자동 선택 없음 — 사용자 명시 선택 전용 |
| 온보딩 | `hasSeenOnboardingThisSession === false`일 때만 표시. 세션 내 1회 노출 후 `setHasSeenOnboardingThisSession(true)` |

> ⚠️ 자동 선택은 `main.tsx` 또는 데이터 훅의 `onSuccess` 콜백에서만 수행. 컴포넌트 render 함수 내 직접 `setPrimaryCommodity` 호출 금지.

---

## 17. Git 커밋 컨벤션

형식: `[{영역}] {동사} {대상}`

| 영역 예시 | 용도 |
|-----------|------|
| `[FE-API]` | API 클라이언트·에러 파서 |
| `[FE-Layout]` | 레이아웃 컴포넌트 (Header·Panel·FilterBar) |
| `[FE-Chart]` | D3 차트 컴포넌트 |
| `[FE-Panel]` | 분석 패널 컴포넌트 |
| `[FE-Store]` | Zustand 스토어 |
| `[FE-Types]` | TypeScript 타입·Literal |
| `[FE-Test]` | Vitest 테스트 |
| `[CLAUDE.md]` | 이 파일 수정 |

예시:
```
[FE-Layout] Fix Header viewTabs to 3 items per web_plan_vN §3.3
[FE-API] Replace stale exception_design version refs with _vN
[CLAUDE.md] Add frontend context for frame/frontend branch
```

**CLAUDE.md 수정은 반드시 단독 커밋.**

---

## 18. 세션 간 컨텍스트 승계 포맷

새 세션 시작 시 아래 포맷으로 제공:

```markdown
## 직전 세션 요약
- 완료한 작업: [예: Header 방법론 탭 중복 제거]
- 확정된 컴포넌트명·타입명: [예: ViewTab, useAppStore.activeTab]
- 다음 작업: [예: Panel.tsx 주석 _vN 정정]
- 미결 항목: [예: ROCKET_FEATHER_DIRECTIONS 'symmetric' PM 결정 대기]
```

세션 15~20회 초과 시 정렬 프롬프트:
```
"지금까지 이 세션에서 확정한 컴포넌트명·타입명·Zustand 슬라이스 구조를 요약해줘.
CLAUDE.md의 내용과 달라진 부분이 있으면 함께 알려줘."
```

---

## 19. 참조 문서 경로

| 문서 | 경로 |
|------|------|
| 프론트엔드 Frame 명세 | `docs/frame_spec_frontend_vN.md` |
| API 명세 | `docs/api_spec_vN.md` |
| DB 스키마 | `docs/db_schema_vN.md` |
| UI/UX 웹 플랜 | `docs/web_plan_vN.md` |
| 예외처리 명세 | `docs/exception_spec_vN.md` |
| 예외처리 설계 | `docs/exception_design_vN.md` |
| 파이프라인 출력 명세 | `docs/pipeline_output_spec_vN.md` |
| 버전 해석 SoT | `docs/docs_manifest.md` |

> 표기 규칙: 본문에서는 `abcd_vN.md` 형식을 그대로 유지한다 (manifest §2.1). `vN` → 실제 파일 해석은 [`docs/docs_manifest.md`](docs/docs_manifest.md) §1 표를 통해 이뤄진다. 구체 버전을 박아두지 않는 이유는 상위 명세 갱신 시 하위 참조 동기화 누락으로 인한 "구버전 정의를 따라 코딩" 사고를 방지하기 위함이다. 클릭 가능한 링크가 필요한 경우(README·PR 본문 등)에만 최신 구체 버전을 사용한다.

---

## ⚠️ StreamChart 설계 계약 (회귀 방지) — 2026-05-21 확정

> **다음 항목은 사용자가 명시적으로 요구한 UX 결정사항이다. 리팩토링 시 반드시 보존한다.**

### 줌 동작
- **휠 즉각 반응**: `on('zoom')` 핸들러는 transform을 **직접 동기 적용**. RAF throttle 금지 (휠 응답 지연 원인).
- **줌 멈춤 = 차트 멈춤**: 줌 종료 후 어떠한 후속 애니메이션·transition도 금지. 사용자가 손 뗀 순간 차트도 정지.
- **X축은 사용자가 정한 viewport 그대로 유지**. 자동 보정·snap·후속 이동 금지.

### Y축
- **줌·팬 중 Y축 고정**. viewport 변화에 따라 Y 도메인 재계산 금지.
- Y 도메인은 **chartData 진입 시 1회 산출 후 고정**. 다음 chartData 변경 시까지 유지.
- 초기 Y 도메인 계산은 viewport(filterFrom/To) 안 anomaly transmission_rate ±3 패딩.

### 노드 표현
- **+N 클러스터 배지 금지**. 정보 손실 + 시각 혼란 + 줌 모드 전환 시 깨짐 → 사용 안 함.
- 노드 겹침은 **pixel-distance bucket spread (좌우 분산)**로만 해결.
- 시간 기반 cluster (서비스 레이어 `clusterAnomalies`) 금지. 단일 진실 공급원: 렌더 레이어 픽셀 bucket.
- bucket 안 노드는 클릭 가능한 개별 원으로 모두 렌더. 숨김 금지.

### 곡선
- `curveStepAfter` 또는 `curveStep` 사용. catmull-rom·monotone 등 spline 금지 (월별 sparse data에 거짓 중간값 생성).

### 이벤트 오버레이
- `data-event-key` attr selector 사용. `selectAll('rect')` 인덱스 매칭 금지.

### 코드 구조
- D3 헬퍼는 `src/components/charts/streamChartHelpers.ts`에 분리.
- StreamChart.tsx의 setup useEffect는 헬퍼 함수로 단계 분리 (drawXAxis/drawYAxis/renderNodes/applyTransform).
- SVG `<animate>` 금지. CSS `@keyframes` 사용 (`.anomaly-pulse-high` in index.css).

---

*이 파일은 `docs/team_ai_collab_vN.md §3.1` 운용 원칙에 따라 관리된다. 디렉토리 구조·API 설계·예외 코드가 변경되면 CLAUDE.md를 즉시 갱신하고 단독 커밋한다.*

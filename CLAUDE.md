# CLAUDE.md — Frontend

> **Claude Code 세션 자동 참조 컨텍스트 파일 (프론트엔드 repo 전용)**  
> 이 파일은 세션마다 반복 입력이 필요한 전역 제약·설계 결정·컴포넌트 구조를 집중 관리한다.  
> 변경 시 단독 커밋: `[CLAUDE.md] Update {변경 내용}`

**최초 작성**: 2026-04-28  
**최종 갱신**: 2026-05-06 (frame 재정비)  
**담당**: PM 최수안  
**참조 기준 문서**: `web_plan_vN`, `api_spec_vN`, `exception_spec_vN`, `frame_spec_frontend_vN`, `team_ai_collab_vN` — 버전 해석은 `docs/docs_manifest.md`를 따른다

---

## 1. 프로젝트 요약

- **과제명**: 계량경제학 모형과 머신러닝 기반 소비자 물가 분석 및 이상 탐지를 위한 모델 개발
- **이 repo의 역할**: React 프론트엔드 — 백엔드 FastAPI에서 분석 결과를 받아 시각화
- **데이터 흐름**: 파이프라인 repo → PostgreSQL → 백엔드 repo (FastAPI) → **이 repo** (React)
- **핵심 원칙**: 프론트엔드는 분석 결과를 있는 그대로 시각화하는 구현체. 자체 연산·판정 금지. 백엔드 API 응답을 렌더링하는 것이 전부

---

## 2. 팀 역할

| 역할 | 담당 | 범위 |
|------|------|------|
| 프론트엔드 리드 | 하대수 | 시각화·UI·라우팅 전체 — 이 repo 주담당 |
| PM | 최수안 | 명세 승인·게이트 체크 |
| 백엔드 리드 | 샤킬라 | 백엔드 repo. 이 repo의 API 공급자 |

---

## 3. 디렉토리 구조

> **단일 SoT**: 본 §3은 `frame_spec_frontend_vN.md §2` 디렉토리 구조와 정합한다.  
> Frame 단계에 실제로 생성된 폴더·파일과, feat/* 브랜치에서 추가될 신규 폴더(주석 표시)를 함께 기재.

```
price-transmission-frontend/
├── CLAUDE.md                           ← 이 파일 (frame 갱신 후 동기화)
├── README.md
├── docs/                               ← 참조 명세 사본
│   ├── web_plan_vN.md
│   ├── api_spec_vN.md
│   ├── exception_spec_vN.md
│   ├── frame_spec_frontend_vN.md
│   ├── feature_dev_list_vN.md
│   ├── feature_spec_FE-LAY_vN.md       ← feat/fe-layout-filter
│   ├── feature_spec_FE-STREAM_vN.md    ← feat/fe-stream-chart
│   ├── feature_spec_FE-MINIMAP_vN.md   ← feat/fe-minimap
│   ├── feature_spec_FE-PANEL_vN.md     ← feat/fe-panel
│   └── ...                             ← 후속 feat 명세서
├── src/
│   ├── main.tsx                        ← Vite 진입점
│   ├── App.tsx                         ← QueryClientProvider + RouterProvider
│   ├── index.css                       ← Tailwind import
│   ├── vite-env.d.ts                   ← Vite 환경 변수 타입 선언
│   ├── api/                            ← Axios API 클라이언트
│   │   ├── client.ts                   ← Axios 인스턴스 + Mock 인터셉터 (regex 분기)
│   │   ├── endpoints.ts                ← api_spec_vN 18종 경로 상수
│   │   └── error.ts                    ← API 에러 envelope 파서 + ApiError
│   ├── components/
│   │   ├── layout/                     ← 전역 레이아웃 (frame 단계 자리표시자)
│   │   │   ├── AppShell.tsx            ← 상단바·필터바·메인·패널 결합 래퍼
│   │   │   ├── Header.tsx              ← 상단바 (web_plan_vN §3.3, 4탭)
│   │   │   ├── FilterBar.tsx           ← 필터 바 (web_plan_vN §3.4)
│   │   │   └── Panel.tsx               ← 우측 분석 수치 패널 (자리표시자, feat/fe-panel가 AnalysisPanel로 대체)
│   │   └── charts/
│   │       └── .gitkeep                ← feat/* 브랜치에서 D3 컴포넌트 추가 (frame_spec §8.6)
│   ├── stores/
│   │   └── useAppStore.ts              ← 단일 Zustand 스토어 (5개 슬라이스 결합 구조 — §7 참조)
│   ├── types/                          ← API 응답 구조와 1:1 대응 (frame_spec §6)
│   │   ├── commodity.ts                ← /commodities, /segments 응답
│   │   ├── anomaly.ts                  ← /anomalies/* 응답 (요약, 패널, IRF, ML 결과맵)
│   │   ├── timeseries.ts               ← /stream, /scatter, /raw-prices, /minimap 응답
│   │   ├── event.ts                    ← /events 응답
│   │   ├── meta.ts                     ← /meta/pipeline, /meta/analysis-params, /freshness 응답
│   │   ├── error.ts                    ← API 에러 envelope (frame_spec §6.4)
│   │   ├── literals.ts                 ← Literal SoT (ConfidenceGrade, SegmentId, ViewTab 등)
│   │   └── index.ts                    ← barrel re-export
│   ├── fixtures/                       ← Mock 데이터 (VITE_USE_MOCK=true)
│   │   ├── commodities.json            ← /commodities 10행
│   │   ├── segments.json               ← /segments 5행
│   │   ├── events.json                 ← /events 5건
│   │   ├── freshness.json              ← /freshness 고정값
│   │   └── ...                         ← feat/* 브랜치에서 stream/minimap/anomaly_detail/irf/ml_map 등 추가
│   ├── services/
│   │   └── .gitkeep                    ← feat/* 브랜치에서 데이터 변환·집계 로직 추가 (frame_spec §8.7)
│   ├── pages/
│   │   └── MainPage.tsx                ← 메인 페이지 (자리표시자)
│   ├── router/
│   │   └── index.tsx                   ← React Router v6 라우터
│   ├── hooks/                          ← (feat/* 브랜치 신규 추가) React Query 훅
│   │   ├── useStreamData.ts            ← feat/fe-stream-chart
│   │   ├── useMinimapData.ts           ← feat/fe-minimap
│   │   ├── useAnomalyDetail.ts         ← feat/fe-panel
│   │   ├── useStatSeries.ts            ← feat/fe-panel
│   │   ├── useStatSnapshot.ts          ← feat/fe-panel
│   │   ├── useIRF.ts                   ← feat/fe-panel
│   │   └── useMLMap.ts                 ← feat/fe-panel
│   └── utils/                          ← (feat/* 브랜치 신규 추가)
│       ├── colorUtils.ts               ← 신뢰도·패턴·구간 색상 상수
│       └── dateUtils.ts                ← YYYY-MM 파싱·포맷
├── tests/
│   ├── setup.ts
│   └── frame_smoke.test.ts             ← frame_spec §7.4 smoke test
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
└── package.json
```

> **D3.js 차트 컴포넌트 위치 정책**: frame_spec §8.6은 D3 컴포넌트를 `src/components/charts/` 빈 폴더로 두고 feat/* 브랜치에서 추가하도록 명시. feature 명세서들이 가정한 `views/StreamView/`, `panel/charts/` 등 별도 디렉토리는 frame_spec 정책과 충돌 — 각 feat 명세서 §1.3에서 `components/charts/` 또는 `panel/`(또는 명시된 새 디렉토리) 중 선택하여 PM 합의 후 진행한다.

---

## 4. 기술 스택 (확정)

| 항목 | 선택 | 버전 |
|------|------|------|
| 언어 | TypeScript | 최신 |
| 프레임워크 | React | 18 |
| 빌드 도구 | Vite | 최신 |
| 스타일 | Tailwind CSS | 최신 |
| **시각화** | **D3.js** | **v7** (전 차트 공통) |
| 상태 관리 | Zustand | 최신 |
| 라우팅 | React Router | v6 |
| HTTP 클라이언트 | Axios | 최신 |
| 서버 상태 | React Query (TanStack Query) | 최신 |
| 컨테이너 | Docker + Docker Compose | — |

> ⚠️ 시각화 라이브러리는 D3.js v7 단일 사용. Chart.js, Recharts 등 대안 라이브러리 추가 금지.

---

## 5. API 연동 원칙

- **Base URL**: `/api/v1`
- **날짜 형식**: API 요청·응답 모두 `YYYY-MM` 문자열 (프론트 내부 처리도 동일)
- **인증**: 없음 (1차 출시 기준)
- **이벤트 오버레이**: 시계열 응답에 이벤트 데이터가 없음. `/events` 엔드포인트를 별도 조회하여 클라이언트에서 오버레이

**시계열 공통 쿼리 파라미터**:
- `from` / `to`: `YYYY-MM` 형식. 기본값: 품목별 `analysis_start` / 최신 기준 월
- `granularity`: `"monthly"` | `"quarterly"` | `"yearly"`. 기본값: `"monthly"`

**시계열 응답 공통 envelope** (모든 시계열 엔드포인트):
```typescript
interface TimeseriesEnvelope {
  requested_from: string;  // YYYY-MM
  requested_to:   string;
  actual_from:    string;
  actual_to:      string;
  granularity:    "monthly" | "quarterly" | "yearly";
  total_points:   number;
}
```

---

## 6. TypeScript 타입 — API 필드명 드리프트 방지

**원칙** (frame_spec_vN §6.1·§6.2·§6.3 준수):
- API 응답 JSON 키를 변형 없이 `snake_case` 그대로 사용 (camelCase 변환 인터셉터 금지)
- 모든 literal 타입은 `src/types/literals.ts`가 SoT — 타 파일에서 동일 유니온 직접 선언 금지
- 날짜 필드는 모두 `string` 타입 (자동 Date 변환 금지, frame_spec §6.5)

핵심 타입 예시 (정확한 정의는 `src/types/literals.ts`·`anomaly.ts`·`commodity.ts` 참조):

```typescript
// literals.ts — SoT
type ConfidenceGrade = "high" | "medium" | "reference";
type SegmentId = "A" | "B" | "C" | "D" | "D_prime";
type PrimaryPattern = "pattern1" | "pattern2" | "pattern3";
type ViewTab = "stream" | "scatter" | "raw-prices" | "methodology";
type MlModel = "isolation_forest" | "lof" | "ocsvm";

// anomaly.ts — 스트림 차트용 이상 노드 (api_spec_vN /stream 응답)
interface StreamAnomalyNode {
  anomaly_id:        number;          // ← integer (frame_spec §6.2)
  segment_id:        SegmentId;
  period:            string;          // YYYY-MM
  primary_pattern:   PrimaryPattern;  // ← literal union (1|2|3 아님)
  pattern_types:     PrimaryPattern[];
  confidence_grade:  ConfidenceGrade;
  transmission_rate: number;
  is_new:            boolean;
}

// commodity.ts — 품목 메타
interface Commodity {
  commodity_id:            string;
  name_kr:                 string;
  name_en:                 string;
  cluster:                 "grain" | "oil_sugar" | "tropical" | "livestock" | "independent";
  has_wholesale:           boolean;
  route_type:              "3seg" | "4seg";
  segments:                SegmentId[];
  analysis_start:          string;     // YYYY-MM
  analysis_end:            string;     // YYYY-MM
  has_anomaly_this_month:  boolean;
  latest_anomaly_grade:    ConfidenceGrade | null;
}
```

> **이전 버전의 잘못된 예시 정정**: 과거 본 §6은 `anomaly_id: string`, `primary_pattern: 1|2|3`, `pattern_types: number[]`로 표기했으나 모두 frame_spec_vN §6.2 매트릭스 위반. 위 예시가 정정된 SoT.

---

## 7. Zustand 스토어 구조

**단일 스토어**: `src/stores/useAppStore.ts` 안에 5개 슬라이스를 결합. feature_spec_FE-LAY_vN 합의 사항.

| 슬라이스 | 관리 상태 |
|----------|-----------|
| Commodity | `commodities`, `primaryCommodityId`, `secondaryCommodityId` |
| Filter | `filterFrom`, `filterTo`, `granularity`, `confidenceFilter`, `patternFilter`, `eventFilter` (다중 토글), `activeSegments` |
| View | `activeTab` (4탭), `selectedAnomalyId`, `isPanelOpen` |
| Overlay | `events`, `freshness`, `layoutNumber` (raw-prices 전용), `isOnboardingVisible` |
| Panel | `panelWidth`, `expandedSections` (Set), `expandedInlineCharts` (Set), `expandedMLMaps` (Set) |

> **이전 버전 정정**: 과거 본 §7은 5개 별도 스토어(`commodityStore.ts` 등)를 명시했으나 frame 실제는 단일 `useAppStore.ts` 슬라이스 결합. 본 갱신으로 정합.

---

## 8. 화면 구성 및 뷰 목록

### 전체 레이아웃

```
[이달의 이상 요약 배너 — 상단 고정]
[상단 바: 서비스명 / 주 품목 / 보조 품목 / 뷰 탭 / 방법론 탭 / 데이터 기준 시점]
[필터 바: 기간 프리셋 / 사건(토글 드롭다운) / 신뢰도 / 패턴 / 구간 토글 / 레이아웃(원시 시계열 전용)]
┌─────────────────────────────────────┬──────────────────────┐
│  메인 시각화 영역                   │  분석 수치 패널      │
│  (흐름 보기 / 전달 구조 / 원시 시계열) │  (노드 클릭 시 슬라이드인) │
├─────────────────────────────────────┤                      │
│  하단 미니맵 (흐름 보기·원시시계열) │                      │
└─────────────────────────────────────┴──────────────────────┘
[하단: 범례 / 도움말 버튼]
```

### 뷰 목록

| 뷰 | 컴포넌트 | 시각화 | API 엔드포인트 |
|----|----------|--------|----------------|
| 흐름 보기 | `StreamView` | D3.js 스트림 그래프 | `/stream`, `/stream/minimap` |
| 전달 구조 | `ScatterView` | D3.js 연결 산점도 | `/scatter` |
| 원시 시계열 | `RawPricesView` | D3.js 시계열 6종 레이아웃 | `/raw-prices`, `/raw-prices/minimap` |
| 방법론 탭 | `MethodologyView` | D3.js 플로우 (대안: SVG) | `/meta/pipeline`, `/meta/analysis-params` |

---

## 9. 스트림 그래프 상세 규칙

- **Y축**: 전이율 직접값 (API 응답값 그대로, 가공 금지)
- **X축**: 월별 시간. 초기 표시 범위: 현재 기준 3년
- **곡선 색상**: 구간 A(청색), 구간 B(녹색), 구간 D′(주황)
- **보조 품목 오버레이**: 투명도 40%, 별도 색상 팔레트(청록·보라·분홍)
- **확대/축소**: 마우스 휠 — 포인터 위치 중심 X축 확대/축소. 최소 3개월, 최대 전체 기간

### 이상 노드 시각화

| 신뢰도 | 색상 | 반지름 | 효과 |
|--------|------|--------|------|
| 고신뢰 (`high`) | `#e24b4a` | 7px | 글로우 + 펄스 |
| 중신뢰 (`medium`) | `#ef9f27` | 5.5px | 글로우 |
| 참고 (`reference`) | `#c8d850` | 4px | 없음 |

- `is_new: true`인 노드에 "NEW" 배지 표시
- 첫 진입 시: 가장 최근 고신뢰 이상 노드 자동 선택 + 패널 자동 오픈
- 노드 클릭: `panelStore`에 `anomaly_id` 저장 → 패널 슬라이드인

---

## 10. 분석 수치 패널 상세 규칙

- **패널 너비**: 최소 280px · 최대 520px · 좌측 경계 드래그 조절
- **슬라이드인**: 이상 노드 클릭 시 우측에서 슬라이드인. `×` 버튼으로 닫기
- **섹션 구성** (4개, 각각 독립 접기/펼치기):
  1. 계량경제학 수치 (`StatSection`)
  2. ML 판정 (`MLSection`)
  3. 패턴 판정 경로 (`JudgmentPathSection`)
  4. IRF 차트 (`IRFSection`)

### 계량경제학 수치 섹션 인라인 그래프

각 수치 항목 클릭 시 해당 지표 시계열 그래프를 인라인으로 펼침. 다중 동시 펼침 허용.

| 항목 | 인라인 그래프 타입 |
|------|--------------------|
| 전이율 | 시계열 + 롤링 평균선 + 정상 범위 밴드 |
| Z-score | 시계열 + 임계선 (2.0 주의 / 2.5 경보) |
| IQR 판정 | 박스플롯 |
| ECT 수준 | 시계열 + 기준선(0) |
| TECM α⁺/α⁻ | 겹친 히스토그램 |
| IRF 피크 시차 | IRF 곡선 (`IRFSection`과 동일) |
| Bai-Perron | 전이율 시계열 + 구조 변화 시점 수직선 |

### ML 판정 섹션

- `ml_vote`: "3개 모델 중 N개 탐지"
- 모델별 이상 점수 바 차트 (Isolation Forest / LOF / One-Class SVM)
- 각 모델 행 클릭 → 결과맵 인라인 확장 (다중 동시 펼침 허용)

---

## 11. 기간 프리셋 및 필터 초기값

| 필터 | 초기값 |
|------|--------|
| 기간 프리셋 | **3년** (전 품목 공통) |
| granularity | `"monthly"` |
| 신뢰도 필터 | 고신뢰 + 중신뢰 |
| 패턴 필터 | 전체 |
| 사건 필터 | 전체 해제 |
| 구간 토글 | 품목 분석 경로에 포함된 구간 전체 ON |

기간 프리셋은 품목 전환 시 직전 선택값 유지.

---

## 12. 이벤트 오버레이 목록 (사건 필터)

| 이벤트명 | 기간 | 배경 색상 |
|----------|------|-----------|
| 2008 금융위기 | 2008.07~2009.03 | 주황 음영 |
| 2020 코로나19 | 2020.02~2021.06 | 녹색 음영 |
| 2021~22 브라질 서리 | 2021.07~2022.03 | 하늘 음영 |
| 2022 우크라이나 사태 | 2022.02~2022.10 | 빨강 음영 |
| 2022 인도네시아 팜유 수출 규제 | 2022.04~2022.05 | 주황 음영 |

이벤트 배경 음영은 클라이언트에서 `/events` 응답 기반으로 오버레이. 시계열 API 응답에 이벤트 데이터 없음.

---

## 13. 원시 시계열 뷰 레이아웃 6종

`/raw-prices` 요청 시 `layout` 파라미터로 구분. Y축: 2020=100 지수로 통일.

| 레이아웃 | 구성 | 3구간 가능 | 4구간 가능 |
|----------|------|:----------:|:----------:|
| 1 | 단일 차트 (소스 on/off 토글) | ✔ | ✔ |
| 2 | 구간별 2분할 (상류·하류 나란히) | ✔ | ✔ |
| 3 | 전이율 오버레이 + 원시 시계열 병렬 | ✔ | ✔ |
| 4 | 도매가 중심 4단계 폭포형 | ✖ | ✔ |
| 5 | 수입→PPI 확대 + CPI 병렬 | ✔ | ✔ |
| 6 | 전체 5단계 스택 (2020=100 지수 기준) | ✔ | ✔ |

3구간 품목에 레이아웃 4 요청 시 → `API-LAY-002` (400 `WHOLESALE_NOT_AVAILABLE`) 수신 → `FE-FALLBACK` 처리 후 레이아웃 1로 폴백.

---

## 14. 예외 코드 (이 repo 담당 도메인)

### FE 도메인 (FE-*)

| 코드 | 발생 위치 | 원인 | 처리 방침 |
|------|-----------|------|-----------|
| `FE-API-001` | React Query | 네트워크 실패 | FE_TOAST + 재시도 버튼 |
| `FE-API-002` | React Query | API 400 응답 | FE_TOAST (사용자 입력 오류 안내) |
| `FE-API-003` | React Query | API 404 응답 | FE_FALLBACK (빈 상태 UI) |
| `FE-API-004` | React Query | API 500 응답 | FE_BLOCK (에러 UI) |
| `FE-API-005` | React Query | 응답 타임아웃 | FE_TOAST + 재시도 버튼 |
| `FE-D3-001` | D3.js 렌더링 | `points: []` 빈 배열 | FE_FALLBACK (빈 차트) |
| `FE-D3-002` | D3.js 렌더링 | NaN 포함 데이터 | FE_FALLBACK |
| `FE-D3-003` | D3.js 렌더링 | SVG 컨테이너 크기 0 | FE_FALLBACK |
| `FE-STORE-001` | Zustand | 상태 hydration 실패 | FE_FALLBACK (초기 상태 복구) |
| `FE-STORE-002` | Zustand | 선택 품목 ↔ API 품목 불일치 | FE_TOAST |
| `FE-MOCK-001` | Mock 모드 | fixture 파일 없음 | FE_BLOCK (개발환경 전용) |

### PARSE 도메인 — API→FE 경계 (FE에서 처리)

| 코드 | 원인 | 처리 방침 |
|------|------|-----------|
| `PARSE-DATE-002` | `YYYY-MM` 파싱 실패 | FE_FALLBACK |
| `PARSE-NUM-002` | 숫자 필드가 `null` / `NaN` 문자열 | FE_FALLBACK |
| `PARSE-ARR-002` | 배열 응답에서 예상 필드 누락 | FE_FALLBACK |
| `PARSE-ENUM-002` | API 문자열이 TypeScript union 외 | FE_TOAST |
| `PARSE-SCHEMA-001` | 응답 envelope 구조 불일치 | FE_BLOCK |

**예외 사용 패턴**:
```typescript
throw new FEError("FE-API-001", "API 응답 파싱 실패", {
  endpoint: "/commodities/wheat/stream",
  status: 200,
  field: "data.points[0].period",
});
```

> ⚠️ 신규 예외 상황은 `(proposed)` 표식으로 PM에게 제안 후 `exception_spec_vN.md` 등록 확정 전까지 임의 코드 사용 금지.

---

## 15. 절대 금지사항

1. **D3.js 외 시각화 라이브러리 추가 금지**: Chart.js, Recharts, Nivo 등 추가 시각화 라이브러리 설치 및 사용 금지
2. **API 응답값 자체 가공·재계산 금지**: 전이율, Z-score, 신뢰도 등 분석 수치는 백엔드 API 응답값을 그대로 렌더링. 프론트에서 임의 재계산 금지
3. **미등록 예외 코드 생성 금지**: `exception_spec_vN.md`에 없는 `FE-*` / `PARSE-*` 코드 임의 생성 금지. `(proposed)` 표식으로 제안 후 PM 리뷰 확정
4. **명세 없는 코딩 금지**: Feature 명세 PM 승인 전 `feat/` 브랜치 생성 및 코드 생성 금지
5. **이벤트 데이터 시계열에서 추출 금지**: 이벤트 오버레이는 `/events` 별도 호출. 시계열 응답에서 이벤트 정보를 파싱하는 코드 작성 금지
6. **3구간 품목에 도매가 관련 UI 표시 금지**: `has_wholesale: false`인 품목에서 구간 C·D·레이아웃 4 UI 요소 노출 금지
7. **Mock 모드 코드 프로덕션 혼입 금지**: `VITE_USE_MOCK=true` 관련 코드는 환경 변수로만 분기. 하드코딩 금지

---

## 16. 온보딩 규칙

- **최초 진입 시** 인터랙티브 4단계 가이드 실행 (실제 화면 위에서 진행)
- **재진입 시** 스킵. 도움말("?") 버튼에서 다시 보기 가능
- **자동 선택**: 서비스 진입 시 가장 최근 고신뢰 이상 노드 자동 선택 + 패널 오픈

| 단계 | 안내 내용 |
|------|-----------|
| 1 | 최근 고신뢰 노드 가리킴 — "이 빨간 점이 이상 탐지 시점입니다. 클릭하면 분석 수치를 볼 수 있습니다" |
| 2 | 계량경제학 수치 섹션 가리킴 — "항목을 클릭하면 해당 지표의 개별 그래프를 확인할 수 있습니다" |
| 3 | ML 판정 섹션 가리킴 — "ML 모델 행을 클릭하면 각 모델이 분석한 결과맵을 볼 수 있습니다" |
| 4 | 방법론 탭 가리킴 — "방법론 탭에서 파이프라인 전체 설명을 확인하세요" |

---

## 17. Git 커밋 컨벤션

형식: `[{영역}] {동사} {대상}`

| 영역 예시 | 용도 |
|-----------|------|
| `[Stream]` | 스트림 그래프 관련 |
| `[Scatter]` | 산점도 관련 |
| `[Panel]` | 분석 수치 패널 관련 |
| `[Filter]` | 필터 바 관련 |
| `[Store]` | Zustand 상태 관련 |
| `[API]` | API 클라이언트·훅 관련 |
| `[Types]` | TypeScript 타입 정의 |
| `[CLAUDE.md]` | 이 파일 수정 |

예시:
```
[Stream] Add anomaly node pulse animation for high-confidence
[Panel] Add inline Z-score chart with threshold lines
[Filter] Add event overlay toggle dropdown
[Store] Add panelStore width drag state
[Types] Add AnomalyNode type matching api_spec_v4
[CLAUDE.md] Update directory structure after frame merge
```

**CLAUDE.md 수정은 반드시 단독 커밋.**

---

## 18. 세션 간 컨텍스트 승계 포맷

새 세션 시작 시 아래 포맷으로 제공:

```markdown
## 직전 세션 요약
- 완료한 작업: [예: StreamChart.tsx D3 스트림 그래프 기본 렌더링 완료]
- 확정된 컴포넌트·변수명: [예: StreamChart, anomalyNodes, segmentColors]
- 다음 작업: [예: 이상 노드 클릭 → 패널 슬라이드인 연결]
- 미결 항목: [예: 보조 품목 오버레이 색상 팔레트 확정 필요]
```

세션 15~20회 초과 시 정렬 프롬프트:
```
"지금까지 이 세션에서 확정한 컴포넌트 구조와 props 타입을 요약해줘.
CLAUDE.md의 내용과 달라진 부분이 있으면 함께 알려줘."
```

---

## 19. 참조 문서 경로

| 문서 | 경로 |
|------|------|
| 웹 명세서 | `docs/web_plan_vN.md` |
| API 명세 | `docs/api_spec_vN.md` |
| 예외처리 명세 | `docs/exception_spec_vN.md` |

> `vN`은 현재 최신 버전 번호로 교체한다.

---

*이 파일은 `docs/team_ai_collab_vN.md §3.1` 운용 원칙에 따라 관리된다. 디렉토리 구조·컴포넌트 구조·예외 코드가 변경되면 CLAUDE.md를 즉시 갱신하고 단독 커밋한다.*

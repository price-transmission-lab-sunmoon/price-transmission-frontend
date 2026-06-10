# 가격렌즈 — 소비자 물가 이상 탐지 프론트엔드

2026-1 선문대학교 종합프로젝트 11분반 1팀  
계량경제학 + 머신러닝 기반 국내 소비자 물가 이상 탐지 웹 서비스 — **프론트엔드 repo**

---

## ⚡ 빠른 시작 (새 컴퓨터 셋업)

새 컴퓨터에서 **env 파일만 세팅하면 더블클릭 한 번**으로 실행됩니다.

### 셋업 순서

1. **Node.js 20.11.1 설치** — https://nodejs.org/dist/v20.11.1/ (`.nvmrc` 기준. nvm-windows 사용 시 `nvm install 20.11.1`)
2. **이 repo를 새 컴퓨터로 복사** (clone 또는 폴더 통째로).
3. **`run.bat` 더블클릭** — 첫 실행 시 `.env`가 없으면 `.env.example`을 복사하고 멈춥니다.
4. **`.env` 값 확인·수정** — 특히 `VITE_API_BASE_URL` (백엔드 주소). 시연용 mock 사용 시 `VITE_USE_MOCK=true`.
5. **`run.bat` 다시 더블클릭** — 의존성 자동 설치(`npm ci`) 후 dev 서버 기동 → http://localhost:5173

### 실행파일

| 파일 | 용도 |
|------|------|
| `run.bat` | dev 서버 실행 (시연용 기본). 더블클릭. |
| `build.bat` | 프로덕션 빌드 검증 + preview 서빙. |
| `run.ps1` | 실제 로직. 직접 옵션 지정 시: `.\run.ps1 -Mode build`, `.\run.ps1 -ForceInstall` |

### ⚠️ 주의 사항

- **Node 호환 범위: `18.x` 또는 `20` 이상** (의존성 Vite 5 / vitest 요구와 동일, `19.x`는 미지원). 권장은 `.nvmrc`의 `20.11.1`이며 v22도 동작 확인됨. 범위 밖이면 `run.bat`이 안내 후 중단합니다(자동 설치 안 함).
- **`.env`는 git에 포함되지 않습니다.** 새 컴퓨터마다 직접 세팅해야 합니다(3~4단계).
- **인터넷 연결 필요** — 첫 실행 시 `npm ci`로 의존성을 내려받습니다. `node_modules`가 이미 있으면 설치를 건너뜁니다(강제 재설치: `-ForceInstall`).
- **이미 셋업한 환경에서 `git pull`로 의존성이 추가/변경된 경우** — `run.bat`은 `node_modules`가 있으면 설치를 건너뛰므로 새 패키지가 빠집니다(예: 3D 라이브러리 추가 후 `three`를 못 찾는 빌드 실패). 이때는 `.\run.ps1 -ForceInstall`(또는 `node_modules` 삭제 후 재실행)로 다시 설치하세요. 새 컴퓨터 첫 셋업은 해당 없음.
- **오류로 창이 닫히면** 메시지를 읽도록 `pause`가 걸려 있습니다(아무 키나 누르면 닫힘).
- **PowerShell 실행 정책** 때문에 막히면 `run.bat`은 `-ExecutionPolicy Bypass`로 우회하므로 별도 설정 불필요.

> 상세 설명(수동 명령, 백엔드 연동, AWS 배포)은 아래 [로컬 실행 방법](#로컬-실행-방법) 참고.

---

## 프로젝트 소개

밀, 설탕 등 10개 식품 품목에 대해 **국제가 → 수입단가 → PPI → (도매가) → CPI** 가격 전달 체인의 이상을 탐지하고 시각화하는 웹 서비스입니다.  
이 repo는 FastAPI 백엔드로부터 분석 결과를 받아 **D3.js로 렌더링하는 React 프론트엔드**입니다.

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Node.js | 18.x 또는 20+ (권장 20.11.1) |
| React | 18.3.1 |
| TypeScript | 5.4.5 |
| Vite | 5.2.11 |
| D3.js | 7.9.0 |
| Zustand | 4.5.2 |
| React Router | 6.23.0 |
| Axios | 1.6.8 |
| TanStack Query | 5.32.0 |
| Tailwind CSS | 3.4.3 |
| Vitest | 1.6.0 |

> 모든 패키지는 `package.json`에 정확한 버전으로 고정되어 있습니다 (버전 범위 연산자 `^`, `~` 사용 금지).

---

## 로컬 실행 방법

### 1. Node.js 버전 확인

```bash
node -v  # 18.x 또는 20+ 필요 (19.x 미지원). 권장 v20.11.1, v22 동작 확인됨
```

nvm을 사용하는 경우:

```bash
nvm use  # .nvmrc의 20.11.1 자동 적용
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일의 기본값 (Mock 모드 — 백엔드 없이 동작):

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK=true
VITE_APP_TITLE=가격 전달 이상 탐지
```

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | 백엔드 Base URL. 실서버 연결 시 변경 |
| `VITE_USE_MOCK` | `true` = `src/fixtures/` 정적 JSON 사용 (백엔드 불필요) / `false` = 실 API 호출 |
| `VITE_APP_TITLE` | 브라우저 탭 제목 |

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:5173 접속
```

### 5. 프로덕션 빌드

```bash
npm run build    # TypeScript 컴파일 + Vite 번들
npm run preview  # 빌드 결과물 로컬 미리보기
```

---

## 주요 npm 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 실행 (포트 5173, HMR 활성화) |
| `npm run build` | 프로덕션 빌드 (TypeScript strict 컴파일 + Vite 번들) |
| `npm run preview` | 빌드 결과물 미리보기 |
| `npm run test` | Vitest smoke test 실행 |
| `npm run test:watch` | 테스트 watch 모드 |
| `npm run lint` | ESLint 검사 (`--max-warnings 0`) |
| `npm run format` | Prettier 자동 포맷 |
| `npm run format:check` | Prettier 포맷 검증 |

PR 제출 전 아래 모두 성공해야 합니다:

```bash
npm run build         # 오류 0건
npm run lint          # 경고 0건
npm run format:check  # 위반 0건
npm run test          # smoke test 3건 통과
```

---

## 화면 구성 및 기능

앱은 단일 SPA이며 두 개의 라우트를 사용합니다: `/` (메인) 와 `/methodology` (방법론).

### 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  Banner (이달의 이상 요약 — API: /anomalies/summary)             │
├─────────────────────────────────────────────────────────────────┤
│  Header (품목 드롭다운 · 뷰 탭 · 기준시점 칩)                   │
├─────────────────────────────────────────────────────────────────┤
│  FilterBar (기간 프리셋 · 구간 토글 · 신뢰도 · 패턴 · 사건)      │
├─────────────────────────────────────────────┬───────────────────┤
│                                             │                   │
│  Main Area (차트 영역)                       │  Panel (분석 패널) │
│                                             │  — 이상 선택 시    │
│  [흐름/산점도/원시 탭에 따라 차트 표시]        │    슬라이드인      │
│                                             │                   │
├─────────────────────────────────────────────┴───────────────────┤
│  Minimap (전체 기간 브러시 — 흐름·원시 탭에서만 표시)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## UI 컴포넌트별 동작 및 API 통신

### Header

#### 주 품목 드롭다운

- **동작**: 드롭다운에서 품목 선택 → Zustand `setPrimaryCommodity(id)` 호출 → 현재 탭의 차트 데이터 재조회
- **API**: `GET /commodities` (앱 초기 로드 시 1회, 드롭다운 옵션 목록 구성)
- **분석 대상 10개 품목**:

| 품목 | commodity_id | 경로 유형 |
|------|-------------|-----------|
| 밀 | `wheat` | 3구간 (A → B → D′) |
| 옥수수 | `maize` | 3구간 |
| 대두 | `soybean` | 3구간 |
| 팜유 | `palm_oil` | 3구간 |
| 설탕 | `sugar` | 3구간 |
| 커피 | `coffee` | 3구간 |
| 소고기 | `beef` | 3구간 |
| 땅콩 | `groundnuts` | 4구간 (A → B → C → D) |
| 바나나 | `banana` | 4구간 |
| 오렌지 | `orange` | 4구간 |

#### 보조 품목 드롭다운

- **동작**: 선택 시 Zustand `setSecondaryCommodity(id)` → 흐름 차트에 보조 품목 곡선 오버레이 추가 (40% opacity)
- **API**: 별도 호출 없음 (주 품목과 동일 `/stream` 응답에 포함)

#### 뷰 탭 (4종)

| 탭 | activeTab 값 | 이동 경로 |
|----|-------------|-----------|
| 흐름 | `'stream'` | `/` |
| 산점도 | `'scatter'` | `/` |
| 원시 가격 | `'raw-prices'` | `/` |
| 방법론 | `'methodology'` | `/methodology` |

- **동작**: 탭 클릭 → Zustand `setActiveTab(tab)` → 해당 탭의 차트 컴포넌트 표시 (방법론은 라우터 이동)

#### 데이터 기준 시점 칩 (FreshnessChip)

- **동작**: 마지막 데이터 갱신 시점 표시
- **API**: `GET /freshness`
  - 응답 예시: `{ "last_updated": "2026-04-01T00:00:00", "next_update_due": "2026-05-01" }`

---

### Banner (이달의 이상 요약)

- **위치**: 페이지 최상단
- **동작**: 앱 초기 로드 시 이달의 이상 요약 배지 목록 표시. 배지 클릭 → 해당 품목 자동 선택 + 패널 열기
- **API**: `GET /anomalies/summary`
  - 응답: 이달 탐지된 이상 목록 (품목명, 신뢰도 등급, 기간)

---

### FilterBar

#### 기간 프리셋 버튼 (6종)

| 버튼 | 의미 | Zustand 동작 |
|------|------|-------------|
| 1Y | 최근 1년 | `setPeriodPreset('1y')` → filterFrom/filterTo 자동 계산 |
| 3Y | 최근 3년 | `setPeriodPreset('3y')` |
| 5Y | 최근 5년 | `setPeriodPreset('5y')` |
| 10Y | 최근 10년 | `setPeriodPreset('10y')` |
| 20Y | 최근 20년 | `setPeriodPreset('20y')` |
| 전체 | 전체 기간 | `setPeriodPreset('all')` |

- **커스텀 기간**: 미니맵 브러시 드래그로 직접 조정 (periodPreset = null)

#### 구간 토글 (SegmentId)

- **동작**: 구간 버튼(A, B, D′ 또는 A, B, C, D) 클릭 → Zustand `toggleSegment(segmentId)` → 흐름 차트 해당 구간 곡선 표시/숨김

#### 신뢰도 필터

- **동작**: 고신뢰(high) / 중신뢰(medium) / 참고(reference) 토글 → `confidenceFilter` 갱신 → 흐름 차트 이상 노드 필터링

#### 패턴 필터

- **동작**: pattern1/pattern2/pattern3 토글 → `patternFilter` 갱신 → 흐름 차트 이상 노드 필터링

#### 사건 필터

- **동작**: 사건 선택 → Zustand `toggleEvent(eventId)` → 흐름 차트 사건 오버레이 표시/숨김
- **API**: `GET /events` (앱 초기 로드 시 1회)

---

### 흐름 탭 — StreamChart

- **위치**: 메인 영역 (activeTab = 'stream')
- **API**: `GET /commodities/{commodity_id}/stream`
  - 쿼리 파라미터: `from={filterFrom}&to={filterTo}&granularity={granularity}`
  - 응답: 구간별 전이율 시계열 + 이상 노드 목록 + 시간 envelope

#### 인터랙션

| 동작 | 설명 |
|------|------|
| 마우스 휠 스크롤 | X축 줌인/줌아웃 (viewport 기간 변경 → filterFrom/filterTo 갱신) |
| 이상 노드 클릭 | Zustand `selectAnomaly(anomalyId)` → 분석 패널 슬라이드인 |
| 호버 툴팁 | 해당 시점의 전이율, 이상 여부, 신뢰도 등급 표시 |
| 진입 애니메이션 | 품목 변경 시 곡선 draw-on 애니메이션 |

#### 이상 노드 시각 규격

| 신뢰도 등급 | 색상 | 반지름 |
|------------|------|--------|
| 고신뢰 (high) | `#e24b4a` | 7px |
| 중신뢰 (medium) | `#ef9f27` | 5.5px |
| 참고 (reference) | `#c8d850` | 4px |

#### 자동 진입 동작

흐름 탭 최초 마운트 시 가장 최근의 고신뢰 이상 노드를 자동 선택 → 패널 자동 열림

---

### 산점도 탭 — ScatterChart

- **위치**: 메인 영역 (activeTab = 'scatter')
- **API**: `GET /commodities/{commodity_id}/scatter`
  - 쿼리 파라미터: `segment={scatterSegment}`
  - 응답: 기간별 산점도 데이터 (x = 전기 가격, y = 당기 가격)

#### 인터랙션

| 동작 | 설명 |
|------|------|
| 구간 선택 드롭다운 | `setScatterSegment(segment)` → 데이터 재조회 |
| 슬라이더 재생 버튼 | 연도별 슬라이드 애니메이션 (trajectory 경로 표시) |
| 포인트 호버 | 해당 기간, 가격 수치 툴팁 |

---

### 원시 가격 탭 — RawPricesChart

- **위치**: 메인 영역 (activeTab = 'raw-prices')
- **API**: `GET /commodities/{commodity_id}/raw-prices`
  - 쿼리 파라미터: `from={filterFrom}&to={filterTo}&layout={layoutNumber}`
  - 응답: 소스별 원시 가격 시계열 (2020=100 지수)

#### 레이아웃 (1~6)

| layout | 표시 소스 |
|--------|----------|
| 1 | 국제가(KRW) + 수입단가 + PPI + CPI |
| 2 | 수입단가 + PPI + CPI |
| 3 | PPI + CPI |
| 4 | 국제가(KRW) + 수입단가 + PPI + 도매가 + CPI (4구간 품목만) |
| 5 | 수입단가 + PPI + 도매가 + CPI |
| 6 | PPI + 도매가 + CPI |

> 3구간 품목(has_wholesale=false)에서 layout=4,5,6 요청 시 `WHOLESALE_NOT_AVAILABLE` (422) 반환 → 자동으로 layout=1로 폴백

#### 소스별 색상

| 소스 | 색상 |
|------|------|
| 국제가 KRW (intl_price_krw) | `#a855f7` |
| 수입단가 (import_price) | `#3b82f6` |
| PPI | `#22c55e` |
| 도매가 (wholesale_price) | `#f97316` |
| CPI | `#e24b4a` |

#### 인터랙션

| 동작 | 설명 |
|------|------|
| 마우스 휠 스크롤 | X축 줌인/줌아웃 |
| 더블클릭 | 전체 기간으로 줌 리셋 |
| 레이아웃 버튼 | layout 파라미터 변경 → 재조회 |

---

### Minimap (전체 기간 브러시)

- **위치**: 메인 영역 하단 (흐름 탭과 원시 가격 탭에서만 표시)
- **API**:
  - 흐름 탭: `GET /commodities/{commodity_id}/stream/minimap`
  - 원시 가격 탭: `GET /commodities/{commodity_id}/raw-prices/minimap`
  - 응답: 전체 기간 압축 시계열 + 이상 밀도 밴드 데이터

#### 인터랙션

| 동작 | 설명 |
|------|------|
| 브러시 드래그 | 뷰포트 기간 선택 → filterFrom/filterTo 갱신 → 메인 차트 재조회 |
| 브러시 핸들 드래그 | 기간 시작/끝점 개별 조정 |
| 메인 차트 휠 줌 | Minimap 브러시 위치 자동 동기화 |
| 최소 브러시 크기 | 3개월 미만으로 줄일 수 없음 |

---

### 분석 패널 (Panel)

- **위치**: 우측 사이드 패널 (이상 노드 클릭 시 슬라이드인)
- **API 호출 순서**:
  1. 패널 열릴 때: `GET /anomalies/{anomaly_id}/detail` (즉시)
  2. 섹션 펼칠 때: Lazy 로딩

#### 섹션별 API

| 섹션 | API | 쿼리 파라미터 |
|------|-----|--------------|
| 계량경제학 수치 | `/detail` 응답 내 포함 | — |
| 지표별 인라인 시계열 | `GET /anomalies/{id}/stat-series` | `metric=transmission_rate\|zscore\|ect\|breakpoints` |
| 비시계열 스냅샷 | `GET /anomalies/{id}/stat-snapshot` | `metric=iqr\|asymmetry` |
| IRF 차트 | `GET /anomalies/{id}/irf` | — |
| ML 결과맵 | `GET /anomalies/{id}/ml-map` | `model=isolation_forest\|lof\|ocsvm` |

#### 패널 인터랙션

| 동작 | 설명 |
|------|------|
| 섹션 헤더 클릭 | 섹션 펼치기/접기 (lazy 데이터 로드) |
| 패널 좌측 엣지 드래그 | 패널 너비 조정 (280px ~ 520px) |
| X 버튼 | `closePanel()` → 패널 닫기 |
| 품목 배지 클릭 | 해당 품목으로 주 품목 변경 |

#### 인라인 차트 8종

| 차트 | 지표 | API |
|------|------|-----|
| 전이율 시계열 | transmission_rate | stat-series?metric=transmission_rate |
| Z-score 시계열 | zscore | stat-series?metric=zscore |
| ECT 시계열 | ect | stat-series?metric=ect |
| 구조 변화 | breakpoints | stat-series?metric=breakpoints |
| IQR 박스플롯 | iqr | stat-snapshot?metric=iqr |
| 비대칭 히스토그램 | asymmetry | stat-snapshot?metric=asymmetry |
| IRF 차트 | — | irf |
| ML 결과맵 | — | ml-map?model=isolation_forest\|lof\|ocsvm |

---

### 방법론 탭 — MethodologyPage (`/methodology`)

- **동작**: Header 방법론 탭 클릭 → `/methodology` 라우트 이동 (FilterBar, Panel 미표시)
- **API**:
  - `GET /meta/pipeline` — 파이프라인 플로우 다이어그램 데이터
  - `GET /meta/analysis-params` — 분석 파라미터 기준값 (ADF 기준값, ECT 임계값 등)

---

### 온보딩 가이드 (OnboardingGuide)

- **동작**: 첫 방문(세션 단위) + 이상 노드 선택 후 자동 표시. 이후 같은 세션에서는 재표시 안 함
- **Zustand 상태**: `isOnboardingVisible`, `hasSeenOnboardingThisSession`
- **단계**: 흐름 차트 → 이상 노드 클릭 → 패널 활용 가이드

---

## Mock 모드 상세

`VITE_USE_MOCK=true` 설정 시 Axios 인터셉터가 실제 HTTP 요청을 차단하고 `src/fixtures/` 폴더의 JSON 파일을 응답으로 반환합니다.

### Fixture 파일 목록

| 엔드포인트 | Fixture 파일 |
|-----------|-------------|
| `/commodities` | `commodities.json` |
| `/segments` | `segments.json` |
| `/events` | `events.json` |
| `/freshness` | `freshness.json` |
| `/anomalies/summary` | `anomalies_summary.json` |
| `/commodities/{id}/stream` | `stream.json` |
| `/commodities/{id}/stream/minimap` | `stream_minimap.json` |
| `/commodities/{id}/scatter` | `scatter.json` |
| `/commodities/{id}/raw-prices` | `raw_prices.json` |
| `/commodities/{id}/raw-prices` (3구간 + layout=4) | `raw_prices_lay4_error.json` (422 반환) |
| `/commodities/{id}/raw-prices/minimap` | `raw_prices_minimap.json` |
| `/anomalies/{id}/detail` | `panel_detail.json` |
| `/anomalies/{id}/stat-series?metric=transmission_rate` | `panel_stat_series_transmission_rate.json` |
| `/anomalies/{id}/stat-series?metric=zscore` | `panel_stat_series_zscore.json` |
| `/anomalies/{id}/stat-series?metric=ect` | `panel_stat_series_ect.json` |
| `/anomalies/{id}/stat-series?metric=breakpoints` | `panel_stat_series_breakpoints.json` |
| `/anomalies/{id}/stat-snapshot?metric=iqr` | `panel_stat_snapshot_iqr.json` |
| `/anomalies/{id}/stat-snapshot?metric=asymmetry` | `panel_stat_snapshot_asymmetry.json` |
| `/anomalies/{id}/irf` | `panel_irf.json` |
| `/anomalies/{id}/ml-map?model=isolation_forest` | `panel_ml_map_isolation_forest.json` |
| `/anomalies/{id}/ml-map?model=lof` | `panel_ml_map_lof.json` |
| `/anomalies/{id}/ml-map?model=ocsvm` | `panel_ml_map_ocsvm.json` |
| `/meta/pipeline` | `pipeline.json` |
| `/meta/analysis-params` | `analysis_params.json` |

---

## 에러 처리

### 에러 클래스 계층

```
FEError (프론트엔드 도메인)
  └── ApiError (API 응답 오류)
```

### 주요 에러 코드

| 코드 | 원인 | 처리 방침 |
|------|------|-----------|
| `FE-API-001` | 네트워크 실패 | Toast 알림 + 재시도 |
| `FE-API-002` | 400 잘못된 파라미터 | 필터 UI 오류 표시 |
| `FE-API-003` | 404 리소스 미존재 | 빈 상태 UI |
| `FE-API-004` | 500 서버 오류 | Fallback UI |
| `WHOLESALE_NOT_AVAILABLE` | 3구간 품목에서 layout=4 요청 | layout=1로 자동 폴백 |
| `FE-D3-001` | D3 렌더링 실패 | 차트 영역 fallback |
| `PARSE-NUM-002` | API null/NaN 숫자 필드 | D3 defined() 필터링 |

---

## 디렉토리 구조

```
price-transmission-frontend/
├── public/                        # 정적 자원 (favicon 등)
├── src/
│   ├── api/
│   │   ├── client.ts              # Axios 인스턴스 + Mock 인터셉터 (24개 라우트)
│   │   ├── endpoints.ts           # 18종 경로 상수
│   │   ├── error.ts               # FEError / ApiError 클래스 + parseApiError
│   │   ├── errorChain.ts          # traceErrorChain / formatErrorChain
│   │   └── globalErrorHandler.ts  # window.onerror 전역 에러 핸들러
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # 전체 레이아웃 껍데기
│   │   │   ├── Header.tsx         # 품목 드롭다운, 뷰 탭, FreshnessChip
│   │   │   ├── FilterBar.tsx      # 기간 프리셋, 구간·신뢰도·패턴·사건 필터
│   │   │   ├── Banner.tsx         # 이달의 이상 요약 배너
│   │   │   ├── Panel.tsx          # 분석 수치 패널 (슬라이드인)
│   │   │   ├── OnboardingGuide.tsx
│   │   │   └── HelpFloatingButton.tsx
│   │   └── charts/
│   │       ├── StreamChart.tsx    # 흐름 그래프 (D3)
│   │       ├── ScatterChart.tsx   # 산점도 (D3)
│   │       ├── RawPricesChart.tsx # 원시 가격 시계열 (D3)
│   │       └── Minimap.tsx        # 전체 기간 브러시 (D3)
│   ├── fixtures/                  # Mock 응답 JSON (VITE_USE_MOCK=true 전용)
│   ├── hooks/                     # React Query 훅 (useCommodities, useStreamData 등)
│   ├── pages/
│   │   ├── MainPage.tsx           # 흐름/산점도/원시 탭 라우팅
│   │   └── MethodologyPage.tsx    # 방법론 탭
│   ├── router/                    # React Router v6 (/ + /methodology)
│   ├── stores/
│   │   └── useAppStore.ts         # Zustand 5-슬라이스 스토어
│   ├── types/
│   │   ├── literals.ts            # SegmentId, ViewTab, PeriodPreset 등 SoT
│   │   └── timeseries.ts          # API 응답 타입 (snake_case 유지)
│   ├── utils/
│   │   ├── colorUtils.ts          # 모든 D3 차트 색상 상수 SoT
│   │   └── dateUtils.ts           # YYYY-MM 파싱·포맷 유틸
│   ├── App.tsx
│   ├── main.tsx                   # Vite 진입점, 전역 에러 핸들러 등록
│   └── index.css
├── tests/
│   ├── setup.ts
│   └── frame_smoke.test.ts        # smoke test 3건
├── docs/                          # 명세서 사본 (읽기 전용)
├── CLAUDE.md                      # AI 컨텍스트 기준 파일
├── BUGFIX_LOG.md                  # 버그 수정 이력
└── README.md                      # 이 파일
```

---

## API 연동 원칙

- **Base URL**: `VITE_API_BASE_URL` 환경 변수 (기본: `http://localhost:8000/api/v1`)
- **전 엔드포인트 GET 방식** (읽기 전용 소비자)
- **날짜 형식**: API 요청·응답 모두 `YYYY-MM` 문자열. `Date` 자동 변환 금지
- **필드명**: API 응답의 `snake_case` 키를 변환 없이 TypeScript 타입에 매핑
- **인증**: 없음 (1차 출시 기준)

상세 명세: `docs/api_spec_v5.md`

---

## 분석 품목

| 품목 | commodity_id | 경로 유형 | has_wholesale |
|------|-------------|-----------|--------------|
| 밀 | `wheat` | 3구간 A-B-D′ | false |
| 옥수수 | `maize` | 3구간 | false |
| 대두 | `soybean` | 3구간 | false |
| 팜유 | `palm_oil` | 3구간 | false |
| 설탕 | `sugar` | 3구간 | false |
| 커피 | `coffee` | 3구간 | false |
| 소고기 | `beef` | 3구간 | false |
| 땅콩 | `groundnuts` | 4구간 A-B-C-D | true |
| 바나나 | `banana` | 4구간 | true |
| 오렌지 | `orange` | 4구간 | true |

---

## 팀

| 역할 | 이름 |
|------|------|
| 프론트엔드 리드 | 하대수 |
| PM | 최수안 |
| 백엔드 리드 | 바게스타니 샤킬라 |
| 파이프라인 리드 | 예병성 |

---

## 참조 문서 (`docs/`)

| 파일 | 내용 |
|------|------|
| `frame_spec_frontend_v5.md` | 프론트엔드 Frame 명세 (구현 기준) |
| `web_plan_v6.md` | UI/UX 웹 플랜 |
| `api_spec_v5.md` | API 명세 18개 엔드포인트 |
| `db_schema_v5.md` | DB 스키마 (필드명·Literal 값 출처) |
| `exception_design_v3.md` | 예외처리 설계 |
| `exception_spec_v6.md` | 예외 코드 명세 |
| `pipeline_output_spec_v7.md` | 파이프라인 출력 명세 |
| `docs_manifest_v2.md` | 버전 해석 SoT |
| `CLAUDE.md` | AI 컨텍스트 기준 파일 사본 |

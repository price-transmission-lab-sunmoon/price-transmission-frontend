# 코드 가이드 — 전체 개요

> 이 문서는 코드를 직접 작성하지 않은 사람이 이 프론트엔드 전체 구조를 빠르게 파악하기 위한 안내서다.
> 영역별 상세는 아래 문서로 분할되어 있다. 각 코드 파일에는 `// @guide:<ID>` 마커가 붙어 있고, 그 ID를 이 가이드에서 찾으면 "무엇을·왜" 설명을 볼 수 있다.

---

## 1. 이 프로젝트가 하는 일 (한 줄)

소비자 물가의 **가격 전달(price transmission) 구조**를 분석하고, 그 과정에서 나타나는 **이상(anomaly)**을 계량경제학 + 머신러닝으로 탐지한 결과를, React + D3.js로 시각화하는 **읽기 전용 대시보드**다.

- 이 repo는 **소비자(consumer)**다. 직접 분석하지 않는다. FastAPI 백엔드가 계산한 결과를 받아 그림으로만 그린다.
- 사용자는 품목(밀·옥수수·커피 등)을 고르고, 시간 축을 따라 전이율 흐름과 이상 시점을 보고, 이상 노드를 클릭해 상세 분석 수치를 본다.

## 2. 전체 데이터 흐름

```
파이프라인 repo (CSV 산출)
   → PostgreSQL DB
      → FastAPI 백엔드 (분석 결과 API 제공)
         → 이 repo (React + D3) ← 지금 보는 코드
```

이 repo 내부 흐름:

```
화면 컴포넌트 (charts / layout)
   ↑ 데이터 구독
zustand 전역 스토어 (useAppStore)  ← 사용자가 고른 품목·기간·필터 보관
   ↑
react-query 훅 (use*)             ← 서버 데이터 가져오기 + 캐시
   ↓
services (timeseries / anomaly)   ← API 응답 → 화면용 형태로 변환 (선택적)
   ↓
api/client (axios)                ← 실제 HTTP 요청 (또는 Mock JSON)
```

핵심: **사용자 조작 → 스토어 변경 → 관련 훅 재요청 → 차트 다시 그림**. 이 한 방향 흐름(store-driven cascade)이 앱 전체를 움직인다.

## 3. 기술 스택

| 역할 | 선택 |
|------|------|
| 언어 | TypeScript 5.4 |
| UI | React 18.3 |
| 빌드 | Vite 5.2 |
| 라우팅 | React Router 6.23 |
| 전역 상태 | Zustand 4.5 |
| 서버 상태/캐시 | TanStack Query (react-query) 5.32 |
| HTTP | Axios 1.6 |
| 시각화 | D3.js 7.9 |
| 스타일 | Tailwind CSS 3.4 |
| 날짜 | date-fns 3.6 |
| 테스트 | Vitest 1.6 |

> 경로 별칭 `@/` = `src/`.

## 4. 화면(탭) 4종 — 큰 그림

상단 헤더의 탭으로 전환한다. (`activeTab` 스토어 값)

| 탭 | 라우트 | 보여주는 것 | 주요 컴포넌트 |
|----|--------|-------------|---------------|
| 흐름 보기 (stream) | `/` | 시간 축 전이율 라인 + 이상 노드. 휠 줌, 미니맵 브러시 | [[CHART-01]] StreamChart + [[CHART-02]] Minimap |
| 전달 구조 (scatter) | `/` | 상류·하류 변화율 산점도 (4사분면 패턴) + 시점 재생 | [[CHART-03]] ScatterChart |
| 원시 시계열 (raw-prices) | `/` | 국제가·수입단가·PPI·도매가·CPI 지수(2020=100) | [[CHART-04]] RawPricesChart + [[CHART-02]] Minimap |
| 방법론 (methodology) | `/methodology` | 파이프라인·기법·ML·신뢰도 설명 (정적) | [[CHART-14]] MethodologyView |

이상 노드를 클릭하면 우측 [[LAYOUT-04]] Panel이 열려 상세 분석 수치 + 인라인 차트(8종)를 보여준다.

## 5. 마커 주석 사용법 (코드 ↔ 문서 탐색)

코드에는 설명 문장 대신 **짧은 참조 마커**만 둔다. 예:

```ts
// @guide:CHART-01
export function StreamChart() { ... }
```

- **코드 → 문서**: 코드에서 `@guide:CHART-01`을 보면, [[CHART-01]]을 이 가이드(05-charts.md)에서 찾아 설명을 읽는다.
- **문서 → 코드**: 가이드 각 항목의 `위치:` 줄이 `파일 (심볼)`을 알려준다. 또는 코드 전체에서 `@guide:CHART-01` 검색.
- 마커 ID 규칙: `<영역>-<번호>`. 영역 = `API STORE HOOK SVC TYPE CHART UI LAYOUT UTIL`.
- 가이드 항목끼리 `[[CHART-02]]` 처럼 링크해 흐름을 따라갈 수 있다.

모든 마커를 한 번에 보려면:

```
grep -rn "@guide:" src
```

## 6. 영역별 상세 문서

| 문서 | 영역 | 내용 |
|------|------|------|
| [01-api.md](01-api.md) | `API-*` | axios 클라이언트, Mock, 18 엔드포인트, 에러 처리 |
| [02-state.md](02-state.md) | `STORE-*` | zustand 5개 슬라이스 (상태 + 액션) |
| [03-hooks.md](03-hooks.md) | `HOOK-*` | 16개 react-query 훅 |
| [04-services-types.md](04-services-types.md) | `SVC-* TYPE-*` | 데이터 변환·포맷 함수 + 타입 모델 |
| [05-charts.md](05-charts.md) | `CHART-*` | 13 차트 + 공통 D3 패턴 |
| [06-ui.md](06-ui.md) | `UI-*` | 재사용 UI 부품 9종 |
| [07-layout.md](07-layout.md) | `LAYOUT-*` | 화면 골격 + 페이지 + 부트스트랩 |
| [08-utils.md](08-utils.md) | `UTIL-*` | 색·테마·날짜·아이콘·z-index 유틸 |

## 7. 폴더 구조 요약

```
src/
├── api/         네트워크 계층 (client, endpoints, error*)
├── hooks/       데이터 가져오는 react-query 훅 (use*)
├── stores/      zustand 전역 스토어 (useAppStore)
├── services/    API 응답 → 화면용 변환 (timeseries, anomaly)
├── types/       TypeScript 타입 (백엔드 응답과 1:1, snake_case 유지)
├── utils/       색·테마·날짜·아이콘 등 순수 유틸
├── components/
│   ├── ui/      버튼·뱃지·토스트 등 재사용 부품
│   ├── layout/  헤더·필터바·패널·온보딩 등 골격
│   └── charts/  13개 D3 차트
├── pages/       MainPage, MethodologyPage
├── router/      React Router 설정
├── App.tsx      QueryClient + ErrorBoundary 최상위
└── main.tsx     진입점
```

## 8. 알아두면 좋은 전역 규칙 (docs/CLAUDE.md 발췌)

- **날짜는 `YYYY-MM` 문자열 그대로**. `Date` 객체로 자동 변환 금지 (표시·계산 필요 시점에만 date-fns로 파싱).
- **필드명은 snake_case 유지**. camelCase 변환 금지 (백엔드 응답 그대로 타입에 매핑).
- **차트 컨테이너는 항상 마운트**한다 (조건부 마운트 금지). loading/error/empty는 컨테이너 안의 absolute 오버레이로 처리 — [[CHART-01]] 참조.
- 색·z-index·날짜 등 "여러 곳에서 쓰는 값"은 `utils/`에 단일 출처(SoT)로 모은다 — [08-utils.md](08-utils.md).

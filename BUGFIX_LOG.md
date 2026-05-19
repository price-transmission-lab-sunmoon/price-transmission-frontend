# 버그 수정 이력 (BUGFIX_LOG)

**세션 날짜**: 2026-05-19  
**작업 브랜치**: `claude/clever-chatterjee-9bd8e8`  
**배경**: `feat/fe-layout-filter`, `feat/fe-stream-chart`, `feat/fe-scatter-chart`, `feat/fe-raw-timeseries`, `feat/fe-minimap`, `feat/fe-panel` 6개 feature 브랜치를 병합하는 과정에서 다수의 병합 충돌이 발생. 충돌 해소 과정에서 코드가 잘못 병합되어 런타임 오류가 다수 발생.

---

## BUG-001 — `colorUtils.ts` 문법 오류 (RAW_PRICE_COLORS 미닫힘 + 중복 선언)

| 항목 | 내용 |
|------|------|
| **파일** | `src/utils/colorUtils.ts` |
| **심각도** | Critical — 빌드 실패 |
| **원인** | 병합 충돌 해소 중 `RAW_PRICE_COLORS` 객체 리터럴의 닫는 `} as const;`가 누락됨. 그 자리에 `export const REFERENCE_LINE_COLOR = '#3b82f6';` 선언이 객체 안에 삽입되어 문법 오류 발생 |
| **증상** | TypeScript 컴파일 실패, Vite 빌드 중단 |

**수정 내용**:

```typescript
// 수정 전 (broken):
export const RAW_PRICE_COLORS: Record<RawPriceSource, string> = {
  intl_price_krw: '#a855f7',
  import_price: '#3b82f6',
  ppi: '#22c55e',
  wholesale_price: '#f97316',
  cpi: '#e24b4a',
export const REFERENCE_LINE_COLOR = '#3b82f6';  // ← 객체 안에 삽입됨 (문법 오류)

// 수정 후 (fixed):
export const RAW_PRICE_COLORS: Record<RawPriceSource, string> = {
  intl_price_krw: '#a855f7',
  import_price: '#3b82f6',
  ppi: '#22c55e',
  wholesale_price: '#f97316',
  cpi: '#e24b4a',
} as const;
```

---

## BUG-002 — `AppShell.tsx` `useAppStore` import 누락

| 항목 | 내용 |
|------|------|
| **파일** | `src/components/layout/AppShell.tsx` |
| **심각도** | Critical — 런타임 ReferenceError |
| **원인** | 병합 과정에서 `useAppStore` import 행이 유실됨. `activeTab` 상태 참조 코드는 존재하나 import가 없음 |
| **증상** | 앱 마운트 시 `ReferenceError: useAppStore is not defined` |

**수정 내용**:

```typescript
// 수정 전: import 없음

// 수정 후:
import { useAppStore } from '@/stores/useAppStore';
```

---

## BUG-003 — `client.ts` Mock 라우트 `handle` 함수 누락 + 라우트 미등록

| 항목 | 내용 |
|------|------|
| **파일** | `src/api/client.ts` |
| **심각도** | Critical — 모든 Mock API 호출 실패 |
| **원인** 1 | `MockRoute` 인터페이스는 `handle: (config) => MockResult` 함수를 요구하지만, 병합 후 모든 라우트 항목이 `{ test, data }` 형태(함수 아님)로 잘못 작성됨 |
| **원인** 2 | `/stream/minimap`, `/scatter`, `/raw-prices`, `/raw-prices/minimap`, `/meta/pipeline`, `/meta/analysis-params` 6개 라우트가 등록되지 않음 |
| **증상** | `TypeError: route.handle is not a function` — Mock 모드에서 모든 API 요청이 실패 |

**수정 내용**:

```typescript
// 수정 전 (잘못된 형식):
{ test: (u) => u === '/commodities', data: commoditiesFixture },

// 수정 후 (올바른 형식):
{ test: (u) => u === '/commodities', handle: () => ({ type: 'success', data: commoditiesFixture }) },
```

누락된 6개 라우트 추가:
- `GET /commodities/{id}/stream/minimap` → `streamMinimapFixture`
- `GET /commodities/{id}/scatter` → `scatterFixture`
- `GET /commodities/{id}/raw-prices` → `rawPricesFixture` (layout=4 + 3구간 품목 시 `WHOLESALE_NOT_AVAILABLE` 422 반환 포함)
- `GET /commodities/{id}/raw-prices/minimap` → `rawPricesMinimapFixture`
- `GET /meta/pipeline` → `pipelineFixture`
- `GET /meta/analysis-params` → `analysisParamsFixture`

---

## BUG-004 — `MainPage.tsx` 병합 충돌로 `export function` 중복

| 항목 | 내용 |
|------|------|
| **파일** | `src/pages/MainPage.tsx` |
| **심각도** | Critical — 컴파일 오류 |
| **원인** | 두 feature 브랜치의 `export function MainPage()` 정의가 모두 남아있고, 그 사이에 `import` 구문들이 삽입되어 있음 (최상위 레벨에 `import`는 파일 최상단에만 허용됨) |
| **증상** | TypeScript 오류: 동일 이름 함수 중복 선언, `import` 위치 오류 |
| **누락 기능** | Scatter 탭 렌더링이 StreamChart placeholder로 떨어져 실제 `ScatterChart` 컴포넌트가 표시되지 않음 |

**수정 내용**: 파일 전체를 새로 작성. 두 버전의 best of both 통합:
- `raw-prices` 탭 → `<RawPricesChart />` + `<Minimap variant="raw-prices" />`
- `scatter` 탭 → `<ScatterChart />`
- `stream` 탭 (기본) → `<StreamChart />` + `<Minimap variant="stream" />`

---

## BUG-005 — `Minimap.tsx` 복합 병합 오류 (7개 항목)

| 항목 | 내용 |
|------|------|
| **파일** | `src/components/charts/Minimap.tsx` |
| **심각도** | Critical — 런타임 완전 실패 |
| **원인** | 가장 심각하게 손상된 파일. 병합 과정에서 다수의 핵심 구현 조각이 유실됨 |

세부 오류 7개:

| # | 오류 내용 |
|---|-----------|
| 1 | `useState` import 누락 (`useState<number>` 사용하지만 import 없음) |
| 2 | `useMinimapData` 훅이 파일 내 2번 호출되어 `data`, `isError` 변수 중복 선언 |
| 3 | `containerRef`, `svgRef`, `xScaleRef`, `brushGroupDomRef`, `brushBehaviorRef`, `isProgrammaticRef` — 6개 ref 선언 없이 사용 |
| 4 | `TOTAL_HEIGHT` 상수 미정의 (HEIGHT=64만 정의됨) |
| 5 | `getAnomalyBandStyle()` 함수 호출하지만 정의 없음 |
| 6 | `getSegmentColor()` 함수 호출하지만 정의 없음; variant별 시리즈 타입 구분 로직 없음 |
| 7 | raw-prices 렌더링이 stream 전용 필드(`transmission_rate`, `in_warmup_period`) + stream 날짜 형식(`%Y`)을 사용 (raw-prices 데이터는 `index_2020` 필드와 `YYYY-MM` 형식 사용) |

**수정 내용**: 파일 전체 재작성. 주요 수정사항:
- 올바른 import: `useState`, `StreamSeriesItem`, `RawPriceSeriesItem` 추가
- `TOTAL_HEIGHT = HEIGHT` 상수 정의
- 6개 ref를 올바른 TypeScript 타입으로 선언
- `getAnomalyBandStyle()` 모듈 레벨 함수 추가 (기존 `densityColor()`, `densityOpacity()` 활용)
- `getSegmentColor()` — `useCallback` 훅으로 구현, variant별 타입 분기
- D3 렌더링 variant 분기:
  - stream: `parsePeriod = d3.timeParse('%Y')`, Y축 = `transmission_rate`, `in_warmup_period` 필터링
  - raw-prices: `parsePeriod = d3.timeParse('%Y-%m')`, Y축 = `index_2020`
- 공통: `actual_from`/`actual_to`는 항상 `d3.timeParse('%Y-%m')` 사용 (두 variant 모두 YYYY-MM 형식)

---

## 수정 요약

| # | 파일 | 오류 유형 | 상태 |
|---|------|-----------|------|
| 1 | `src/utils/colorUtils.ts` | 문법 오류 (미닫힌 객체) | ✅ 수정 완료 |
| 2 | `src/components/layout/AppShell.tsx` | import 누락 | ✅ 수정 완료 |
| 3 | `src/api/client.ts` | MockRoute 인터페이스 불일치 + 6개 라우트 미등록 | ✅ 수정 완료 |
| 4 | `src/pages/MainPage.tsx` | 함수 중복 선언, Scatter 렌더링 누락 | ✅ 수정 완료 |
| 5 | `src/components/charts/Minimap.tsx` | 7개 복합 병합 오류 | ✅ 수정 완료 |

## 빌드 검증

```
npm install   → 468 packages installed (정상)
npm run build → tsc -b && vite build → ✓ 오류 0건 (청크 크기 경고만)
```

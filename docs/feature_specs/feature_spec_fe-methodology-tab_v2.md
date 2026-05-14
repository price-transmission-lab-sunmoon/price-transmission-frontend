# Feature 명세서 — 방법론 탭

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-methodology-tab`
**담당자**: 하대수
**작성일**: 2026-05-06
**상태**: 초안

**변경 이력**
- v1 (2026-05-06): 최초 작성
- v2 (2026-05-10): `plan_feature_specs_alignment_v1.md` 감사 결과 반영
  - **P0 ①**: 6섹션 정의 SoT 충돌(`web_plan §8.2` vs `feature_dev_list §feat/fe-methodology-tab`)을 §0 PM 별건으로 격상. 본 명세는 web_plan §8.2 채택
  - **P0 ②**: Header 4탭 통합 vs 3탭+별도버튼 충돌 — fe-layout-filter v4 PM 별건 #1 채택 (4탭 + `/methodology` 라우트 동시 갱신)에 정합. 회귀 위험 명시
  - **P1 ④**: 헤더 `기능 번호: FE-METHOD` 제거
  - **P1 ⑤**: 선행조건에 `feat/be-api-meta` 백엔드 의존성 명시 (mock 단독 진행 시점 명확화)
  - **P1 ⑥**: 방법론 탭 진입 시 `isPanelOpen=false` 책임 위치 명시 — fe-layout-filter v4의 `setActiveTab('methodology')` 핸들러에서 처리
  - **P2 ⑨**: 신뢰도 등급 색상 SoT 의존성(`feat/fe-stream-chart` colorUtils.ts) 선행 조건에 명시

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/meta/pipeline, §/meta/analysis-params` | 최신(`docs_manifest.md` 조회) | 엔드포인트·response 필드명·타입 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §8.6` | 최신(`docs_manifest.md` 조회) | 디렉토리·snake_case·D3 컴포넌트 위치 | ☐ |
| `web_plan_vN.md §8, §8.2` | 최신(`docs_manifest.md` 조회) | 방법론 탭 6섹션 UX 명세 |  ☐ |
| `feature_dev_list_vN.md §feat/fe-methodology-tab, §feat/be-api-meta` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준·6섹션 충돌 SoT·BE 선행 | ☐ |
| `feature_spec_fe-layout-filter_vN.md §3.1, §3.2 헤더 4뷰 탭` | 최신(`docs_manifest.md` 조회) | 4탭 라우팅 정책·`isPanelOpen` 갱신 책임 |  ☐ |
| `feature_spec_fe-stream-chart_vN.md §4 colorUtils.ts` | 최신(`docs_manifest.md` 조회) | 신뢰도 등급 색상 SoT 재사용 | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | **6섹션 정의 SoT** | `web_plan_vN §8.2`: 1)파이프라인 2)패턴3종 3)계량경제학 기법 4)ML 모델 5)신뢰도 6)데이터 소스 / `feature_dev_list_vN §feat/fe-methodology-tab`: 1)파이프라인 2)분석 파라미터 3)패턴 정의 4)신뢰도 5)품목·경로(3구간/4구간) 6)한계 및 고지 | **web_plan §8.2 채택**. PM 결재 후 채택 SoT 확정 + 다른 쪽 갱신 |
| 2 | Header 라우팅 정책 | fe-layout-filter v4: 4탭 + `/methodology` 라우트 동시 갱신 / plan_frontend_alignment §3.4: 3탭+우측 버튼 분리 | **fe-layout-filter v4 잠정 채택** (4탭). Header.tsx 구현이 3탭+버튼 상태라면 회귀 발생 위험 — fe-layout-filter v4 PR에서 4탭으로 정정 후 본 명세 진입 |
| 3 | 플로우 다이어그램 구현 방식 | `web_plan_vN §8.2`: D3.js 우선, Figma SVG 정적 폴백 | D3.js 우선 명세, 정적 SVG 폴백 조건 §3.3① 병기. PM·S6 진행 상황 기준으로 최종 결정 |
| 4 | Phase 8.5·Phase 9 포함 여부 | `web_plan_vN §8.2`: Phase 8.5·9 포함 / `api_spec_vN §/meta/pipeline`: Phase 0~8 + 7-ML만 (8.5·9 없음) | API 응답 `nodes[]` 기준만 렌더링. Phase 8.5·9 비구현. 사용자 시각 불일치 위험 PM 승인 필요 |
| 5 | 섹션 3~6 콘텐츠 출처 | 전용 API 엔드포인트 없음 | 컴포넌트 내 정적 텍스트 + 섹션 3 파라미터 수치는 `/meta/analysis-params` 동적 삽입 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

상단 바 4뷰 탭의 "방법론" 탭 클릭 시 메인 시각화 화면을 대체하는 전용 정보 화면으로(`/methodology` 라우트 동시 갱신, fe-layout-filter v4 PM 별건 #1), `/meta/pipeline`·`/meta/analysis-params` API 응답을 기반으로 6개 섹션(web_plan §8.2 SoT 잠정 채택)을 렌더링한다.

### 1.2 데이터 흐름

```
useAppStore.activeTab === 'methodology' (fe-layout-filter v4 ViewTab 4탭)
  → /methodology 라우트 진입 + MethodologyPage.tsx 마운트
  → MethodologyPage 내부에 MethodologyView 컴포넌트 렌더링

usePipelineData() [React Query]
  → GET /meta/pipeline
  → PipelineMetaResponse { version, nodes[], edges[] }
  → PipelineFlowDiagram.tsx (D3.js 또는 정적 SVG)

useAnalysisParams() [React Query]
  → GET /meta/analysis-params
  → AnalysisParamsResponse { version, params, patterns[] }
  → PatternCards.tsx (패턴 카드 3종)
  → 섹션 3 파라미터 수치 동적 삽입 (rolling_window, zscore_warning, zscore_alert 등)

섹션 3~6 (계량경제학 기법·ML 모델·신뢰도 등급·데이터 소스): 컴포넌트 내 정적 콘텐츠 (PM 별건 #5)

스토어 쓰기: 없음. 본 feat는 완전 읽기 전용
  - `isPanelOpen=false` 자동 갱신은 fe-layout-filter v4의 setActiveTab('methodology') 핸들러 책임 (P1 #6)
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/pages/MethodologyPage.tsx` | fe-layout-filter v4가 생성한 placeholder 페이지에 `<MethodologyView />` 본격 마운트 |
| 수정 | `src/pages/MainPage.tsx` | 4뷰 탭 라우팅에 따라 `activeTab === 'methodology'` 상태와 `/methodology` 라우트가 동기화됨 (fe-layout-filter v4 정책) — MainPage 내부에서는 별도 처리 불필요 |
| 수정 | `src/api/client.ts` | mock 인터셉터에 `/meta/pipeline`·`/meta/analysis-params` 정적 경로 추가 |
| 신규 | `src/components/charts/MethodologyView.tsx` | 방법론 탭 최상위 컨테이너. 6개 섹션 조합·스크롤 레이아웃 |
| 신규 | `src/components/charts/PipelineFlowDiagram.tsx` | D3.js 파이프라인 플로우 다이어그램 (or 정적 SVG 폴백). frame_spec_frontend_vN §8.6 D3 컴포넌트 위치 정책 (`src/components/charts/`) 정합 |
| 신규 | `src/hooks/usePipelineData.ts` | `/meta/pipeline` React Query 훅. staleTime: 1시간. retry: 2 |
| 신규 | `src/hooks/useAnalysisParams.ts` | `/meta/analysis-params` React Query 훅. staleTime: 1시간. retry: 2 |
| 신규 | `src/fixtures/pipeline.json` | GET `/meta/pipeline` mock 응답 (api_spec_vN 예시 노드·엣지 그대로) |
| 신규 | `src/fixtures/analysis_params.json` | GET `/meta/analysis-params` mock 응답 (api_spec_vN 예시 그대로) |

> **`endpoints.ts` 미수정**: `META_PIPELINE`, `META_ANALYSIS_PARAMS`이 frame 단계에서 이미 정의됨.
> **방법론 탭에서 분석 패널 없음**: `isPanelOpen === true`이더라도 방법론 탭 진입 시 `setActiveTab('methodology')` 호출 시 `closePanel()` 또는 `isPanelOpen=false` 동반 갱신 (fe-layout-filter v4 책임 — verify §6).

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | MethodologyView 6섹션 전체 레이아웃 (PM 별건 #1 — web_plan §8.2 채택), PipelineFlowDiagram (D3.js 우선, 정적 SVG 폴백), PatternCards (analysis-params `patterns[]` 동적 렌더링), 섹션 3 파라미터 수치 동적 삽입, 섹션 4~6 정적 콘텐츠, usePipelineData·useAnalysisParams 훅, fixture 2종, 방법론 탭 진입 시 필터 바·미니맵 숨김 |
| **비구현** | Phase 8.5·Phase 9 노드 (PM 별건 #4), 각 섹션 내 인터랙티브 계산 도구, 텍스트 검색 기능 |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` (4뷰 탭 SoT + `/methodology` 라우트) + `feat/fe-stream-chart` (`src/utils/colorUtils.ts` 신뢰도 등급 색상 SoT) → `develop` 머지 완료 |
| **백엔드 선행** | `feat/be-api-meta` 완료 시 mock 모드 → 실제 API 전환 (PM 별건 #2 §1.4) |

---

## 2. 입력 데이터

### 2.1 API 응답 — `/meta/pipeline`

| 필드 | 타입 | 비고 |
|------|------|------|
| `version` | `string` | 예: `"v8"`. 다이어그램 우측 상단에 표시 |
| `nodes[].id` | `string` | 다이어그램 노드 식별자 |
| `nodes[].label` | `string` | 노드 표시 텍스트 |
| `nodes[].description` | `string` | 노드 호버 툴팁 또는 클릭 시 표시 텍스트 |
| `nodes[].phase_number` | `number` | 위상 순서 (7.5 등 소수 가능) |
| `edges[].source` | `string` | 출발 노드 id |
| `edges[].target` | `string` | 도착 노드 id |
| `edges[].label` | `string \| undefined` | 분기 조건 라벨 (예: "공적분 있음") |

### 2.2 API 응답 — `/meta/analysis-params`

| 필드 | 타입 | 사용처 |
|------|------|--------|
| `version` | `string` | 섹션 2 패턴 카드 소제목 |
| `params.rolling_window` | `number` | 섹션 3 Z-score 기법 |
| `params.zscore_warning` | `number` | 섹션 3 Z-score 기법 |
| `params.zscore_alert` | `number` | 섹션 3 Z-score 기법 |
| `params.iqr_multiplier` | `number` | 섹션 3 IQR 기법 |
| `params.stability_threshold` | `number` | 섹션 2 패턴3 카드 (±3% 기준) |
| `params.pattern3_n_values` | `number[]` | 섹션 2 패턴3 카드 |
| `params.lag_search_range` | `[number, number]` | 섹션 3 IRF 기법 |
| `params.chow_test_points` | `string[]` | 섹션 3 Bai-Perron 기법 |
| `patterns[].pattern_id` | `'pattern1' \| 'pattern2' \| 'pattern3'` | 패턴 카드 식별자 |
| `patterns[].label_kr` | `string` | 패턴 카드 제목 |
| `patterns[].description` | `string` | 패턴 카드 본문 |
| `patterns[].applicable_segments` | `SegmentId[]` | 패턴 카드 적용 구간 배지 |

### 2.3 캐시 전략

| 항목 | 설정 |
|------|------|
| `staleTime` | 3600000 (1시간) — 파이프라인 구조·파라미터는 분석 버전이 바뀔 때만 변경 |
| `retry` | 2 |
| `refetchOnWindowFocus` | `false` |

---

## 3. 출력 데이터

### 3.1 렌더링 출력 (PM 별건 #1 — web_plan §8.2 SoT 채택)

방법론 탭은 스크롤 가능한 단일 컬럼 레이아웃. 6개 섹션이 순서대로 표시된다.

| 섹션 | 제목 | 콘텐츠 출처 |
|------|------|-------------|
| 1 | 분석 파이프라인 개요 | `/meta/pipeline` (D3.js 다이어그램 또는 정적 SVG) |
| 2 | 이상 탐지 패턴 3종 | `/meta/analysis-params` `patterns[]` (동적 카드) |
| 3 | 계량경제학 기법 | 정적 텍스트 + `params` 수치 동적 삽입 |
| 4 | ML 모델 | 정적 텍스트 |
| 5 | 신뢰도 등급 체계 | 정적 텍스트 |
| 6 | 데이터 소스 | 정적 텍스트 |

### 3.2 useAppStore 쓰기

본 feat에서는 useAppStore 직접 쓰기 없음. `isPanelOpen=false` 자동 갱신은 fe-layout-filter v4 `setActiveTab('methodology')` 핸들러에서 처리 (P1 #6).

### 3.3 시각화 규격 (web_plan_vN §8.2 기준)

#### ① 섹션 1 — 파이프라인 플로우 다이어그램

**D3.js 구현 (우선)**:

| 항목 | 규격 |
|------|------|
| 레이아웃 | 위→아래 DAG 레이아웃 (`d3-dag` 또는 수동 `phase_number` 기반 Y 좌표) |
| 노드 | 라운드 박스. 텍스트: `nodes[].label`. 배경: `#1e293b`. 테두리: `#334155` |
| 분기 노드 | phase 4 VECM·VAR는 동일 Y 좌표에 나란히 배치 |
| 엣지 | 화살표 라인 (`d3.linkVertical`). `edges[].label` 있으면 엣지 중앙에 텍스트 표시 |
| 노드 클릭 | 해당 `nodes[].description` 팝오버 표시 (D3 tooltip 방식) |
| version 표시 | 다이어그램 우측 상단: "파이프라인 버전: {version}" |

**정적 SVG 폴백 조건** (PM 별건 #3):
- Figma 제작 SVG 이미지 `src/assets/pipeline_flow.svg` 배치
- SVG 내 텍스트는 web_plan §8.2 챕터 플로우와 동일 내용
- 노드 클릭 인터랙션 없음 — 각 Phase 설명을 SVG 아래 정적 텍스트 블록으로 대체
- **폴백 채택 시**: `PipelineFlowDiagram.tsx` 내 `<img>` 태그 렌더링, `nodes[]`·`edges[]` API 데이터 미사용, `usePipelineData` 훅 불필요

#### ② 섹션 2 — 이상 탐지 패턴 카드

`patterns[]` 배열을 순서대로 카드 3장 렌더링.

| 항목 | 렌더링 |
|------|--------|
| 카드 제목 | `patterns[i].label_kr` |
| 본문 | `patterns[i].description`. 패턴 3 본문 중 "±3%" 값은 `params.stability_threshold * 100` 동적 치환, "N개월" 값은 `params.pattern3_n_values.join('·')` 동적 치환 |
| 적용 구간 배지 | `patterns[i].applicable_segments[]` 배지 형태 |
| 패턴 번호 칩 | "패턴 1" / "패턴 2" / "패턴 3" 색상 칩 |

#### ③ 섹션 3 — 계량경제학 기법 설명

8개 기법 항목별 접이식(accordion). 클릭 시 상세 설명 확장.

| 기법 | 동적 삽입 파라미터 |
|------|-------------------|
| STL 분해 | 없음 (정적) |
| ADF + KPSS 검정 | 없음 (정적) |
| Johansen 공적분 검정 | 없음 (정적) |
| VAR / VECM | `params.lag_search_range` → "시차 {lag_search_range[0]}~{lag_search_range[1]}개월 탐색" |
| IRF | `params.lag_search_range` 동일 |
| Bai-Perron | `params.chow_test_points` → "사전 검정 시점: {chow_test_points.join(', ')}" |
| TECM / 비대칭 VAR | 없음 (정적) |
| Z-score + IQR | `params.rolling_window` → "롤링 {rolling_window}개월", `params.zscore_warning` → "Z-score {zscore_warning} 주의", `params.zscore_alert` → "Z-score {zscore_alert} 경보", `params.iqr_multiplier` → "IQR×{iqr_multiplier}" |

> 단순 텍스트 템플릿 치환. i18n 라이브러리 도입 금지.

#### ④ 섹션 4 — ML 모델 설명

3개 모델 정적 표 (Isolation Forest / LOF / One-Class SVM) + ML 입력 피처 6종 목록.

#### ⑤ 섹션 5 — 신뢰도 등급 체계

| 등급 | 색상 표시 | 조건 | 논문 처리 |
|------|-----------|------|-----------|
| 고신뢰 이상 | `#e24b4a` 배지 | 통계 탐지 O + ML 탐지 동시 확인 | 주 결과 테이블 포함 |
| 중신뢰 이상 | `#ef9f27` 배지 | 통계 탐지 O + ML 미탐지 | 주 결과 테이블 포함 |
| 참고 이상 | `#c8d850` 배지 | ML 탐지 O + 통계 미탐지 | 별도 논의 대상 |

색상값은 `src/utils/colorUtils.ts` 상수 재사용 (`feat/fe-stream-chart` SoT — 선행 조건 명시).

#### ⑥ 섹션 6 — 데이터 소스

7개 소스 정적 테이블 (web_plan §8.2 섹션 6 원문):

| # | 소스 | 제공 기관 | 활용 단계 |
|---|------|-----------|-----------|
| 1 | World Bank Pink Sheet | 세계은행 | 국제 원자재가 |
| 2 | FAO FFPI | FAO | 국제 원자재가 보조 |
| 3 | 수입단가 | 관세청 무역통계포털 | 수입단가 |
| 4 | 환율 | 한국수출입은행 | 국제가 원화 환산 |
| 5 | PPI | 한국은행 ECOS | 생산자 물가 |
| 6 | CPI | 한국은행 ECOS | 소비자 물가 |
| 7 | KAMIS 도매가 | 농수산물유통공사 | 도매가 (4구간 품목만) |

---

## 4. 예외처리

### 4.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/meta/pipeline` 또는 `/meta/analysis-params` 네트워크 실패 | FE_TOAST + 재시도 버튼. 섹션 1·2는 로딩 스켈레톤. 섹션 3~6은 정상 표시 |
| `FE-API-004` | `/meta/pipeline` 또는 `/meta/analysis-params` 500 응답 | 동일 |
| `FE-API-005` | 응답 타임아웃 | FE_TOAST + 재시도 |
| `FE-D3-003` | PipelineFlowDiagram SVG 컨테이너 크기 0 | FE_FALLBACK — ResizeObserver 감지 후 재렌더링 |
| `PARSE-ARR-002` | `nodes[]` 또는 `edges[]` 배열 요소 필수 필드 누락 | FE_FALLBACK — 해당 노드/엣지 skip, 콘솔 경고 |
| `PARSE-ENUM-002` | `patterns[].pattern_id` 또는 `applicable_segments[]`가 literals.ts union 외 값 | FE_TOAST + 해당 카드 무시 |
| `PARSE-SCHEMA-001` | `/meta/pipeline` 또는 `/meta/analysis-params` envelope 구조 불일치 | FE_BLOCK |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'`에서 fixture 없음 | FE_BLOCK (개발환경) |

### 4.2 부분 실패 처리

- `/meta/pipeline` 실패 + `/meta/analysis-params` 성공 → 섹션 1 에러 UI + 섹션 2 정상 표시
- `/meta/pipeline` 성공 + `/meta/analysis-params` 실패 → 섹션 1 정상 표시 + 섹션 2 에러 UI + 섹션 3 파라미터 수치 `—`(대시) 표시

### 4.3 신규 예외 코드 제안

해당 없음.

---

## 5. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| Fixture 경로 | `src/fixtures/pipeline.json`, `src/fixtures/analysis_params.json` |
| Fixture 내용 | `api_spec_vN §/meta/pipeline`, `§/meta/analysis-params` 응답 예시 그대로 사용 |
| MOCK 분기 조건 | `import.meta.env.VITE_USE_MOCK !== 'false'` |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` + `feat/be-api-meta` 완료 후 (P1 #5) |

### 5.1 pipeline.json fixture (11개 노드, 12개 엣지)

```json
{
  "version": "v8",
  "nodes": [
    { "id": "phase0",      "label": "Phase 0",    "description": "데이터 수집·전처리",   "phase_number": 0 },
    { "id": "phase1",      "label": "Phase 1",    "description": "계절 조정 (STL)",      "phase_number": 1 },
    { "id": "phase2",      "label": "Phase 2",    "description": "정상성 검정",           "phase_number": 2 },
    { "id": "phase3",      "label": "Phase 3",    "description": "공적분 검정",           "phase_number": 3 },
    { "id": "phase4_vecm", "label": "VECM 추정",  "description": "장기 균형 포함 모형",  "phase_number": 4 },
    { "id": "phase4_var",  "label": "VAR 추정",   "description": "단기 동적 모형",       "phase_number": 4 },
    { "id": "phase5",      "label": "Phase 5",    "description": "Granger 인과 검정",    "phase_number": 5 },
    { "id": "phase6",      "label": "Phase 6",    "description": "구조 변화 탐지",       "phase_number": 6 },
    { "id": "phase7",      "label": "Phase 7",    "description": "통계 기반 이상 탐지",  "phase_number": 7 },
    { "id": "phase7_ml",   "label": "Phase 7-ML", "description": "ML 보조 교차검증",     "phase_number": 7.5 },
    { "id": "phase8",      "label": "Phase 8",    "description": "결과 종합·등급화",     "phase_number": 8 }
  ],
  "edges": [
    { "source": "phase0",      "target": "phase1" },
    { "source": "phase1",      "target": "phase2" },
    { "source": "phase2",      "target": "phase3" },
    { "source": "phase3",      "target": "phase4_vecm", "label": "공적분 있음" },
    { "source": "phase3",      "target": "phase4_var",  "label": "공적분 없음" },
    { "source": "phase4_vecm", "target": "phase5" },
    { "source": "phase4_var",  "target": "phase5" },
    { "source": "phase5",      "target": "phase6" },
    { "source": "phase6",      "target": "phase7" },
    { "source": "phase6",      "target": "phase7_ml" },
    { "source": "phase7",      "target": "phase8" },
    { "source": "phase7_ml",   "target": "phase8" }
  ]
}
```

### 5.2 analysis_params.json fixture

```json
{
  "version": "v8",
  "params": {
    "rolling_window": 48,
    "zscore_warning": 2.0,
    "zscore_alert": 2.5,
    "iqr_multiplier": 1.5,
    "stability_threshold": 0.03,
    "pattern3_n_values": [2, 3, 6],
    "min_subperiod_obs": 60,
    "lag_search_range": [1, 4],
    "chow_test_points": ["2008-01", "2020-01", "2022-01"]
  },
  "patterns": [
    {
      "pattern_id": "pattern1",
      "label_kr": "패턴 1: 방향 역전 및 시차 이탈",
      "description": "국제 원자재 가격이 변동할 때 다음 단계 가격이 반대 방향으로 움직이거나, 정상 전달 시차(IRF 피크 시점 + 버퍼 1개월)를 초과해도 하류가 무반응인 경우",
      "applicable_segments": ["A", "B", "C", "D", "D_prime"]
    },
    {
      "pattern_id": "pattern2",
      "label_kr": "패턴 2: 전이율 크기 이탈 및 비대칭 전달(로켓-깃털 효과)",
      "description": "전이율이 롤링 Z-score와 IQR 기준을 동시 초과하거나, TECM/비대칭 VAR에서 상승·하락 조정 속도가 유의미하게 다른 경우",
      "applicable_segments": ["A", "B"]
    },
    {
      "pattern_id": "pattern3",
      "label_kr": "패턴 3: 국제가격 안정기 중 하류 물가 스프레드 누적 확대",
      "description": "국제가 안정기(원화 환산 월 변동 ±3% 이내)에 수입단가-PPI 간 수준 괴리가 N개월 연속 같은 방향으로 확대되는 경우",
      "applicable_segments": ["B"]
    }
  ]
}
```

---

## 6. 완료 기준

| 항목 | 기준 |
|------|------|
| 방법론 탭 마운트 분기 | `activeTab === 'methodology'` 시 MethodologyView 마운트, 다른 탭 전환 시 unmount 확인. URL 직접 입력으로 `/methodology` 진입 시 `activeTab` sync 확인 (fe-layout-filter v4 정합) |
| 필터 바·미니맵 숨김 | 방법론 탭 진입 시 FilterBar·Minimap 미표시 확인 |
| 패널 자동 닫힘 verify | 방법론 탭 진입 시 `isPanelOpen === false` 확인 (책임: fe-layout-filter v4 setActiveTab 핸들러 — P1 #6) |
| 플로우 다이어그램 렌더링 | pipeline.json 11개 노드·12개 엣지 SVG 렌더링 확인 |
| VECM·VAR 분기 | phase4_vecm·phase4_var 노드 나란히 배치, "공적분 있음/없음" 엣지 라벨 확인 |
| 노드 클릭 툴팁 | 노드 클릭 시 `description` 팝오버 표시 확인 |
| version 표시 | "파이프라인 버전: v8" 텍스트 표시 확인 |
| 패턴 카드 3종 | analysis_params.json 기반 패턴 카드 3장 렌더링 확인 |
| 패턴 적용 구간 배지 | `applicable_segments` 배지 표시 확인 |
| 파라미터 동적 삽입 | 섹션 3에서 `rolling_window: 48`, `zscore_warning: 2.0`, `zscore_alert: 2.5` 수치 텍스트 확인 |
| 섹션 3~6 정적 콘텐츠 | 8개 기법·3개 ML 모델·등급 3종·소스 7종 표 렌더링 확인 |
| 신뢰도 등급 색상 SoT | colorUtils.ts(`feat/fe-stream-chart` 정의값) import 확인 — 색상 하드코딩 없음 |
| 부분 실패 처리 | /meta/pipeline 실패 mock 시: 섹션 1 에러 UI + 섹션 2+ 정상 표시 |
| MOCK 분기 | fixture 데이터 반환, HTTP 요청 없음 확인 |
| 6섹션 정의 PM 결재 반영 | PM 별건 #1 결재 결과(web_plan §8.2 vs feature_dev_list)에 따른 섹션 구성 확인 |
| Header 4탭 정합 | Header.tsx가 4탭(흐름·전달·원시·방법론) 표시 + 방법론 클릭 시 `setActiveTab('methodology')` + `navigate('/methodology')` 동시 호출 확인 (PM 별건 #2) |

---

## 7. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| D3.js 외 다이어그램 라이브러리 추가 (`react-flow`, `mermaid` 등) | D3.js v7 단일 사용 원칙 |
| 정적 콘텐츠(섹션 3~6)를 API 엔드포인트 없이 서버에서 가져오는 구조 추가 | 명세 없는 신규 API 호출 금지 |
| Phase 8.5·Phase 9 노드를 API 응답 외 하드코딩으로 다이어그램에 강제 삽입 | API 응답 `nodes[]` 기준 렌더링 원칙 (PM 별건 #4) |
| 방법론 탭에서 이상 노드 클릭·패널 오픈 기능 추가 | 방법론 탭은 완전 읽기 전용 화면 |
| 신뢰도 등급 색상 하드코딩 | `src/utils/colorUtils.ts` SoT 사용 (`feat/fe-stream-chart` 정의값 재사용) |
| 본 feat에서 `setActiveTab` 또는 `setIsPanelOpen` 직접 호출 | fe-layout-filter v4 책임. 본 feat는 읽기 전용 |
| localStorage / sessionStorage 사용 | frame_spec_frontend_vN §8.10 |

---

## 8. PR 체크리스트

### Feature 명세
`docs/feature_spec_fe-methodology-tab_vN.md` (최신 버전)

### 체크리스트
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] `pipeline.json` fixture 노드 11개·엣지 12개 확인
- [ ] `analysis_params.json` fixture `patterns[]` 3개 확인
- [ ] 방법론 탭 진입 시 필터 바 숨김 확인
- [ ] 방법론 탭 진입 시 `isPanelOpen === false` 확인 (fe-layout-filter v4 핸들러 verify)
- [ ] 파라미터 동적 삽입 값이 fixture와 일치하는지 확인 (hardcode 없음)
- [ ] 정적 콘텐츠 섹션 3~6이 web_plan §8.2 원문과 일치하는지 확인
- [ ] colorUtils.ts 신뢰도 등급 색상 import 확인

### PM 별건 처리 결과
- [ ] PM 별건 #1 — 6섹션 정의 SoT(web_plan §8.2 vs feature_dev_list) 결재 결과 반영
- [ ] PM 별건 #2 — Header 4탭 vs 3탭+버튼 결재 결과 반영 (fe-layout-filter v4 정합)
- [ ] PM 별건 #3 — 플로우 다이어그램 D3 vs 정적 SVG 결재 결과 반영
- [ ] PM 별건 #4 — Phase 8.5·9 노드 표시 여부 결재 결과 반영
- [ ] PM 별건 #5 — 섹션 3~6 콘텐츠 출처 (정적 + 동적 삽입) 결재 결과 반영

---

## 9. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `api_spec_vN.md` | `§/meta/pipeline, §/meta/analysis-params` | 응답 필드·타입 |
| `web_plan_vN.md` | `§8, §8.2` | 방법론 탭 6섹션 UX·콘텐츠 원문 |
| `frame_spec_frontend_vN.md` | `§2, §6.2, §8.6` | 디렉토리·D3 컴포넌트 위치·Zustand SoT (D3 차트 feat 단계 신규 추가) |
| `feature_spec_fe-layout-filter_vN.md` | `§3.1 ViewState, §3.2 Header 4뷰 탭` | 4탭 라우팅·`isPanelOpen` 갱신 책임 |
| `feature_spec_fe-stream-chart_vN.md` | `§4 colorUtils.ts` | 신뢰도 등급 색상 SoT 재사용 |
| `src/types/meta.ts` | 전체 | `PipelineMetaResponse`, `AnalysisParamsResponse` 타입 확인 |
| `src/utils/colorUtils.ts` | 이상 등급 색상 상수 | 섹션 5 신뢰도 등급 색상 재사용 |

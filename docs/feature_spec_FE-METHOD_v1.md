# Feature 명세서 — 방법론 탭

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-METHOD`  
**브랜치명**: `feat/fe-methodology-tab`  
**담당자**: 하대수  
**작성일**: 2026-05-06  
**상태**: 초안  

**변경 이력**
- v1 (2026-05-06): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/meta/pipeline, §/meta/analysis-params` | 최신(`docs_manifest.md` 조회) | 엔드포인트·response 필드명·타입 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §8` | 최신(`docs_manifest.md` 조회) | 디렉토리 구조·snake_case·절대 금지 사항 | ☐ |
| `web_plan_vN.md §8` | 최신(`docs_manifest.md` 조회) | 방법론 탭 UX 상세 명세 (섹션 6종·플로우 다이어그램·패턴 카드) | ☐ |
| `feature_dev_list_vN.md §feat/fe-methodology-tab` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준 | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다.

---

## ⚠️ Action Items — 미결 불일치 항목

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| 플로우 다이어그램 구현 방식 | `web_plan_vN §8.2`: "D3.js v7로 인터랙티브 다이어그램 구현 우선. 원활하지 않을 경우 Figma SVG 정적 이미지 대체. S6 스프린트 진행 상황에 따라 결정" | D3.js vs 정적 SVG — 미확정 | 본 명세는 D3.js 구현 방향으로 명세하되, §3.3① 에 정적 SVG 폴백 구현 조건 병기. PM·S6 진행 상황 기준으로 최종 결정 |
| Phase 8.5·Phase 9 포함 여부 | `web_plan_vN §8.2` 플로우 챕터: Phase 8.5(품목 간 동조성 분석), Phase 9(논문 작성 + 웹 서비스 시각화) 포함 | `api_spec_vN §/meta/pipeline` 응답: Phase 0~8 + Phase 7-ML만 정의 (8.5·9 없음) | API 응답에 없는 Phase 8.5·9를 다이어그램에 표시할 경우 API 데이터와 독립적으로 하드코딩 필요. 본 명세는 **API 응답 nodes[] 기준**으로만 렌더링하고, Phase 8.5·9는 비구현 처리. PM 요청 시 정적 노드 추가 여부 결정 |
| 섹션 3~6 콘텐츠 출처 | `web_plan_vN §8.2` 섹션 3(계량경제학 기법)·섹션 4(ML 모델)·섹션 5(신뢰도 등급)·섹션 6(데이터 소스)의 내용 | 전용 API 엔드포인트 없음 | 섹션 3~6은 API 응답 기반이 아닌 컴포넌트 내 정적 텍스트로 구현. 단, 섹션 3의 파라미터 수치(rolling_window, zscore_warning 등)는 `/meta/analysis-params` 응답값을 동적 삽입. PM 이견 없으면 이 방식 채택 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

상단 바 "방법론" 탭 클릭 시 메인 시각화 화면을 대체하는 전용 정보 화면으로, `/meta/pipeline`·`/meta/analysis-params` API 응답을 기반으로 파이프라인 플로우 다이어그램·이상 탐지 패턴 카드·기법 설명·ML 모델·신뢰도 등급·데이터 소스 6개 섹션을 렌더링한다.

### 1.2 데이터 흐름

```
useAppStore.activeTab === 'methodology'
  → MethodologyView.tsx 마운트

usePipelineData() [React Query]
  → GET /meta/pipeline
  → PipelineMetaResponse { version, nodes[], edges[] }
  → PipelineFlowDiagram.tsx (D3.js 또는 정적 SVG)

useAnalysisParams() [React Query]
  → GET /meta/analysis-params
  → AnalysisParamsResponse { version, params, patterns[] }
  → PatternCards.tsx (패턴 카드 3종)
  → 섹션 3 파라미터 수치 동적 삽입 (rolling_window, zscore_warning, zscore_alert 등)

섹션 3~6 (계량경제학 기법·ML 모델·신뢰도 등급·데이터 소스): 컴포넌트 내 정적 콘텐츠

스토어 쓰기: 없음. 이 탭은 완전 읽기 전용
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'methodology'` 분기에 `<MethodologyView />` 마운트. 필터 바·미니맵 숨김 처리 (방법론 탭은 필터·미니맵 불필요) |
| 수정 | `src/api/client.ts` | `MOCK_ROUTES`에 `/meta/pipeline`·`/meta/analysis-params` 정적 경로 추가. frame 단계에서 이미 `/freshness`·`/segments`·`/events` 등 정적 경로 4종이 등록되어 있으나, `/meta/*` 경로는 아직 미등록 |
| 신규 | `src/components/charts/MethodologyView.tsx` | 방법론 탭 최상위 컨테이너. 6개 섹션 조합·스크롤 레이아웃 |
| 신규 | `src/components/charts/PipelineFlowDiagram.tsx` | D3.js 파이프라인 플로우 다이어그램 (or 정적 SVG 폴백) |
| 신규 | `src/hooks/usePipelineData.ts` | `/meta/pipeline` React Query 훅. staleTime: 1시간 (파이프라인 구조는 자주 변경 안 됨). retry: 2 |
| 신규 | `src/hooks/useAnalysisParams.ts` | `/meta/analysis-params` React Query 훅. staleTime: 1시간. retry: 2 |
| 신규 | `src/fixtures/pipeline.json` | GET `/meta/pipeline` mock 응답 (api_spec_vN 예시 노드·엣지 그대로) |
| 신규 | `src/fixtures/analysis_params.json` | GET `/meta/analysis-params` mock 응답 (api_spec_vN 예시 그대로) |

> **`endpoints.ts` 미수정**: `META_PIPELINE: '/meta/pipeline'`, `META_ANALYSIS_PARAMS: '/meta/analysis-params'`이 frame 단계에서 이미 정의됨.  
> **방법론 탭에서 분석 패널 없음**: `isPanelOpen` 상태가 `true`이더라도 방법론 탭 진입 시 패널 닫힘. `activeTab` 변경 → `setPanelOpen(false)` 호출 (feat/fe-layout-filter가 이미 구현했거나 본 브랜치에서 추가)

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | MethodologyView 6섹션 전체 레이아웃, PipelineFlowDiagram (D3.js 우선, 정적 SVG 폴백), PatternCards (analysis-params `patterns[]` 동적 렌더링), 섹션 3 파라미터 수치 동적 삽입, 섹션 4~6 정적 콘텐츠, usePipelineData·useAnalysisParams 훅, fixture 2종, 방법론 탭 진입 시 필터 바·미니맵 숨김, 방법론 탭 진입 시 패널 자동 닫힘 |
| **비구현** | Phase 8.5·Phase 9 노드 (Action Item — API 응답에 없음), 각 섹션 내 인터랙티브 계산 도구 (파라미터 직접 입력 등) — 이 서비스는 렌더링 전용, 텍스트 검색 기능 |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` → `develop` PR 머지 완료 (`src/hooks/` 폴더, `activeTab === 'methodology'` 탭 상태 존재) |

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
| `version` | `string` | 섹션 2 패턴 카드 소제목에 표시 |
| `params.rolling_window` | `number` | 섹션 3 Z-score 기법 설명에 동적 삽입 |
| `params.zscore_warning` | `number` | 섹션 3 Z-score 기법 설명에 동적 삽입 |
| `params.zscore_alert` | `number` | 섹션 3 Z-score 기법 설명에 동적 삽입 |
| `params.iqr_multiplier` | `number` | 섹션 3 IQR 기법 설명에 동적 삽입 |
| `params.stability_threshold` | `number` | 섹션 2 패턴3 카드에 동적 삽입 (±3% 기준) |
| `params.pattern3_n_values` | `number[]` | 섹션 2 패턴3 카드에 동적 삽입 |
| `params.lag_search_range` | `[number, number]` | 섹션 3 IRF 기법 설명에 동적 삽입 |
| `params.chow_test_points` | `string[]` | 섹션 3 Bai-Perron 기법 설명에 동적 삽입 |
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

### 3.1 렌더링 출력

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

| 필드 | 트리거 | 값 |
|------|--------|-----|
| `isPanelOpen: boolean` | 방법론 탭 진입(`activeTab === 'methodology'` 전환) | `false` |

> 방법론 탭은 이상 노드·패널이 없으므로 진입 시 패널 자동 닫힘. `selectedAnomalyId`는 유지 (탭 복귀 시 패널 재오픈 허용).

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

**정적 SVG 폴백 조건** (D3 구현 불가 판명 시):
- Figma 제작 SVG 이미지 `src/assets/pipeline_flow.svg` 배치
- SVG 내 텍스트는 web_plan §8.2 챕터 플로우와 동일한 내용으로 구성
- 노드 클릭 인터랙션 없음 — 각 Phase 설명을 SVG 아래 정적 텍스트 블록으로 대체
- **폴백 채택 시**: `PipelineFlowDiagram.tsx` 내 `<img>` 태그로 SVG 렌더링, `nodes[]`·`edges[]` API 데이터 미사용, `usePipelineData` 훅 불필요 (단, 후속 버전 전환 대비 훅 구조는 유지)

#### ② 섹션 2 — 이상 탐지 패턴 카드

`patterns[]` 배열을 순서대로 카드 3장 렌더링.

| 항목 | 렌더링 |
|------|--------|
| 카드 제목 | `patterns[i].label_kr` |
| 본문 | `patterns[i].description`. 패턴 3 본문 중 "±3%" 값은 `params.stability_threshold * 100`으로 동적 치환, "N개월" 값은 `params.pattern3_n_values.join('·')` 동적 치환 |
| 적용 구간 배지 | `patterns[i].applicable_segments[]` 배지 형태 표시 (예: "구간 A", "구간 B") |
| 패턴 번호 칩 | "패턴 1" / "패턴 2" / "패턴 3" 색상 칩 (패턴별 CLAUDE.md §9 패턴 색상 참조) |

#### ③ 섹션 3 — 계량경제학 기법 설명

8개 기법을 항목별 접이식(accordion) 형태로 표시. 클릭 시 상세 설명 확장.

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

> **단순 텍스트 템플릿 치환 방식**: 파라미터 수치를 컴포넌트 props로 전달하여 JSX 내 `{params.rolling_window}` 방식으로 삽입. i18n 라이브러리 도입 금지.

#### ④ 섹션 4 — ML 모델 설명

3개 모델 설명 표 (정적):

| 모델 | 렌더링 |
|------|--------|
| Isolation Forest | 작동 원리 + 이 서비스에서의 역할 (web_plan §8.2 섹션 4 원문) |
| LOF | 동일 |
| One-Class SVM | 동일 |

ML 입력 피처 6종 목록도 정적 렌더링.

#### ⑤ 섹션 5 — 신뢰도 등급 체계

| 등급 | 색상 표시 | 조건 | 논문 처리 |
|------|-----------|------|-----------|
| 고신뢰 이상 | `#e24b4a` 배지 | 통계 탐지 O + ML 탐지 동시 확인 | 주 결과 테이블 포함 |
| 중신뢰 이상 | `#ef9f27` 배지 | 통계 탐지 O + ML 미탐지 | 주 결과 테이블 포함 |
| 참고 이상 | `#c8d850` 배지 | ML 탐지 O + 통계 미탐지 | 별도 논의 대상 |

색상값은 `src/utils/colorUtils.ts` 상수 재사용 (feat/fe-stream-chart 정의값).

#### ⑥ 섹션 6 — 데이터 소스

7개 소스 정적 테이블 (web_plan §8.2 섹션 6 원문 그대로):

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
| `FE-API-001` | `/meta/pipeline` 또는 `/meta/analysis-params` 네트워크 실패 | FE_TOAST ("파이프라인 정보를 불러오지 못했습니다.") + 재시도 버튼. 섹션 1·2는 로딩 스켈레톤 표시. 섹션 3~6은 정적 콘텐츠이므로 정상 표시 |
| `FE-API-004` | `/meta/pipeline` 또는 `/meta/analysis-params` 500 응답 | 동일. 섹션 1·2 에러 UI, 섹션 3~6 정상 표시 |
| `FE-D3-003` | PipelineFlowDiagram SVG 컨테이너 크기 0 | FE_FALLBACK — ResizeObserver 감지 후 재렌더링 |
| `PARSE-ARR-002` | `nodes[]` 또는 `edges[]` 배열 요소 필수 필드 누락 | FE_FALLBACK — 해당 노드/엣지 skip, 콘솔 경고. 나머지 노드로 다이어그램 렌더링 |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'`에서 `pipeline.json` 또는 `analysis_params.json` 없음 | FE_BLOCK (개발환경 전용) |

### 4.2 부분 실패 처리

- `/meta/pipeline` 실패 + `/meta/analysis-params` 성공 → 섹션 1 에러 UI + 섹션 2 정상 표시
- `/meta/pipeline` 성공 + `/meta/analysis-params` 실패 → 섹션 1 정상 표시 + 섹션 2 에러 UI + 섹션 3 파라미터 수치 `—`(대시)로 표시

### 4.3 신규 예외 코드 제안

해당 없음.

---

## 5. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| Fixture 경로 | `src/fixtures/pipeline.json`, `src/fixtures/analysis_params.json` |
| Fixture 내용 | `api_spec_vN §/meta/pipeline`, `§/meta/analysis-params` 응답 예시 그대로 사용 |
| MOCK 분기 조건 | `import.meta.env.VITE_USE_MOCK !== 'false'` |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` + 백엔드 `/meta/*` 엔드포인트 연동 완료 후 |

### 5.1 pipeline.json fixture

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
| 방법론 탭 마운트 분기 | `activeTab === 'methodology'` 시 MethodologyView 마운트, 다른 탭 전환 시 unmount 확인 |
| 필터 바·미니맵 숨김 | 방법론 탭 진입 시 FilterBar·Minimap 미표시 확인 |
| 패널 자동 닫힘 | 방법론 탭 진입 시 `isPanelOpen === false` 확인 |
| 플로우 다이어그램 렌더링 | pipeline.json 11개 노드·12개 엣지 SVG 렌더링 확인 (브라우저 시각 검증) |
| VECM·VAR 분기 | phase4_vecm·phase4_var 노드 나란히 배치, "공적분 있음/없음" 엣지 라벨 확인 |
| 노드 클릭 툴팁 | 노드 클릭 시 `description` 팝오버 표시 확인 |
| version 표시 | "파이프라인 버전: v8" 텍스트 표시 확인 |
| 패턴 카드 3종 | analysis_params.json 기반 패턴 카드 3장 렌더링 확인 |
| 패턴 적용 구간 배지 | `applicable_segments` 배지 표시 확인 |
| 파라미터 동적 삽입 | 섹션 3에서 `rolling_window: 48`, `zscore_warning: 2.0`, `zscore_alert: 2.5` 수치 텍스트 확인 |
| 섹션 3~6 정적 콘텐츠 | 8개 기법·3개 ML 모델·등급 3종·소스 7종 표 렌더링 확인 |
| 부분 실패 처리 | /meta/pipeline 실패 mock 시: 섹션 1 에러 UI + 섹션 2+ 정상 표시 확인 |
| MOCK 분기 | fixture 데이터 반환, HTTP 요청 없음 확인 |

---

## 7. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| D3.js 외 다이어그램 라이브러리 추가 (`react-flow`, `mermaid` 등) | D3.js v7 단일 사용 원칙 |
| 정적 콘텐츠(섹션 3~6)를 API 엔드포인트 없이 서버에서 가져오는 구조 추가 | 명세 없는 신규 API 호출 금지 |
| Phase 8.5·Phase 9 노드를 API 응답 외 하드코딩으로 다이어그램에 강제 삽입 | API 응답 `nodes[]` 기준 렌더링 원칙. 하드코딩 추가 시 API 버전 변경과 불일치 발생 |
| 방법론 탭에서 이상 노드 클릭·패널 오픈 기능 추가 | 방법론 탭은 완전 읽기 전용 화면 |

---

## 8. PR 체크리스트

- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] `pipeline.json` fixture 노드 11개·엣지 12개 확인
- [ ] `analysis_params.json` fixture `patterns[]` 3개 확인
- [ ] 방법론 탭 진입 시 필터 바 숨김 확인
- [ ] 방법론 탭 진입 시 `isPanelOpen === false` 확인
- [ ] 파라미터 동적 삽입 값이 fixture와 일치하는지 확인 (hardcode 없음)
- [ ] 정적 콘텐츠 섹션 3~6이 web_plan §8.2 원문과 일치하는지 확인

---

## 9. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `api_spec_vN.md` | `§/meta/pipeline, §/meta/analysis-params` | 응답 필드·타입 최종 확인 |
| `web_plan_vN.md` | `§8` | 방법론 탭 6섹션 UX·콘텐츠 원문 |
| `frame_spec_frontend_vN.md` | `§2, §8.6` | 디렉토리 구조·D3 위치 |
| `src/types/meta.ts` | 전체 | `PipelineMetaResponse`, `AnalysisParamsResponse` 타입 확인 |
| `src/utils/colorUtils.ts` | 이상 등급 색상 상수 | 섹션 5 신뢰도 등급 색상 재사용 |

# Feature 명세서 — 스트림 그래프

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-stream-chart`
**담당자**: 하대수
**작성일**: 2026-05-04
**상태**: 초안

**변경 이력**
- v1 (2026-05-04): 최초 작성
- v2 (2026-05-10): 명세서 정합화 감사 결과 반영 (PM 별건 격상, CLAUDE.md stale Action Items 제거, 사건 fixture 색상 필드명 `color_hex` 정합, Zustand SoT 정합)
- v3 (2026-05-14): cross-spec 점검 결과 반영
  - **C5**: §3.3 자동 진입 동작 — 시나리오별 동작 명시 추가
    - 사용자가 `/methodology` 또는 `/scatter`로 첫 진입 시 자동 선택 미동작 케이스 명세
    - `activeTab` 변경으로 흐름 탭에 진입할 때마다 자동 선택 재실행 여부 명시
    - 자동 선택이 실패한 세션에서 fe-onboarding 1단계 처리 방침 명시
  - 본 feat가 정의하는 `colorUtils.ts` 키 상수 명세 보강 (다른 feat가 import할 SoT 키 명시)

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities/{id}/stream, §/events` | 최신 | 엔드포인트·query params·response 필드명·타입 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*, §8 브랜치 매핑` | 최신 | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §6.2, §8.6` | 최신 | 디렉토리·snake_case·Zustand SoT·D3 위치 | ☐ |
| `web_plan_vN.md §4.1, §9` | 최신 | 스트림 그래프 UX·자동 선택 정책 | ☐ |
| `feature_dev_list_vN.md §feat/fe-stream-chart` | 최신 | 구현 범위·완료 기준 | ☐ |
| `feature_spec_fe-layout-filter_vN.md §3.1` | 최신 | Zustand SoT 필드명 + `selectAnomaly` 액션 정의 | ☐ |
| `feature_spec_fe-onboarding_vN.md §3.3` | 최신 | 자동 선택 결과를 전제로 한 1단계 처리 | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | 참고 등급 노드 색상 | feature_dev_list: 회색·일정 크기 / web_plan §4.1: `#c8d850` + 차등 반지름 | **web_plan §4.1 채택** (`#c8d850`, 4px) |
| 2 | 4구간 품목 C·D 곡선 색상 | web_plan §4.1 미정 | 미정 — PM/디자인팀 결재 대기 |
| 3 | 선행 조건 (fe-layout-filter 의존) | feature_dev_list 미명시 / 본 명세 명시 | **본 명세 SoT** — feature_dev_list v5 bump 필요 |
| 4 | **자동 선택 시나리오 (v3 신규)** | 첫 진입 탭이 stream이 아닐 때 자동 선택 미동작 → fe-onboarding 1단계 실행 불가 | **§3.3 시나리오 표 채택** — 흐름 탭 첫 마운트 시에만 자동 선택. 다른 탭 첫 진입 시 미동작. fe-onboarding은 `selectedAnomalyId !== null` 진입 조건으로 자동 대기 |

---

## 1. 기능 개요

(v2 §1.1 ~ §1.4 동일 — StreamChart D3.js 컴포넌트 구현, 6개 핵심 항목 + web_plan 보강 5개 항목)

---

## 2. 입력 데이터

(v2 §2 동일 — `/stream` 응답 필드 + useAppStore 읽기 상태)

### 2.2 useAppStore 읽기 상태 (fe-layout-filter v5 SoT 정합)

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| CommodityState | `primaryCommodityId: string` | /stream 요청 `{id}` |
| CommodityState | `secondaryCommodityId: string \| null` | 보조 품목 오버레이 |
| FilterState | `filterFrom`, `filterTo`, `granularity`, `activeSegments`, `confidenceFilter`, `patternFilter`, `eventFilter` | 쿼리 파라미터·필터링 |
| ViewState | `selectedAnomalyId`, `isPanelOpen`, `activeTab` | 자동 선택 결과 저장·마운트 조건 |
| OverlayState | `events` | 사건 오버레이 color_hex SoT |

---

## 3. 출력 데이터

### 3.1 렌더링 출력 / 3.2 useAppStore 쓰기

(v2와 동일 — `selectAnomaly(anomaly_id)` 호출로 `selectedAnomalyId` + `isPanelOpen=true` 동반 갱신)

### 3.3 시각화 규격 (web_plan_vN §4.1 기준)

#### 곡선 / 이상 노드 / 호버 툴팁 / 줌 / 진입 애니메이션 / 사건 오버레이

(v2 §3.3 ① ~ ⑥, ⑧ 동일 — 변경 없음)

#### 자동 진입 동작 (v3 — 시나리오별 명시) — **C5 해소**

**기본 로직** (v2와 동일):
1. `useStreamData` 첫 로드 성공 시 실행 (StreamChart 마운트 + 응답 수신 시점)
2. `anomaly_nodes` 중 `confidence_grade === 'high'` AND `segment_id ∈ activeSegments`인 노드 필터
3. `period` 기준 내림차순 정렬 → 첫 번째 노드 선택
4. `selectAnomaly(node.anomaly_id)` 호출 (내부적으로 `selectedAnomalyId` + `isPanelOpen=true` 동반 갱신)
5. 필터 결과가 빈 배열이면 자동 선택 없음 (`selectedAnomalyId: null` 유지)

**시나리오별 동작 표 (v3 신규)**:

| 시나리오 | StreamChart 마운트 여부 | 자동 선택 동작 | fe-onboarding 1단계 |
|----------|------------------------|---------------|---------------------|
| **① 첫 진입 = `/` (activeTab='stream')** | ✅ 즉시 마운트 | ✅ `useStreamData` 첫 로드 후 자동 선택 | ✅ `selectedAnomalyId !== null` 감지 후 시작 |
| **② 첫 진입 = `/methodology`** | ❌ 미마운트 | ❌ 미동작 | ⏸ 대기 — 사용자가 흐름 탭으로 전환 시 ①과 동일 흐름 |
| **③ 첫 진입 = `/` + activeTab='scatter' (탭 수동 변경 후 새로고침)** | ❌ 미마운트 (단 — PM 별건 #4에 따라 새로고침 시 activeTab 초기화) | n/a — 새로고침 시 activeTab='stream'으로 초기화 (fe-layout-filter v5 §3.1 ViewState 초기값) | ① 시나리오로 환원 |
| **④ 흐름 탭 진입 → 다른 탭 전환 → 흐름 탭 복귀** | ✅ 재마운트 | ✅ `useStreamData` 캐시 hit → 자동 선택 재실행 단, **이미 `selectedAnomalyId !== null`이면 자동 선택 skip** (사용자 선택 보존) | ✅ 이미 표시됐다면 `hasSeenOnboardingThisSession` 으로 skip |
| **⑤ 품목 전환 (`primaryCommodityId` 변경)** | ✅ 동일 마운트 + queryKey 변경 → 재조회 | ✅ 새 품목 응답 수신 후 자동 선택 재실행 (`selectedAnomalyId`를 새 노드로 덮어씀) | ✅ 새 노드로 1단계 타겟 재계산 |
| **⑥ `activeSegments` 변경 (구간 토글)** | ✅ 동일 마운트 | ❌ 재실행하지 않음 — 사용자 의도적 토글이므로 패널 자동 오픈 부적절 (v2 §3.3 자동 진입 동작 유지) | n/a |

**자동 선택 책임 한계 명시 (C5)**:
- 본 feat의 자동 선택은 **StreamChart 컴포넌트 마운트 시점**에 작동
- `/methodology`로 첫 진입한 사용자는 흐름 탭으로 전환할 때까지 `selectedAnomalyId === null`
- fe-onboarding은 이 상태를 정상 대기로 처리 (useEffect 의존성에 `selectedAnomalyId` 포함하여 자동 재트리거)
- AppShell 레벨에서의 사전 자동 선택은 **본 feat 범위 외** — PM 별건 #4 결재 시 별도 hook(`useAutoSelectAnomaly` AppShell 마운트)으로 확장 가능

---

## 4. 파라미터 제약 조건

(v2 §4 동일)

### 4.1 `colorUtils.ts` SoT 키 명세 (v3 보강)

본 feat가 `src/utils/colorUtils.ts`에 정의하는 상수는 후속 feat(fe-scatter, fe-raw-timeseries, fe-panel, fe-methodology) 모두가 import한다. 키 네임 SoT 명시:

```typescript
// src/utils/colorUtils.ts

// 이상 노드 색상 (3등급)
export const ANOMALY_COLORS = {
  high:      '#e24b4a',
  medium:    '#ef9f27',
  reference: '#c8d850',
} as const;

// 이상 노드 반지름 (3등급, px)
export const ANOMALY_RADII = {
  high:      7,
  medium:    5.5,
  reference: 4,
} as const;

// 구간별 곡선 색상 — 주 품목 (스트림 차트)
export const SEGMENT_COLORS_PRIMARY = {
  A:       '#3b82f6',  // 청색
  B:       '#22c55e',  // 녹색
  D_prime: '#f97316',  // 주황
  C:       /* PM 별건 #2 미정 */ '#94a3b8',
  D:       /* PM 별건 #2 미정 */ '#64748b',
} as const;

// 구간별 곡선 색상 — 보조 품목 (40% opacity 별도 적용)
export const SEGMENT_COLORS_SECONDARY = {
  A:       '#06b6d4',  // 청록
  B:       '#a855f7',  // 보라
  D_prime: '#ec4899',  // 분홍
  C:       '#94a3b8',
  D:       '#64748b',
} as const;

// 기준선 (산점도용)
export const REFERENCE_LINE_COLOR = '#3b82f6';

// 추가 차트 색상 (fe-panel에서 보강 — v3 fe-panel과 정합)
// fe-panel v3에서 PANEL_CHART_COLORS 키로 추가 (§3.3 참조)
```

> 후속 feat는 위 상수만 import하고 별도 색상 리터럴 사용 금지.

---

## 5. 예외처리 / 6. 목업 / 7. 완료 기준 / 8. 금지 사항 / 9. PR 템플릿

(v2 동일 + v3 추가)

### 7. 완료 기준 (v3 추가)

| 항목 (v3 신규) | 기준 |
|------|------|
| 시나리오 ②: `/methodology` 첫 진입 → 흐름 탭 전환 | 전환 시 자동 선택 실행 + fe-onboarding 1단계 시작 확인 |
| 시나리오 ④: 흐름 탭 복귀 시 사용자 선택 보존 | `selectedAnomalyId !== null` 상태에서 흐름 탭 복귀 시 자동 선택 미실행 (사용자 선택 유지) 확인 |
| 시나리오 ⑤: 품목 전환 시 새 노드 선택 | 품목 전환 후 새 응답 수신 → 자동 선택 재실행 → `selectedAnomalyId` 새 값으로 덮어씀 확인 |
| `colorUtils.ts` SoT 키 정의 | `ANOMALY_COLORS`, `ANOMALY_RADII`, `SEGMENT_COLORS_PRIMARY`, `SEGMENT_COLORS_SECONDARY`, `REFERENCE_LINE_COLOR` named export 확인 |

### 8. 금지 사항 (v3 추가)

| 금지 사항 (v3 신규) | 이유 |
|-----------|------|
| 자동 선택 로직을 AppShell·MainPage 레벨에 분산 구현 | StreamChart 마운트 시점 책임 단일화 (C5). 시나리오 ②~⑥은 본 명세 §3.3 표 SoT |
| 시나리오 ④에서 사용자 선택 덮어쓰기 | `selectedAnomalyId !== null`이면 자동 선택 skip (사용자 명시적 선택 보존) |
| 색상 리터럴 직접 사용 (`'#e24b4a'` 등) | §4.1 `colorUtils.ts` SoT 키 import 의무 |

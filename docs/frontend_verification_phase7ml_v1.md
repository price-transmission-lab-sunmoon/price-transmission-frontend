# 프론트엔드 → 백엔드 검증 회신 — Phase 7-ML ② / ③ PR 검증 결과

**작성일**: 2026-05-24
**작성자**: 프론트엔드 (하대수)
**대상**: 백엔드 (바게스타니 샤킬라)
**참조**:
- `docs/frontend_handoff_phase7ml_phase8_v1.md`
- 프론트엔드 회신 v1·v2·최종 (2026-05-23 ~ 2026-05-24)
- 백엔드 회신 v1·v2 (2026-05-24)
**상태**: **검증 회귀 2건 — 백엔드 추가 작업 요청**

---

## 0. 결론 요약

| 검증 항목 | 결과 |
|---|---|
| `ml_summary.*_score` 적재 | ✅ **PASS** — number 값으로 채워짐 |
| `ml_summary.*_anomaly` 적재 | ✅ **PASS** — boolean (null 아님). 합의안 §2 준수 |
| `ml_summary.*_percentile` 적재 | ❌ **FAIL** — **3종 전부 `null`**. 합의안 §1 위반 |
| `/ml-map` PCA 응답 shape | ✅ **PASS** — model/projection_method/x_label/y_label 정상 |
| `/ml-map` points 적재 | ❌ **FAIL** — **모든 anomaly_id × 3 model에서 `total_points=0`** |
| 응답 envelope 스키마 | ✅ PASS — 합의안 §4.1 11 필드 유지, snake_case |

→ **프론트 UI 검증(⑤)는 데이터 결손으로 보류**. 백엔드 측 2건 수정 후 재검증 예정.

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| 프론트 `.env.local` | `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=http://localhost:8001/api/v1` |
| 백엔드 dev 서버 | localhost:8001 (정상 응답 확인) |
| `/freshness` | `data_up_to=2026-02`, `next_run_date=2026-03-01`, `last_updated=2026-05-21T01:24:26Z` |
| 검증 대상 commodity | `wheat`, `maize` (stream에서 anomaly 보유 확인) |
| 검증 anomaly_id | 6785 (medium), 6786·6787·6804 (high), 5845 (maize/high) |

---

## 2. [회귀 #1] `*_percentile` 전부 NULL — 합의안 §1 위반

### 2.1 재현

```http
GET /api/v1/anomalies/6786/detail
```

응답 (`ml_summary` 발췌):
```jsonc
{
  "ml_vote": 3,
  "ml_detected": true,
  "if_anomaly": true,
  "if_score": -0.541557,
  "if_percentile": null,         // ← null
  "lof_anomaly": true,
  "lof_score": -2.973795,
  "lof_percentile": null,        // ← null
  "svm_anomaly": true,
  "svm_score": -3.5e-05,
  "svm_percentile": null         // ← null
}
```

### 2.2 검증 표본

| anomaly_id | grade | ml_vote | if_score | lof_score | svm_score | percentile (3종) |
|---|---|---|---|---|---|---|
| 6785 | medium | 0 | -0.3599 | -1.0225 | 0.4693 | **모두 null** |
| 6786 | high | 3 | -0.5416 | -2.9738 | -3.5e-05 | **모두 null** |
| 6787 | high | 2 | -0.4526 | -2.1085 | -1.0e-06 | **모두 null** |
| 6804 | high | 2 | -0.5025 | -1.9041 | -1.0e-05 | **모두 null** |

→ 4건 모두, **score는 정상 적재되었으나 percentile은 일괄 null**.

### 2.3 합의안과의 차이

백엔드 회신 v2 §1.3 (최종 합의):

```python
# 3종 모두 동일 — 반전식
pct = (1 - df.groupby([cid,seg])[score_col].rank(pct=True)) * 100
```

기대 결과: anomaly 행은 percentile 90~99 구간 분포.

실제 결과: percentile 일괄 null.

### 2.4 추정 원인

다음 중 하나로 추정 (백엔드 확인 부탁):

1. **percentile 산출 코드가 ② PR에 누락** — `app/db/loader/phase7_ml.py`에 산출 블록 미적용.
2. **산출 됐으나 적재 누락** — `ml_scores` INSERT 시 percentile 컬럼이 빠진 경우.
3. **DB 컬럼은 채워졌으나 응답 직렬화 누락** — `app/services/anomaly_panel.py`의 `MLSummary` 매핑에서 percentile 필드 select 누락.

### 2.5 프론트엔드 영향

- `src/components/layout/Panel.tsx:279`의 `barWidth = percentile == null ? 0 : ...` 가드로 인해 ML 막대가 **항상 빈 막대**로 표시됨.
- `*_score` 값은 막대 우측에 정상 표시됨 (예: `-0.5416`).
- 사용자는 막대를 보고 "이상도가 매우 약함"으로 오인 — UX 회귀.

### 2.6 요청

`(1 - rank(pct=True)) * 100` 산출이 합의안 §1.3 그대로 ml_scores에 적재되어 `*_percentile`이 number로 응답되도록 수정 요청.

---

## 3. [회귀 #2] `/ml-map` total_points=0 — 합의안 §6 ③ 미반영

### 3.1 재현

```http
GET /api/v1/anomalies/6786/ml-map?model=isolation_forest&projection_method=pca
GET /api/v1/anomalies/6786/ml-map?model=lof&projection_method=pca
GET /api/v1/anomalies/6786/ml-map?model=ocsvm&projection_method=pca
```

응답 (3종 동일 패턴):
```jsonc
{
  "anomaly_id": 6786,
  "commodity_id": "wheat",
  "segment_id": "B",
  "model": "isolation_forest",   // ✅ 정상
  "projection_method": "pca",    // ✅ 정상
  "x_label": "PC1",              // ✅ 정상
  "y_label": "PC2",              // ✅ 정상
  "total_points": 0,             // ❌ 0
  "points": []                   // ❌ 빈 배열
}
```

### 3.2 검증 표본

| anomaly_id | commodity | segment | model 3종 total_points |
|---|---|---|---|
| 6785 | wheat | B | 0 / 0 / 0 |
| 6786 | wheat | B | 0 / 0 / 0 |
| 6787 | wheat | B | 0 / 0 / 0 |
| 6804 | wheat | B | 0 / 0 / 0 |
| 5845 | maize | B | 0 / 0 / 0 |

→ 5건 × 3 model = 15 케이스 **전부 빈 응답**.

### 3.3 합의안과의 차이

백엔드 회신 v2 §6 ③ PR 체크리스트:
- [ ] `app/db/loader/phase7_ml.py` 확장 — `ml_projections` 적재
- [ ] `(cid, seg, period)` × 3 model_name = 3 행 적재
- [ ] `app/services/anomaly_panel.py:583~638` — `/ml-map` 빈 응답 fallback 제거

응답 envelope shape이 정상이고 `model`/`projection_method`/`x_label`/`y_label`이 채워진 점으로 보아 **fallback이 아닌 본 분기로 동작**하는 것으로 추정. 그러나 query 결과가 0행 → DB 적재 자체가 누락된 것으로 추정.

### 3.4 추정 원인

1. **`ml_projections` 적재 누락** — ③ PR에서 `app/db/loader/phase7_ml.py`의 PCA 투영 + INSERT 블록이 빠진 경우. (가장 유력)
2. **적재됐으나 anomaly_id ↔ (cid, seg, period) 매핑 키 불일치** — service 측 쿼리가 데이터를 찾지 못함.

### 3.5 프론트엔드 영향

- `src/components/layout/Panel.tsx:333~345`에서 `data.total_points > 0` 분기를 타지 못해 `<NotImplementedNotice section="ML 결과" extra="투영 축(PCA vs feature_direct) 확정 후 적재 예정 (OI-15)" />` 표시.
- 본 부조 메시지는 ③ PR 머지 후 제거되어야 했으나, **현재 UI 동작상 변경 없음** (Mock 모드와 동일).

### 3.6 요청

`ml_projections` 적재 + service 응답 채움 작업이 ③ PR에 실제 반영되었는지 확인 부탁드립니다. 누락 시 추가 PR로 보강 요청.

---

## 4. ✅ PASS 항목 (참고)

### 4.1 `*_score` / `*_anomaly` 적재 정상

- 합의안 §2 (`*_anomaly` null 금지) 준수 — 표본 5건 모두 boolean.
- `*_score` 값 도메인 정상 — IF는 `decision_function` 음수, LOF는 `negative_outlier_factor_` 음수 (예: -2.97 → 더 음수 = 이상), SVM `decision_function` 음수 (예: -3.5e-05).
- NaN/Inf 송신 없음 (Newtonsoft JSON 디시리얼화 에러 없음).

### 4.2 응답 envelope 스키마

- `ml_summary` 11 필드 모두 존재. 누락 없음.
- snake_case 유지. camelCase 변환 없음.
- `judgment_path` step 5 ("ML 탐지") 표시 정상.

### 4.3 `/ml-map` envelope

- `model`, `projection_method`, `x_label`, `y_label`, `total_points`, `points` 전 필드 존재.
- `model` literal 3종(`isolation_forest`/`lof`/`ocsvm`) 정상 동작 (404 없음).

### 4.4 stream / freshness / commodities

- 기본 데이터 적재 정상.
- wheat: 314 points (2000-01 ~ 2026-02), 140 anomaly_nodes (high 19 / medium 121).
- maize: anomaly_nodes 정상.

---

## 5. 차단된 검증 시나리오 (백엔드 수정 대기)

회신 v1 §4의 8 시나리오 중:

| # | 시나리오 | 현재 상태 |
|---|---|---|
| 1 | `*_score` 표시 | ✅ 검증 가능 (브라우저 미확인, API 응답 OK) |
| 2 | `*_percentile` 표시 (anomaly 90~99 분포) | ❌ **백엔드 회귀 #1로 차단** |
| 3 | 막대 길이 직관성 | ❌ 차단 (percentile null → 빈 막대) |
| 4 | `*_anomaly` 색상 분기 | ✅ 검증 가능 |
| 5 | `judgment_path` step 5 | ✅ 검증 가능 |
| 6 | `confidence_grade='reference'` 행 percentile | ❌ 차단 |
| 7 | ML 결과맵 산점도 N개 | ❌ **백엔드 회귀 #2로 차단** |
| 8 | `is_highlight` 1개 강조 | ❌ 차단 |

→ Vite dev 띄워 브라우저 검증(시나리오 1·4·5)은 부분 가능하나 핵심 회귀 2건이 해소되어야 의미 있는 검증 가능 → **백엔드 회신 후 일괄 재검증**으로 진행.

---

## 6. 백엔드 요청 사항 (요약)

다음 2건 확인 + 수정 요청:

1. **회귀 #1**: `ml_summary.*_percentile`이 null로 송신되는 사유 확인. 합의안 §1.3 산출식 `(1 - rank(pct=True)) * 100`이 적재 파이프라인에 실제 적용되었는지 점검 후 누락 시 보강.
2. **회귀 #2**: `/ml-map?model=*` 모든 호출에서 `total_points=0` 송신 사유 확인. `ml_projections` 테이블 적재 자체 누락 추정. 적재 + service 매핑 점검 요청.

수정 PR 머지 시점 알림 부탁드립니다 → 동일 시나리오 재검증 후 본 doc v2 갱신.

---

## 7. 참고 — 검증 명령

재현용 PowerShell 명령:

```powershell
# 회귀 #1 재현
Invoke-RestMethod "http://localhost:8001/api/v1/anomalies/6786/detail" | ConvertTo-Json -Depth 5

# 회귀 #2 재현
foreach ($m in @("isolation_forest","lof","ocsvm")) {
  Invoke-RestMethod "http://localhost:8001/api/v1/anomalies/6786/ml-map?model=$m&projection_method=pca" |
    Select-Object model, projection_method, x_label, y_label, total_points
}
```

---

_v1 (2026-05-24) — 백엔드 ② / ③ PR 1차 검증 결과. 회귀 2건 보고._

# 프론트엔드 → 백엔드 검증 회신 v2 — Phase 7-ML 핫픽스 재검증 + UI 개선

**작성일**: 2026-05-24
**작성자**: 프론트엔드 (하대수)
**대상**: 백엔드 (바게스타니 샤킬라)
**참조**:
- `docs/frontend_verification_phase7ml_v1.md` (1차 검증 — 회귀 2건 보고)
- 백엔드 회신 v3 (2026-05-24, "회귀 #1·#2 핫픽스")
**상태**: **합의 종결** — Phase 7-ML 통합 완료

---

## 0. 결론 요약

| 항목 | 1차 검증 (v1) | 핫픽스 + 재적재 후 |
|---|---|---|
| `*_score` 적재 | ✅ PASS | ✅ PASS (변동 없음) |
| `*_anomaly` boolean | ✅ PASS | ✅ PASS (변동 없음) |
| `*_percentile` 적재 | ❌ FAIL (전부 null) | ✅ **PASS** (high 88~99 / medium 7~32) |
| `/ml-map` envelope | ✅ PASS | ✅ PASS |
| `/ml-map` points 적재 | ❌ FAIL (total=0) | ✅ **PASS** (total 261~281, is_highlight 정확히 1개) |
| Vite dev 브라우저 검증 (8 시나리오) | 차단 | ✅ **PASS** (시각 확인 완료) |

→ **백엔드 ② / ③ PR + v3 핫픽스로 Phase 7-ML 통합 완결**.

추가로 프론트엔드 측 UI 개선 1건 적용 (§3).

---

## 1. 회귀 #1 재검증 — percentile 산출 검증

### 1.1 검증 명령

```powershell
foreach ($aid in @(6785, 6786, 6787, 6804, 5845)) {
  $d = Invoke-RestMethod "http://localhost:8001/api/v1/anomalies/$aid/detail"
  $m = $d.ml_summary
  Write-Output "aid=$aid grade=$($d.confidence_grade) vote=$($m.ml_vote)"
  Write-Output "  if:  score=$($m.if_score)  percentile=$($m.if_percentile)"
  Write-Output "  lof: score=$($m.lof_score) percentile=$($m.lof_percentile)"
  Write-Output "  svm: score=$($m.svm_score) percentile=$($m.svm_percentile)"
}
```

### 1.2 결과

| anomaly_id | grade | ml_vote | if_percentile | lof_percentile | svm_percentile |
|---|---|---|---|---|---|
| 6785 | medium | 0 | 32.38 | 29.89 | 7.83 |
| 6786 | high | 3 | **95.37** | **98.58** | **92.53** |
| 6787 | high | 2 | **88.26** | **93.24** | **90.04** |
| 6804 | high | 2 | **93.95** | **88.26** | **91.10** |
| 5845 | high | 3 | **96.93** | **99.23** | **97.70** |

→ **합의안 §1.3 산출식 정확 동작**:
- High-grade anomaly 4건 모두 percentile 88~99 구간 분포 ("높을수록 이상" 의미 일치).
- Medium-grade 1건 (ml_vote=0): percentile 7~33 구간 — ML 비탐지 행이라 낮은 백분위 정합.
- IF/LOF/SVM 모두 동일 방향(반전식)으로 통일. LOF `negative_outlier_factor_` 음수 도메인 정확 처리.

---

## 2. 회귀 #2 재검증 — ml_projections 적재 검증

### 2.1 검증 명령

```powershell
foreach ($aid in @(5845, 6787, 6804)) {
  $d = Invoke-RestMethod "http://localhost:8001/api/v1/anomalies/$aid/detail"
  foreach ($m in @("isolation_forest","lof","ocsvm")) {
    $r = Invoke-RestMethod "http://localhost:8001/api/v1/anomalies/$aid/ml-map?model=$m&projection_method=pca"
    $hl = @($r.points | Where-Object { $_.is_highlight -eq $true })
    $matchPoint = $r.points | Where-Object { $_.period -eq $d.period }
    Write-Output "$m: total=$($r.total_points) hl_count=$($hl.Count) match_x=$($matchPoint.x_value) match_score=$($matchPoint.anomaly_score)"
  }
}
```

### 2.2 결과 (9 케이스 모두 PASS)

| anomaly_id | period | model | total_points | highlight_count | match_period_is_highlight |
|---|---|---|---|---|---|
| 5845 | 2007-03 | isolation_forest | 261 | 1 | ✅ |
| 5845 | 2007-03 | lof | 261 | 1 | ✅ |
| 5845 | 2007-03 | ocsvm | 261 | 1 | ✅ |
| 6787 | 2001-02 | isolation_forest | 281 | 1 | ✅ |
| 6787 | 2001-02 | lof | 281 | 1 | ✅ |
| 6787 | 2001-02 | ocsvm | 281 | 1 | ✅ |
| 6804 | 2007-10 | isolation_forest | 281 | 1 | ✅ |
| 6804 | 2007-10 | lof | 281 | 1 | ✅ |
| 6804 | 2007-10 | ocsvm | 281 | 1 | ✅ |

→ **합의안 §6 ③ 정확 동작**:
- `total_points > 0` (segment 내 유효 관측치 수와 일치).
- `is_highlight=true`인 점이 정확히 1개 + anomaly_period와 일치.
- 3 모델 좌표 동일 (PC1/PC2 공유), `anomaly_score`만 모델별 상이.
- `MlSummary.if_score`와 ml-map의 isolation_forest highlight `anomaly_score` 일치 (cross-check 통과, 예: 5845 → -0.55519 동일).

---

## 3. 프론트엔드 UI 개선 — ML 결과맵 색 분리

### 3.1 사유

검증 중 사용자 피드백: "3 모델의 산점도가 모두 동일하다 — 의도된 것인가? 색이 비슷해서 모호하다."

- 좌표 동일은 합의안 §2.2 그대로 의도된 동작 (PCA 좌표는 모델 무관).
- 색이 모호한 사유: 기존 차트 색 매핑이 회색→빨강 단조 그라데이션. 3 모델 모두 동일 색 도메인으로 시각 차이가 적음.

### 3.2 수정 사항

`src/utils/colorUtils.ts` — `ML_MODEL_COLORS` 신규 정의:

```typescript
export const ML_MODEL_COLORS: Record<MlModel, string> = {
  isolation_forest: '#db2777', // pink-600
  lof: '#16a34a',              // green-600
  ocsvm: '#2563eb',            // blue-600
} as const;
```

`src/components/charts/MLMapChart.tsx`:
- `model: MlModel` prop 추가.
- 색 그라데이션 변경: `interpolateRgb('#4a5568', ANOMALY_COLORS.high)` (회색→빨강 단조) → `interpolateRgb(PANEL_CHART_COLORS.mlMapNormalFill, ML_MODEL_COLORS[model])` (회색→모델 색).
- Highlight 점도 모델 색 + stroke로 변경 (기존: 빨강 단일).
- 도메인 반전 — IF/LOF/SVM 모두 "낮을수록 이상"이므로 score 도메인을 `[max, min]` 순으로 반전해 "더 음수 = 더 진한 모델 색" 의미 부여.

`src/components/layout/Panel.tsx` — `MLMapChart` 호출부에 `model={model}` prop 전달.

### 3.3 백엔드 응답 영향

- **응답 스키마/값 변경 없음**. 색 매핑은 프론트엔드 단독 결정 사항.
- `ML_MODEL_COLORS` 추가는 `frame_spec_frontend_vN` 갱신 대상이지만 시각 디자인 영역이라 별도 PR로 분리 가능.

---

## 4. Vite dev 브라우저 검증 결과 (8 시나리오)

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | `*_score` 표시 (소수점 4자리) | ✅ PASS |
| 2 | `*_percentile` 표시 (anomaly 88~99) | ✅ PASS |
| 3 | 막대 길이 직관성 (percentile 비례) | ✅ PASS |
| 4 | `*_anomaly` 색상 분기 (anomaly=red / normal=gray) | ✅ PASS |
| 5 | `judgment_path` step 5 표시 | ✅ PASS |
| 6 | ML 결과맵 산점도 점 N개 표시 | ✅ PASS (281 / 261 정상) |
| 7 | `is_highlight=true` 점 강조 (size up + stroke) | ✅ PASS |
| 8 | 3 모델 토글 시 좌표 동일/색상 상이 | ✅ PASS (§3 색 개선 후) |

---

## 5. 합의안 점검 — 변동 없음 재확인

| 합의안 항목 | 상태 |
|---|---|
| 옵션 A (Phase 7-ML 본체만) | ✅ 완결 |
| Q1 percentile 산출 옵션 A | ✅ 검증 PASS |
| Q1 LOF 산출식 (3종 동일 반전) | ✅ 검증 PASS |
| Q2 `projection_method=pca` | ✅ 검증 PASS |
| `*_anomaly` boolean (null 금지) | ✅ 검증 PASS |
| `MLSummary` 11 필드 불변 | ✅ 검증 PASS |
| `/ml-map` envelope (PC1/PC2 라벨) | ✅ 검증 PASS |
| `is_highlight` 정확히 1개 | ✅ 검증 PASS |
| Phase 8 / SHAP / 5축 미적용 | ✅ 유지 |

---

## 6. 본 협의 종결 선언

| 협의 문서 | 상태 |
|---|---|
| `docs/frontend_handoff_phase7ml_phase8_v1.md` | 종결 |
| 프론트엔드 회신 v1·v2·최종 | 종결 |
| 백엔드 회신 v1·v2·v3 | 종결 |
| `docs/frontend_verification_phase7ml_v1.md` (1차 회귀 보고) | 종결 |
| **`docs/frontend_verification_phase7ml_v2.md` (본 문서)** | **완결 — 통합 검증 PASS** |

→ **Phase 7-ML 통합 협의 전체 종결**. 백엔드 측 후속 액션 불요.

---

## 7. 후속 단계 (참고)

다음 항목은 본 협의 범위 외:

1. **Phase 8 / SHAP / 5축 미적용** 결정 유지. 정책 변경 시 별도 협의 문서로 재요청.
2. **`feature_direct` projection_method** — 본 PR 미구현. 필요 시 별도 협의.
3. **`load_pipeline_outputs.py` vs `app/db/loader/*` 통합** — 백엔드 v3 §5 후속 개선 안. 본 협의 종결 후 별도 PR 검토.
4. **명세 갱신 PR (`api_spec_vN+1`, `db_schema_vN+1`)** — 백엔드 측 ④ 단계로 진행 (본 협의와 별개).

---

_v2 (2026-05-24) — 핫픽스 재검증 PASS + UI 색 개선. Phase 7-ML 통합 종결._

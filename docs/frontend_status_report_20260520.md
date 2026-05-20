# 프론트엔드 현황 보고 — 백엔드 연동 디버깅용

**작성일:** 2026-05-20  
**브랜치:** `frontend/test-start`

---

## 1. 환경 설정

| 항목 | 값 |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8001/api/v1` |
| `VITE_USE_MOCK` | `false` (실제 백엔드 호출 중) |
| Vite proxy | `/api` → `http://localhost:8001` (baseURL이 절대 경로라 proxy 미사용) |

Mock 모드 꺼짐 → 모든 API 요청이 실제 백엔드로 전송됨.

---

## 2. 데이터 흐름 (정상 시나리오)

```
앱 기동
  → GET /api/v1/commodities
      → useCommodities: res.data.commodities 배열 파싱
      → 첫 번째 품목 → primaryCommodityId 자동 선택 (Zustand store)
  → GET /api/v1/commodities/{id}/stream?granularity=monthly&grade=high,medium
      → useStreamData: StreamResponse 수신
      → buildStreamChartData()로 D3 렌더링용 변환
  → StreamChart D3 렌더링
```

---

## 3. 기대 응답 형식

### `GET /commodities`

```json
{
  "commodities": [
    {
      "commodity_id": "wheat",
      "name_kr": "밀",
      "name_en": "Wheat",
      "cluster": "grain",
      "has_wholesale": false,
      "route_type": "3seg",
      "segments": ["A", "B", "D_prime"],
      "analysis_start": "2000-01",
      "analysis_end": "2026-03",
      "has_anomaly_this_month": false,
      "latest_anomaly_grade": null
    }
  ]
}
```

> **주의:** 최상위 키 반드시 `"commodities"`. 배열 직접 반환 시 `res.data.commodities === undefined` → `primaryCommodityId` null 유지 → 이후 모든 요청 차단.

### `GET /commodities/{id}/stream`

**쿼리 파라미터:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `granularity` | `"monthly"` \| `"quarterly"` \| `"yearly"` | `monthly` | 항상 전송 |
| `from` | `YYYY-MM` | (없음) | filterFrom null이면 미전송 |
| `to` | `YYYY-MM` | (없음) | filterTo null이면 미전송 |
| `segments` | `"A,B,D_prime"` (콤마 구분) | (없음) | activeSegments 빈 배열이면 미전송 |
| `grade` | `"high,medium"` (콤마 구분) | `"high,medium"` | 항상 전송 |
| `patterns` | `"pattern1,pattern2"` | (없음) | 빈 배열이면 미전송 |

**기대 응답 구조:**

```json
{
  "commodity_id": "wheat",
  "requested_from": "2023-04",
  "requested_to": "2026-03",
  "actual_from": "2023-04",
  "actual_to": "2026-03",
  "granularity": "monthly",
  "total_points": 36,
  "series": [
    {
      "segment_id": "A",
      "data": [
        {
          "period": "2024-06",
          "transmission_rate": 0.71,
          "upstream_pct": 7.8,
          "downstream_pct": 5.5,
          "in_warmup_period": false,
          "has_anomaly": true,
          "anomaly_ids": [101]
        }
      ]
    }
  ],
  "anomaly_nodes": [
    {
      "anomaly_id": 101,
      "segment_id": "A",
      "period": "2024-06",
      "primary_pattern": "pattern1",
      "pattern_types": ["pattern1"],
      "confidence_grade": "high",
      "transmission_rate": 0.71,
      "is_new": false
    }
  ]
}
```

---

## 4. 데이터 미출력 원인 체크리스트

| # | 원인 | 증상 |
|---|---|---|
| 1 | `/commodities` 응답에 `"commodities"` 키 누락 (배열 직접 반환) | 품목 목록 없음, 모든 차트 blank |
| 2 | `/stream` 응답에 `series` 또는 `anomaly_nodes` 키 누락 | 차트 blank |
| 3 | `series: []` 빈 배열 | D3 아무것도 안 그림 |
| 4 | `transmission_rate` 전부 `null` | D3 `.defined()` 조건 탈락 → 선 미렌더 |
| 5 | `in_warmup_period` 전부 `true` | 동일하게 선 미렌더 |
| 6 | `period` 형식 `"YYYY-MM"` 아님 | `parseYYYYMM()` 실패 → `Invalid Date` → x축 붕괴 |
| 7 | CORS 미허용 | 브라우저 콘솔에 CORS 에러, 네트워크 요청 실패 |

---

## 5. 전체 API 엔드포인트 목록 (18종, 모두 GET)

```
GET /commodities
GET /commodities/{id}
GET /segments
GET /events
GET /freshness
GET /anomalies/summary
GET /commodities/{id}/stream
GET /commodities/{id}/stream/minimap
GET /commodities/{id}/scatter
GET /commodities/{id}/raw-prices
GET /commodities/{id}/raw-prices/minimap
GET /anomalies/{id}/detail
GET /anomalies/{id}/stat-series?metric={metric}
GET /anomalies/{id}/stat-snapshot?metric={metric}
GET /anomalies/{id}/irf
GET /anomalies/{id}/ml-map?model={model}
GET /meta/pipeline
GET /meta/analysis-params
```

`stat-series` metric 값: `transmission_rate` | `zscore` | `ect` | `breakpoints`  
`stat-snapshot` metric 값: `iqr` | `asymmetry`  
`ml-map` model 값: `isolation_forest` | `lof` | `ocsvm`

---

## 6. 백엔드 즉시 확인 요청

1. `GET /api/v1/commodities` → `{ "commodities": [...] }` 감싸진 구조인지
2. `GET /api/v1/commodities/{id}/stream` → `series`, `anomaly_nodes` 키 포함 여부
3. `http://localhost:5173` origin CORS 허용 여부
4. `transmission_rate` 필드 숫자값 채워지는지 (null 전부인지)
5. `period` 필드 `"YYYY-MM"` 형식 준수 여부

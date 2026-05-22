# 백엔드 요청 — 2026-05-21

프론트엔드 사용자 피드백 처리 중 백엔드 정합 필요 사항 2건.

---

## 요청 1 — `/events` 응답 갱신 (외부 충격 사건 v2)

### 배경

프론트엔드에 표시되는 5개 사건이 구버전(2008/2020/2021브라질서리/2022우크라이나/2022인니팜유). 사용자가 신규 5개 사건(`EXTERNAL_SHOCKS` 정의)으로 갱신 요청.

### 변경 후 기대 응답

```json
{
  "events": [
    {
      "event_key": "E1_financial_crisis_2008",
      "label_kr": "2008 글로벌 금융위기",
      "start_date": "2008-07",
      "end_date": "2009-01",
      "color_hex": "#F97316",
      "commodities": ["wheat","maize","soybean","palmoil","sugar","coffee","beef","groundnuts","banana","orange"]
    },
    {
      "event_key": "E6_russia_drought_2010",
      "label_kr": "2010 러시아 가뭄·수출 금지",
      "start_date": "2010-08",
      "end_date": "2011-06",
      "color_hex": "#A855F7",
      "commodities": ["wheat","maize","soybean","palmoil","sugar","coffee","beef"]
    },
    {
      "event_key": "E9_elnino_2015",
      "label_kr": "2015-16 역대급 엘니뇨",
      "start_date": "2015-09",
      "end_date": "2016-06",
      "color_hex": "#38BDF8",
      "commodities": ["maize","soybean","palmoil","sugar","coffee","beef"]
    },
    {
      "event_key": "E2_covid19_2020",
      "label_kr": "2020 COVID-19 팬데믹",
      "start_date": "2020-02",
      "end_date": "2020-06",
      "color_hex": "#22C55E",
      "commodities": ["wheat","maize","soybean","palmoil","sugar","coffee","beef","groundnuts","banana","orange"]
    },
    {
      "event_key": "E4_ukraine_war_2022",
      "label_kr": "2022 우크라이나 전쟁",
      "start_date": "2022-02",
      "end_date": "2022-10",
      "color_hex": "#EF4444",
      "commodities": ["wheat","maize","soybean","palmoil"]
    }
  ]
}
```

### 정합 요청

1. `external_events` 시드 데이터 5건 갱신 (위 5개로 교체)
2. `commodities` 필드 추가 — 사건이 영향을 미치는 품목 목록 (FE에서 품목별 사건 필터링용)
3. 응답에 `commodities` 필드가 있더라도 기존 `event_key`/`label_kr`/`start_date`/`end_date`/`color_hex` 필드는 그대로 유지 (BE 응답 envelope 변경 없음)

### 프론트엔드 측 조치

- `src/fixtures/events.json` 신규 5개로 교체 완료 (mock 모드 정합)
- `src/types/event.ts`에 선택 필드 `commodities?: string[]` 추가 예정 (BE 응답 후 확정)

---

## 요청 2 — `/commodities/{id}/raw-prices` 데이터 적재

### 배경

`/commodities/{id}/raw-prices` 응답이 `total_points=0`, `series[].data=[]` 빈 상태. 모든 품목 동일.

```bash
curl "http://localhost:8001/api/v1/commodities/wheat/raw-prices?layout=1" | jq '.total_points'
# 0
```

프론트엔드는 현재 안내 카드("백엔드 적재 대기 중") 표시 중. 시각화 자체는 정상이지만 원시 시계열 탭이 빈 화면.

### 필요 조치

파이프라인 Phase 0 결과물(전처리 완료 원시 시계열) DB 적재:
- `raw_prices` 테이블 또는 동등한 데이터 소스
- 소스 5종: `intl_price_krw`, `import_price_usd`, `ppi`, `wholesale_price`(4구간 품목만), `cpi`
- 각 소스별 `value` + `index_2020` (2020년 평균=100 기준 지수)
- 월별 데이터 (`YYYY-MM-01` 또는 `period: "YYYY-MM"`)

### 확인 요청

- 파이프라인 측에서 원시 시계열 산출이 완료된 상태인지
- DB 적재가 어느 phase에서 이뤄지는지
- 적재 일정

---

## 잔여 알림 (참고)

- `/anomalies/summary`도 여전히 더미 (`total_count=0`, `anomalies=[]`). FE는 fallback으로 stream 응답의 `anomaly_nodes`에서 직접 사용 중. 우선순위 낮음.
- `stream.anomaly_nodes`에 `high` 등급 케이스 0건(현재 medium만 11~140건). FE는 등급 폴백(high → medium → reference) 작동 중. 파이프라인 임계값 조정 시 다시 보고.

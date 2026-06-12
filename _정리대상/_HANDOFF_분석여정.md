# 핸드오프 — 분석 여정(/journey) 3D 탭 (compact 대비 상세 기록)

> 이 문서는 컨텍스트 compaction 후 작업을 이어가기 위한 작업기록. **커밋 대상 아님**(스크래치). 경진대회 **2026-06-12(목)** 대비.

## 0. 한 줄 요약
경진대회용 프론트(React+Vite+TS+D3+TanStack Query+Zustand)에 ① 논문 v40 정본 정합성 텍스트 교정(완료·커밋됨) + ② **3D 스크롤리텔링 새 탭 "분석 여정"(/journey)** 신규 구현. 현재 여정의 디자인·정본정합을 deepflow로 반복 개선 중.

## 1. 환경·실행 (★필수)
- 작업 디렉터리: `C:\Users\USER\Desktop\2026-1 docs\price_transmission\price-transmission-frontend\price-transmission-frontend`
- 브랜치: `fix/paper-v40-alignment` (base: develop). **마지막 커밋 `0077d93`** (정합성15 + 여정전체 + deepflow 2사이클). 그 이후 변경(Phase2/3 일부, Station6 등) **미커밋 다수**.
- dev 서버: `npm run dev` → 현재 **http://localhost:5175/journey** (백그라운드 task `bu9beujj5`). 5173/5174는 점유 잔존.
- 빌드 게이트: `npx tsc -b` (또는 `npm run build` = tsc -b && vite build), lint `npx eslint src/components/journey --ext ts,tsx` (max-warnings 0). **마지막 상태 전부 통과.**
- ⚠️ **데이터 소스 함정**: `.env`·`.env.local` 둘 다 `VITE_USE_MOCK=false`(백엔드 호출). 백엔드 미실행이라 **dev에서 데이터 0**였음. → `.env.development.local`에 `VITE_USE_MOCK=true` 생성해 **dev만 mock(fixture)** 사용(build/프로덕션은 .env false=백엔드 유지 = "dev=mock, build=백엔드" 의도). **env 변경 후 dev 서버 재시작 필수.**
- ⚠️ **build(실데이터) 온전 출력이 핵심 제약**(사용자 반복 강조). 모든 수정은 백엔드 실데이터(항목多·null·긴 문자열)에서도 안 깨지게.
- 설치 deps: `three@^0.160.1`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122`, (+`@react-three/postprocessing@^2.16.2`·`postprocessing@^6.35.6` — **현재 미사용**, bloom 제거됨. 정리 가능). three는 vite `manualChunks`로 별도 청크 + lazy route → 기존 페이지 번들 불변(격리).

## 2. 기획·제약 (절대 원칙)
- 컨셉: **전문가 지향 가격전이 이상탐지 "분석 결과 전달"** 도구. **객관적 정보 전달, 우리/LLM의 해석·주장 금지**(근거만 제시, 판단은 보는 이의 몫).
- 제약1: 기존 제출 페이지(흐름/전달구조/원시/방법론) **대개편 금지** — 여정은 **새 탭 추가**라 안전.
- 제약2: 컨셉 유지. 디자인: **차분·일관·둥근 소프트**, 라이트 톤.
- 품목: **하드코딩 금지 — 상단 품목 드롭다운(전역 primaryCommodityId) 따름**. 기본=첫 품목(wheat). (밀=`wheat`, 소고기=`beef`. 커피·땅콩은 데이터 한계로 후순위)

## 3. 여정 아키텍처 (현재 구현)
- 라우트: `/journey` lazy (`router/index.tsx`). 탭 `Header.tsx` VIEW_TABS에 `journey`('분석 여정'). `AppShell.tsx` isJourney → FilterBar·Panel 숨김 + main overflow-hidden. `useAppStore.setActiveTab` journey 시 패널 닫기. `literals.ts` VIEW_TABS에 journey. `vite.config.ts` manualChunks.
- 네비: **스크롤 제거. 방향키 ↑↓ + 우측 ▲▼ 버튼 + 좌측 패널 단계 점**으로 **이산 이동**(고정 좌표). (휠 연속 스크롤이 라벨-모델 싱크 어긋남의 근원이라 폐기)
- 카메라(`JourneyRig.tsx`): 현재 stage의 고정 좌표(`y=-stage*STAGE_GAP`)로 **lerp 이징**(0.12). 스테이션별 **동적 줌**(`STAGE_HALF_WIDTH=[7.5,5.5,9.5,7,8.5,8.5]` + `CAMERA_PADDING 1.25` + `CONTENT_USABLE_W 0.62`로 거리 계산). **우측 편향**(카메라 x 음수 → 콘텐츠가 좌측 안내패널 피해 우측 62% 영역에).
- 데이터(`useJourneyData.ts`): **Canvas 밖에서** 훅 호출(Canvas 안은 react-query 컨텍스트 미도달) → props 주입. 전역 primaryCommodityId 사용. usePipelineData/useAnalysisParams/useCommodities/useAnomaliesSummary/usePanelDetail(대표 anomalyId)/useEvents + **commodityId 직접 쿼리(stream, raw-prices)**. 대표 anomalyId = summary에서 해당품목 high 우선.
- 라벨(`primitives/Label3D.tsx`): **non-transform Html(스크린-스페이스, 일정 크기·선명)**. ⚠️ **transform으로 되돌리지 말 것** — transform+distanceFactor가 텍스트 팽창/desync/캔버스밖 잘림의 원인이었음. 칩(chip)=흰 카드+다크텍스트(항상 가독), 비칩=기본 다크.
- `primitives/FlowLine.tsx`: 연결선 + 방향 흐름 파티클(라벨 없는 메시라 애니메이션 OK). ①③에 사용.
- RoundedBox(drei): ①허브·③노드·④ECON 등 둥근 폼.
- 룩: **라이트 단일**(`JOURNEY_THEME` bg #faf8f4). (다크 이머시브·bloom 룩은 사용자가 폐기 → 라이트만. postprocessing 미사용.)
- 미사용 파일: `primitives/HtmlCard.tsx`, `stations/StationPlaceholder.tsx`(정리 가능).

## 4. 6 스테이션 현재 상태 (인덱스 0~5)
- ① Sources: raw-prices 5소스(실은 fixture 2개) 구체, 반경=커버리지, 라벨=`SOURCE_LABEL[source]`(국제가(원화)·수입단가·PPI·도매가·CPI)+개월+index_2020, FlowLine→허브. ⚠️ `raw_prices.json` fixture의 `label_kr`이 **mojibake(인코딩 손상)**라 fixture 텍스트 안 쓰고 source→로컬 매핑.
- ② Segments: commodity.segments 체인(밀·소고기=A·B·D_prime). 대표 detail.segment_id 강조 + 전이율·model_type·cointegrated 배지. SEG_LABEL D_prime→'E'.
- ③ Pipeline: **네이티브 3D**(Html 임베드 폐기 — 안 보이던 문제). pipeline.nodes(Phase 0~8, 11노드) 가로 플로우 + FlowLine edges + analysis_params 칩. 데이터 없을 때 회색 fallback 9박스.
- ④ DualDetect: 중앙 노드→계량 lane(z/IQR 발광, 정상/실제 시차 이중선)·ML lane(3구체 반경=`percentile/100`, 발광=anomaly) + "IF·LOF·SVM 중 n종 탐지". ⚠️ **percentile 0~100 가정해 /100** — 백엔드가 0~1이면 수정 필요.
- ⑤ Confidence: H/M/R 빈(높이=실제 카운트) + judgment_path 통과/미통과 체인(**중립색 STEP_ON/STEP_OFF**, 초록/빨강 아님) + "분류 등급:…·N건 중 r번째".
- ⑥ Results: 데이터 기반 시간축 + 이상 마커(반경=transmission_rate, null-safe) + 5 외부충격 음영(**단일 opacity** — 인과 강조 안 함) + 충격구간 내 건수.

## 5. 정본(논문 v40) 기획 SoT — 심층 파악 완료 (★개선 근거)
- 논문: "계량경제학 분석과 머신러닝 기반 소비자 물가 분석 및 이상 탐지를 위한 모델 개발" (JDCS Vol.26 No.12, 2025). 저자 최수안·예병성·하대수·바게스타니 샤키라·김정동(교신).
- **어조 = 신중 서술 + 한계 적극 병기**: 결과는 객관 수치, 해석은 "관찰되었다·시사한다·나타났다"로 위임. **단정/주장 금지**(주장금지 컨셉의 정본 근거).
- **이중분석 독립**: 계량·ML이 판정 공유 안 함(순환논리 제거). Cohen κ 0.093, 단순일치 68.4%(대부분 다른 판정). **합의(ASC>max(P_econ,P_ml)) 가설 20유닛 중 7개(35%)만 성립 — 논문도 "제한적 성공"**.
- **Weak Ground Truth**: 5충격(FS2008·RD2010·EN2015·CV2020·UW2022)은 **검증 근거이지 인과 주장 아님**. ±2개월 버퍼. ESR 분모 66. 충격유형 분업은 **"관찰됨"**(다차원2008: ML88.9%>계량77.8% / 단일차원 엘니뇨·코로나: 계량 우월).
- 파이프라인 Phase 0~8(+7-ML), 구간 A(국제가→수입단가)·B(수입단가→PPI)·C(PPI→도매)·D(도매→CPI)·**E(PPI→CPI, 도매 미관측 시)**. 밀·소고기=3구간 A·B·E.
- 이상 3유형: ①방향역전·시차이탈 ②전이율 크기이탈·비대칭(Z 주의2.0/경보2.5 + IQR×1.5 Tukey, TECM 로켓-깃털) ③국제가 안정(±3%)기 스프레드 누적(2/3/6개월).
- 등급: **H=두 분석 모두 / M=계량만(ML 범위 이내) / R=ML만**. 분포 H189(11%)/M1334(77.9%)/R189(11%). **ML은 구간 A·B에만 적용(C~E는 계량 단독)**.
- ML: 6피처(전이율·상류·하류 변화율·ECT또는스프레드·환율·국제가)·3모델(IF/LOF/OCSVM)·**2 of 3 앙상블**. contamination 0.08. SHAP 주의존(IF 국제가18.4%·LOF 전이율21.8%·OCSVM ECT19.6%). SR_sep 2.71/2.61/2.22. **견고성: 계절조정(STL) 방식이 최대 민감(Jaccard 0.178 SENSITIVE)** — 오염률 아님.
- 결과 수치: 계량 2266건(방향역전2007·전이율185·스프레드74), graded 1712, AUC 0.607, 앙상블 연속형 개선 0.550→0.630.
- 한계: 커피 PPI 75개월(1/4)·KAMIS 도매 3품목·오렌지바나나 과실류 통합·구간 C~E ML 미적용·ASC 35%.
- 추출본: `C:\Users\USER\AppData\Local\Temp\paper_v40_extracted.txt`(없으면 hwpx에서 재추출). hwpx: `C:\Users\USER\Desktop\2026-1 docs\price_transmission\논문 초고\첨삭 자료\이제 진짜 마지막일까\11분반 1팀 종합프로젝트 논문_v40.hwpx`.

## 6. ★사용자 교정 (다음 작업 시 반드시 반영)
1. **deepflow 개선 사이클의 비판 에이전트는 내 요약(SoT)이 아니라 "논문 원문(paper_v40_extracted.txt)을 직접 재독"하고 근거(verbatim)로 비판해야 함.** (방금 사이클3은 SoT만 주입 → 사용자가 지적. 다음 사이클은 논문 정독 mandate 추가.)
2. build 실데이터 온전 출력 필수.
3. ④ percentile 스케일은 백엔드 연결 시 확인.

## 7. deepflow 사이클3 결과 (SoT기반 — 적용 대기, 단 논문 재독 후 확정 권장)
**정본정합 렌즈:**
- (major) ④ 이중분석 **독립성이 시각에서 흐림** — 중앙 "이상 후보" 1노드→양갈래가 "입력/판정 공유"처럼 보임. → 중앙 라벨 "동일 관측점"+"독립 판정·결과 공유 없음" 보조칩, 또는 공통노드 제거하고 두 레인 병렬화.
- (major) ⑤ **ML이 구간 A·B에만 적용**(C~E 계량 단독)이 누락 → stationCopy ⑤ body + 보조칩 추가.
- (major) ⑥ **합의(ASC) 희소(35%)·한계가 누락** → stationCopy ⑥ body + 보조칩("합의 35% · 독립 판정 한계").
- (minor) ② 구간 E "도매 미관측" 의미 손실 → 라벨 'E(도매 미관측)'.
**주장금지 렌즈:**
- (major) stationCopy:50 "두 분석을 독립적으로 수행해 **교차 검증**" → "판정을 공유하지 않음"으로(독립성·낮은 일치 강조). ※주의: "교차검증"은 논문 ML 역할 용어이기도 함 → **논문 원문 확인 후 결정**.
- (major) ⑥ 충격 라벨 "·N건"이 **인과 암시** → 건수 제거 또는 "시간적 중첩 수 — 인과 해석 제외" 주석으로.
- (minor) ① "이상 포함" 칩 = 단계 순서 위반(이상은 Phase7에서 탐지) + 단정 → 제거.
(사이클3 output: `...\tasks\wznmx1lwh.output`)

## 8. 다음 할 일 (순서)
1. **deepflow 사이클3 재실행 OR 확정** — 사용자 교정대로 **에이전트가 논문 원문 재독**하도록 mandate 추가해 위 7의 항목을 정본 verbatim으로 검증·확정.
2. 채택분 적용(특히 ④독립성·⑤ML범위·⑥합의희소·⑥인과제거·①칩제거) → `npx tsc -b` + lint + build 게이트.
3. **deepflow 사이클4**(재비판, 새 이슈만/dry 확인) → 적용 → 빌드. (사용자 "deepflow 2사이클 재개" = 사이클3·4)
4. 눈 검증(http://localhost:5175/journey): 6스테이션 정본정합·주장금지·차분 일관.
5. **커밋**(`fix/paper-v40-alignment`).

## 9. 참고 파일·경로
- plan: `C:\Users\USER\.claude\plans\sharded-mixing-goblet.md`
- 메모리: `project_paper_v40_alignment.md`, `project_env_local_port_override.md`(VITE_USE_MOCK 토글·포트 함정), `project_build_state.md`, `feedback_pin_design_contracts.md`
- 워크플로 output(temp, 휘발성): census `wrxin3f8w`, diff `wr6iw86v9`, deepflow `w66w2neos`/`w2c6cqmj9`/`wznmx1lwh`, 논문심층 `w2z3jt7nv`+`a0fff41157b13f481`.
- 정합성 손상 fixture: `src/fixtures/raw_prices.json`(label_kr mojibake — source 매핑으로 회피 중).

# 프론트엔드 코드 ↔ 최신 명세 정합화 플랜 v1

**목적**: 현재 `src/`, `tests/`, 루트 설정 파일, README 가 `docs/docs_manifest.md` §1 기준 최신 명세 (`frame_spec_frontend_v4`, `api_spec_v5`, `db_schema_v5`, `exception_spec_v5`, `exception_design_v3`, `web_plan_v6`, `pipeline_output_spec_v7`, `feature_dev_list_v4`) 와 정합하도록 수정 항목을 정리한다.
**실행 주체**: 본 플랜은 PM 감사용이며, 실제 코드 생성은 Sonnet 이 수행한다.
**작성일**: 2026-05-07
**작성자**: Opus (감사) → Sonnet (실행)
**근거 문서** (본 플랜은 manifest 해석기 대상):
- `frame_spec_frontend_vN.md`, `api_spec_vN.md`, `db_schema_vN.md`, `web_plan_vN.md`
- `exception_spec_vN.md`, `exception_design_vN.md`, `pipeline_output_spec_vN.md`, `feature_dev_list_vN.md`
- `docs_manifest.md` §2.1 (vN 표기 규칙) + §2.2 (파일 부재 방지 규칙)

---

## 0. Sonnet 실행 전 필수 체크 (manifest §2.2 강제)

**이 플랜을 실행하기 전에 반드시 아래 순서로 사전 점검한다. 하나라도 실패하면 즉시 중단하고 PM 에게 보고한다.**

1. `docs/docs_manifest.md` 를 먼저 읽는다.
2. manifest §1 버전 해석표의 각 "실제 파일명" 이 `docs/` 폴더에 존재하는지 확인 (12개 — `sprint_plan` / `team_ai_collab` 은 §1.1 미입고로 취급, 본 플랜은 이 두 문서에 의존하지 않음):
   - `doc1_technical_pipeline_v10.md`, `doc2_pattern_definitions_v2.md`, `doc3_research_proposal_v11.md`, `web_plan_v6.md`, `pipeline_output_spec_v7.md`, `db_schema_v5.md`, `api_spec_v5.md`, `exception_spec_v5.md`, `exception_design_v3.md`, `feature_dev_list_v4.md`, `frame_spec_backend_v3.md`, `frame_spec_frontend_v4.md`
3. 본 플랜의 **모든 참조 버전은 `_vN` 표기**로 해석하며, 실제 파일명은 manifest §1 표로 매핑한다.
4. 본 플랜 실행 중 **새로 작성하는 코드 주석·문서 본문**은 절대 구체 버전을 박지 않는다. 단 §3.1 의 README 표·§5 의 historical 변경이력 등 **명시적으로 historical 표현이 필요한 곳**만 예외다 (manifest §2.1 예외 1번).

---

## 1. 현재 프론트엔드 코드 인벤토리 (기준점)

### 1.1 구현 완료 파일 (Frame §2 기준)

```
price-transmission-frontend/
├── public/favicon.svg                ✓
├── src/
│   ├── api/
│   │   ├── client.ts                 ✓ Axios + MOCK 인터셉터 + 에러 파싱 (1건 이슈 §4.1)
│   │   ├── endpoints.ts              ✓ 18종 경로 상수
│   │   └── error.ts                  ✓ ApiError + 체이닝 (주석 스테일 §5)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          ✓ 3분할 레이아웃
│   │   │   ├── Header.tsx            ⚠ 1건 이슈 (§3.4 4번째 탭 중복)
│   │   │   ├── FilterBar.tsx         ✓ 기간/사건/신뢰도/패턴/구간 필터 자리표시자
│   │   │   └── Panel.tsx             ✓ 4섹션 자리표시자 (주석 스테일 §5)
│   │   └── charts/.gitkeep           ✓ Frame §8.6 빈 상태
│   ├── stores/useAppStore.ts         ⚠ 미입고 명세 참조 §4.2
│   ├── types/
│   │   ├── literals.ts               ✓ Literal 12종 (1건 검토 §5.4)
│   │   ├── commodity.ts              ✓ api_spec_vN 1:1
│   │   ├── anomaly.ts                ✓ /detail·/stat-series·/stat-snapshot·/irf·/ml-map
│   │   ├── timeseries.ts             ✓ envelope + /stream·/scatter·/raw-prices
│   │   ├── event.ts                  ✓ /events
│   │   ├── meta.ts                   ✓ /freshness·/meta/*
│   │   ├── error.ts                  ✓ ErrorBody·ErrorResponse
│   │   └── index.ts                  ✓ barrel
│   ├── fixtures/
│   │   ├── commodities.json          ✓ db_schema_vN §commodities 초기 데이터 10행
│   │   ├── segments.json             ✓ db_schema_vN §segments 초기 데이터 5행
│   │   ├── events.json               ✓ db_schema_vN §external_events 초기 데이터 5행
│   │   └── freshness.json            ✓ Frame §8.1 고정값
│   ├── services/.gitkeep             ✓ Frame §8.7 빈 상태
│   ├── pages/MainPage.tsx            ✓ 자리표시자 (배너·차트·미니맵 슬롯)
│   ├── router/index.tsx              ✓ React Router v6 단일 경로
│   ├── App.tsx                       ✓ QueryClientProvider + AppInit 모의 호출
│   ├── main.tsx                      ✓ 전역 에러 핸들러 등록 (주석 스테일 §5)
│   ├── index.css                     ✓ Tailwind import
│   └── vite-env.d.ts                 ✓ ImportMetaEnv 3변수
├── tests/
│   ├── setup.ts                      ✓ @testing-library/jest-dom 등록
│   └── frame_smoke.test.ts           ✓ §7.4 smoke 3건
├── docs/                             ⚠ CLAUDE.md 백엔드 내용 §3.2
├── .env.example                      ✓ 3변수 (Frame §4)
├── .gitignore                        ✓
├── .eslintrc.cjs                     ✓ camelcase properties:never (§6.1)
├── .eslintignore, .prettierignore    ✓
├── .prettierrc                       ✓ Frame §8.4 형식
├── .nvmrc                            ✓ 20.11.1
├── index.html                        ✓
├── package.json                      ✓ 정확 버전 27 종
├── package-lock.json                 ✓ 커밋됨
├── tsconfig.json/.app.json/.node.json ✓ strict + path alias
├── vitest.config.ts                  ✓ jsdom + VITE_USE_MOCK env
├── vite.config.ts                    ✓ port 5173 + /api 프록시
├── tailwind.config.ts, postcss.config.js ✓
├── CLAUDE_backend.md (root)          ❌ 삭제 대상 — 백엔드 repo 측 원본 폐기 결정 (§3.1)
├── README.md                         ⚠ 8건 스테일 (§3.3)
└── (CLAUDE.md 부재)                  ❌ Frame §2 누락 (§3.1)
```

### 1.2 정상 확인 (수정 불필요)

| 항목 | 현황 | 검증 |
|---|---|---|
| 패키지 버전 고정 | `package.json` 27 패키지 전부 정확 버전 (`^`/`~` 0건) | Frame §3 표 일치 |
| Node·npm engines 잠금 | `"node": "20.11.1"`, `"npm": "10.2.4"` | Frame §3 + `.nvmrc` 일치 |
| 환경 변수 | 3개 (`VITE_API_BASE_URL`, `VITE_USE_MOCK`, `VITE_APP_TITLE`) | Frame §4 표 완전 일치 |
| ESLint `camelcase` | `properties: 'never'` | Frame §6.1 / §8.4 일치 |
| Prettier 설정 | `semi:true`, `singleQuote:true`, `trailingComma:"all"`, `printWidth:100` | Frame §8.4 일치 |
| 18종 엔드포인트 상수 | `src/api/endpoints.ts` | api_spec_vN §엔드포인트 목록 18 항목 1:1 |
| 에러 envelope 타입 | `ApiErrorBody`/`ApiErrorResponse` | api_spec_vN §공통 사항 D-20 + Frame §6.4 일치 |
| Literal SoT 정책 | `src/types/literals.ts` 단일 export, 다른 타입 파일에서 import | Frame §6.3 일치 |
| `populate_by_name` 변환 인터셉터 | 없음 (snake_case 그대로) | Frame §6.1 + §8.10 일치 |
| `localStorage`/`sessionStorage` 사용 | `src/` 전체 0건 (grep 검증 완료) | Frame §8.10 일치 |
| `Date` 자동 변환 | 없음 (모든 날짜 필드 `string` 유지) | Frame §6.5 + §8.10 일치 |
| 시계열 envelope 타입 | `TimeseriesEnvelope` (`requested_*`/`actual_*`/`granularity`/`total_points`) | api_spec_vN §시계열 공통 envelope + Frame §6.2 일치 |
| Smoke test 3건 | `test_app_renders`, `test_commodities_mock_response`, `test_literal_types_consistency` | Frame §7.4 완전 일치 |
| Fixtures 4종 | 길이·필드 검증 — `commodities` 10, `segments` 5, `events` 5, `freshness` Frame §8.1 고정값 | db_schema_vN §초기 데이터 일치 |
| Vitest env 주입 | `vitest.config.ts` `VITE_USE_MOCK='true'` | Frame §8.5 일치 |
| `services/`·`charts/` 빈 폴더 | `.gitkeep` 만 존재 | Frame §8.6·§8.7 일치 |
| 라우터 prefix 정책 | Axios `baseURL=VITE_API_BASE_URL`, 호출은 prefix 없이 (`/commodities` 등) | Frame §8.2 일치 |
| CORS 처리 | `vite.config.ts` `/api` 프록시 + 절대 URL `baseURL` 양립 | Frame §8.3 일치 |
| Zustand 스토어 슬라이스 | Commodity / Filter / View / Overlay / Panel 5개 결합 | web_plan_vN §11.1 + Frame §6.1 일치 |
| `globalErrorHandler` 등록 | `main.tsx` `window.error` + `unhandledrejection` 양쪽 | exception_design_vN §2.4 일치 |

**본 플랜은 위 항목을 건드리지 않는다.** 아래 §2~§5 에 나열된 **실제 불일치** 만 수정한다.

---

## 2. 심각도·우선순위 요약

| 우선순위 | 항목 수 | 성격 | 배치 |
|---|---|---|---|
| **P0 — Critical (런타임 실패 가능)** | 0 | 해당 없음 | — |
| **P1 — High (사양 직접 위반)** | 4 | 구조 누락·뷰 탭 중복·README 정합 | §3 |
| **P2 — Medium (기능 정합 보강)** | 3 | 미입고 명세 참조·Literal 검토·세컨더리 주석 | §4 |
| **P3 — Low (표기·주석 — manifest §2.1 위반)** | 5 파일 across 12 occurrences | 스테일 버전 주석 (`exception_design_v2` 등) | §5 |

---

## 3. P1 수정 (실행 순서대로)

### 3.1 [P1] 루트 `CLAUDE.md` 신규 생성 + `CLAUDE_backend.md` (루트) 삭제 (Frame §2 디렉토리 구조)

**현상**:
- Frame `§2` 의 루트 트리에 `CLAUDE.md` 가 명시되어 있으나(`AI 컨텍스트 기준 파일 (최신 버전)`), 현재 프론트엔드 repo 루트에는 `CLAUDE.md` 가 **없다**.
- 대신 `CLAUDE_backend.md` (루트) 가 있다 — 백엔드 repo 의 `CLAUDE.md` 사본으로, cross-reference 용으로 보관 중이었다.
- **PM 결정 (2026-05-07)**: 백엔드 repo 측에서 `CLAUDE.md` 가 다른 spec 들과 내용이 중복된다는 사유로 **삭제하기로 결정**. 동기화 원본이 사라지므로 본 frontend repo 의 `CLAUDE_backend.md` 사본도 stale 처리되어 함께 삭제 대상이 된다.

**문제**:
- Frame §1 "완료 기준" 표 5번 행 `docs/` 폴더에 명세 8종 + CLAUDE.md 사본 존재 — 사본의 원본인 루트 CLAUDE.md 가 부재하면 사본도 정합 불가.
- AI 세션 자동 참조 컨텍스트 파일이 없어 매 세션 docs 전체를 다시 읽어야 한다.
- `CLAUDE_backend.md` 는 더 이상 백엔드 repo 와 동기화되지 않으므로 잘못된 정보의 출처가 될 수 있음 (특히 §10 `commodity_id` 표기 등 — §9 7번 참고).

**수정** (2 단계):

**Step 1 — 루트 `CLAUDE.md` 신규 생성**: 내용은 **프론트엔드 전용** 으로 작성. `frame_spec_backend_vN §8` 에 정의된 백엔드 측 CLAUDE.md 의 §1~§18 골격을 **명세상의 구조 가이드** 로 참고하되, 본 repo 컨텍스트로 치환:

```markdown
# CLAUDE.md — Frontend

> **Claude Code 세션 자동 참조 컨텍스트 파일 (프론트엔드 repo 전용)**
> 변경 시 단독 커밋: `[CLAUDE.md] Update {변경 내용}`

**최초 작성**: 2026-05-07
**담당**: 하대수 (sprint_plan_vN §3.2)
**버전 해석 단일 출처 (SoT)**: [`docs/docs_manifest.md`](docs/docs_manifest.md)
**참조 기준 문서** (모두 manifest §1 표로 최신 해석): `frame_spec_frontend_vN`, `api_spec_vN`, `db_schema_vN`, `web_plan_vN`, `exception_spec_vN`, `exception_design_vN`, `pipeline_output_spec_vN`, `doc1_technical_pipeline_vN`, `doc3_research_proposal_vN`, `feature_dev_list_vN`

**⚠ 작업 착수 전 필수 체크**: manifest §1 표의 파일이 `docs/` 에 모두 존재하는지 확인 (manifest §2.2).

## 1. 프로젝트 요약
- 과제명: 계량경제학 모형과 머신러닝 기반 소비자 물가 분석 및 이상 탐지를 위한 모델 개발
- 이 repo 의 역할: React 프론트엔드 — FastAPI 백엔드의 분석 결과 시각화 (D3.js)
- 데이터 흐름: 백엔드 API (`/api/v1/*`) → React Query → Zustand → D3.js 컴포넌트
- 핵심 원칙: 읽기 전용 소비자. 백엔드 응답 구조 변경 권한 없음. snake_case 필드명 그대로 보관.

## 2~18 — `frame_spec_backend_vN §8` 골격 가이드 + 다음 영역을 프론트로 치환:
- §3 디렉토리 구조: `src/api`, `src/components`, `src/stores`, `src/types`, `src/fixtures`, ...
- §4 기술 스택: React 18.3.1 / TS 5.4.5 / Vite 5.2.11 / D3 7.9.0 / Zustand 4.5.2 (Frame §3 표)
- §5 API 설계 원칙: 본 repo 는 소비자. 변환 인터셉터 금지(§6.1). `Date` 자동 변환 금지(§6.5).
- §6 엔드포인트 목록: api_spec_vN §엔드포인트 목록 18종 그대로 인용
- §8 월 식별자 변환: 백엔드와 동일 표 + 프론트는 `string` 유지 + 사용 시점에만 `date-fns` 파싱
- §10 품목 분류: db_schema_vN §commodities 초기 데이터 10행 그대로 (3구간/4구간 분류)
- §11 신뢰도 등급: 'high'/'medium'/'reference'
- §12 예외 코드 (이 repo 담당 도메인):
   - FE 도메인: FE-API-001~005, FE-D3-001~003, FE-STORE-001~002, FE-MOCK-001
   - PARSE 도메인 (API→FE): PARSE-DATE-002, PARSE-NUM-002, PARSE-ARR-002, PARSE-ENUM-002, PARSE-SCHEMA-001
   - 외부 코드 13종 + INTERNAL_ERROR (api_spec_vN §에러 코드 정의)
- §13 배치/Redis: 본 repo 무관. 백엔드 측 운용
- §14 필드명 드리프트 방지: 백엔드와 동일 (Frame §6.1)
- §15 절대 금지: Frame §8.10 표 그대로
- §16 Git 커밋 컨벤션: `[FE-API]`, `[FE-Layout]`, `[FE-Chart]`, `[FE-Panel]`, `[CLAUDE.md]` 등으로 영역 표기 (frame_spec_backend_vN §15 와 동일 스타일)
- §17 세션 간 컨텍스트 승계 포맷: 백엔드와 동일
- §18 참조 문서 경로: 본 repo 의 `docs/` 경로 + manifest 링크
```

**Step 2 — 루트 `CLAUDE_backend.md` 삭제**: 백엔드 repo 측에서 원본 `CLAUDE.md` 가 폐기되므로 본 사본도 함께 삭제. 본 작업 시점에 `CLAUDE_backend.md §10` 등을 참조한 본 플랜의 잔여 항목이 모두 별건(§9 7번)으로 이관되었는지 확인 후 삭제.

```bash
git rm CLAUDE_backend.md
```

**근거**: Frame §2 디렉토리 구조 표 (루트 `CLAUDE.md` 단일 운용) + manifest §2.2 파일 부재 방지 규칙 (백엔드 repo 측 폐기 결정 시점부터 본 사본은 동기화 원본 부재 → 잘못된 정보 출처가 됨).

**검증**:
- `ls CLAUDE.md` 결과 1개 (루트).
- `head -1 CLAUDE.md` 출력이 `# CLAUDE.md — Frontend` 또는 유사한 프론트 식별자.
- `ls CLAUDE_backend.md` 결과 부재 (`No such file`).
- `rg "CLAUDE_backend" --glob '!docs/plan_*.md' .` 결과 0건 (코드·README·신규 `CLAUDE.md` 잔여 참조 전무. 본 플랜 자체는 historical 기록으로 매칭 허용).

### 3.2 [P1] `docs/CLAUDE.md` 백엔드 → 프론트엔드 사본 교체

**현상**: 현재 `docs/CLAUDE.md` 는 백엔드 컨텍스트 파일이다 (헤더 `# CLAUDE.md — price-transmission-backend`, §3 디렉토리 구조가 `app/main.py`, `app/api/`, `alembic/` 등 백엔드 구조).

**문제**: Frame §2 디렉토리 구조에 따르면 `docs/CLAUDE.md` 는 **루트 CLAUDE.md 의 사본** (`← 명세 8종 + CLAUDE.md 사본`). 현재 파일은 다른 repo (백엔드) 의 컨텍스트 파일이 잘못 들어와 있는 상태.

**수정 전략** (Sonnet: **옵션 A 권장**):

**옵션 A — 사본으로 교체 (권장)**:
1. §3.1 에서 신규 생성한 루트 `CLAUDE.md` 의 내용을 그대로 `docs/CLAUDE.md` 에 덮어쓴다 (사본).
2. 향후 루트 CLAUDE.md 갱신 시 사본도 동기화하는 운용 규칙은 frame_spec_frontend_vN §2 가 이미 명시 — Sonnet 은 본 작업 시 두 파일이 동일한지 확인.

**옵션 B — 보존 + 리네이밍** (본 결정으로 사실상 폐기):
1. ~~현재 `docs/CLAUDE.md` 를 `docs/CLAUDE_backend_reference.md` 로 리네임~~ — 백엔드 repo 측 원본 `CLAUDE.md` 폐기 결정으로 보존 명분이 사라졌다. 옵션 A 만 유효.

**근거**: Frame §2 직접 명시. Frame §1 "완료 기준" 5번 행 `docs/` 폴더에 명세 8종 + CLAUDE.md 사본 존재 도 본 사항을 전제.

**검증**:
- `head -1 docs/CLAUDE.md` 출력이 루트 `CLAUDE.md` 와 동일한 프론트 식별자.
- 옵션 A 채택 시 `diff CLAUDE.md docs/CLAUDE.md` 결과 0 라인.

### 3.3 [P1] `README.md` 스테일 버전 8 군데 + PR 시점 정보 정정

**현상**: `README.md` 가 manifest §2.1 의 "구체 버전 하드코딩 금지" 규칙을 위반하고 있다. 외부 진입점 링크 정책(manifest §4) 에 따르면 README 는 **클릭 가능한 링크가 필요한 곳** 이라 `실제 파일명` 사용이 허용되지만, 현재는 **구버전 파일명** 을 가리키고 있어 정작 링크가 깨진다 (예: `docs/api_spec_v4.md` 는 존재하지 않음 — 현재는 `v5`).

**스테일 항목 (8건)**:

| # | 위치 | 현재 표기 | 수정 방향 |
|---|---|---|---|
| 1 | line 13 | `docs/frame_spec_frontend_v3.md §8.6` | manifest §1 으로 해석 → `docs/frame_spec_frontend_v4.md §8.6` (외부 링크) 또는 `frame_spec_frontend_vN §8.6` (본문) |
| 2 | line 97 | `docs/frame_spec_frontend_v3.md §1` | 동일 — `_v4` 또는 `_vN` |
| 3 | line 153 | `docs/api_spec_v4.md` | `docs/api_spec_v5.md` (외부 링크) |
| 4 | line 161 | `frame_spec_frontend_v3.md` (참조 문서 표) | `frame_spec_frontend_v5.md` 가 아닌 `frame_spec_frontend_v4.md` ← manifest 현재 버전 |
| 5 | line 163 | `api_spec_v4.md` | `api_spec_v5.md` |
| 6 | line 164 | `db_schema_v3.md` | `db_schema_v5.md` |
| 7 | line 165 | `exception_design_v2.md` | `exception_design_v3.md` |
| 8 | line 166 | `pipeline_output_spec_v5.md` | `pipeline_output_spec_v7.md` |
| 9 | line 167 | `doc1_technical_pipeline_v9.md` | `doc1_technical_pipeline_v10.md` |
| 10 | line 169 | `sprint_plan.md` (구버전 파일명, 미입고 표기 부재) | `sprint_plan_vN.md` _(미입고 — manifest §1.1)_ |

**수정 정책**:
- README 는 manifest §4 외부 진입점 정책 적용. **참조 문서 표** (line 161~170) 의 파일 컬럼은 **현재 구체 버전** 으로 정정 (클릭 링크 기능). 단 행 추가/삭제 시 본 정정 1회로 끝나지 않으므로, 표 헤더 위에 다음 주석 추가:
  ```markdown
  > 아래 표의 파일명은 manifest §1 의 현재 버전 시점 스냅샷이다. 버전 갱신 시 manifest 와 본 표를 함께 갱신한다.
  ```
- 본문 산문 (line 13, 97) 은 두 가지 모두 가능하나 일관성을 위해 **`_vN` 표기 + 별도 절대경로 링크** 방식 권장:
  ```markdown
  > **현재 단계: `frame/frontend`** — 레이아웃·타입·API 클라이언트·자리 표시자만 구현. D3 차트, 분석 패널 수치, 미니맵 등 실제 시각화는 `feat/fe-*` 후속 브랜치에서 단계별로 구현됩니다 (`docs/frame_spec_frontend_vN.md §8.6` 참조).
  ```

**브랜치 전략 다이어그램 (line 174~189)**: 그대로 유지. 본 다이어그램의 feat/* 브랜치 목록은 `feature_dev_list_vN.md` 와 일치하므로 별도 정정 불필요.

**근거**: manifest §2.1 + §4 + Frame §1 완료 기준.

**검증**:
- `rg "_v[0-9]+" README.md` 결과: 표(line 161~169) 의 외부 진입점 링크만 남고, 본문 산문은 `_vN` 으로 통일.
- 표의 모든 파일이 `docs/` 에 실재하는지 (manifest §2.2 ls 검증).

### 3.4 [P1] `Header.tsx` 뷰 탭 4개 → 3개 (방법론 중복 제거)

**현상**:
```tsx
// src/components/layout/Header.tsx (line 3)
const viewTabs = ['흐름 보기', '전달 구조', '원시 시계열', '방법론'];
```
이 4개 탭이 `<nav>` 안에서 동일 형태로 렌더링되고, 동시에 line 67~70 에서 우측에 별도 "방법론" 버튼이 또 렌더링됨 → **방법론이 2번 표시되는 결과**.

**spec**: web_plan_vN §3.3 표:
| 요소 | 설명 |
|---|---|
| 뷰 전환 탭 | 흐름 보기 / 전달 구조 / 원시 시계열 |
| 방법론 탭 | 분석 방법론 소개 화면으로 이동 |

뷰 탭은 **3개** (흐름 보기 / 전달 구조 / 원시 시계열) 이며 **방법론은 별도 탭** 으로 우측에 분리 배치된다.

또한 `src/types/literals.ts` 의 `VIEW_TABS` 는 4개 (`'stream', 'scatter', 'raw-prices', 'methodology'`) 인데, 이는 **Zustand `activeTab` 의 가능한 값 집합** 으로서 4개가 맞다 (방법론도 활성 화면이 될 수 있다). UI 상의 좌측 탭 그룹과 우측 방법론 버튼은 **같은 `activeTab` 상태를 공유** 한다.

**수정**:
1. `viewTabs` 배열에서 `'방법론'` 제거 → 3 항목 (`['흐름 보기', '전달 구조', '원시 시계열']`).
2. (Frame 단계 자리표시자이므로 동작 자체는 구현하지 않으나) 향후 feat 단계에서 활성 인덱스 매핑이 다음과 같음을 주석으로 명시:
   ```tsx
   // web_plan_vN §3.3 — 뷰 전환 탭 3개 (방법론은 우측 별도 버튼).
   // activeTab 매핑: 'stream' / 'scatter' / 'raw-prices' / 'methodology'
   const viewTabs = ['흐름 보기', '전달 구조', '원시 시계열'];
   ```
3. 우측 "방법론" 버튼(line 67~70) 은 그대로 유지. 이는 `activeTab='methodology'` 토글 진입점.

**근거**: web_plan_vN §3.3 + literals.ts `VIEW_TABS` 와의 의미 일치.

**검증**:
- 화면에서 "방법론" 텍스트가 좌측 nav 와 우측 단독 버튼 양쪽에 동시 노출되지 않음.
- `npm run test` 의 `test_app_renders` 통과 (현재 테스트는 `data-testid="header"` 만 검증하므로 본 변경에 영향 없음).
- `npm run lint`, `npm run build` 통과.

---

## 4. P2 중간 우선순위 개선

### 4.1 [P2] `useAppStore.ts` 미입고 명세 참조 정정

**현상**:
```tsx
// src/stores/useAppStore.ts (line 17)
// 단일 useAppStore — feature_spec_FE-LAY_v3 §3.1 합의된 슬라이스 결합 구조

// (line 86)
// feature_spec_FE-PANEL_v1 §2.3 정의
```

**문제**: `feature_spec_FE-LAY_v3` 와 `feature_spec_FE-PANEL_v1` 은 **manifest §1 버전 해석표에 등록되어 있지 않은 명세**. manifest §2.2 파일 부재 방지 규칙 위반 (참조하는 명세 파일이 `docs/` 에 부재). `feature_dev_list_vN.md` 의 §feat/fe-layout-filter / §feat/fe-panel 항목이 본 슬라이스 구조의 출처에 가까우나, **본 코드는 Frame 단계** 이며 feat 명세는 아직 작성 전 (feature_dev_list_vN §기능 명세 작성 순서 표 — 우선순위 2/4 시점 작성).

**수정 전략** (Sonnet: **옵션 A 권장**):

**옵션 A — manifest 등록된 상위 명세로 회귀**:
```tsx
// src/stores/useAppStore.ts (line 17)
// 단일 useAppStore — Frame §6 (TypeScript 타입 정의) + web_plan_vN §3·§6 (필터·패널 상태)
// 슬라이스: Commodity / Filter / View / Overlay / Panel
// 후속 feat/fe-layout-filter, feat/fe-panel 단계에서 슬라이스 결합 패턴 구체화

// (line 86)
// PanelState — web_plan_vN §6.6 (패널 너비 280~520px) + feature_dev_list_vN §feat/fe-panel 정의
```

**옵션 B — feat 명세 검색 후 재참조**:
- `feat/fe-layout-filter`·`feat/fe-panel` 의 PM 승인 명세 파일이 작성되면 그 시점에 manifest §1 등록 → 그 이후 `feature_spec_FE-LAY_vN` 표기로 갱신. 현재는 **옵션 A 임시 적용 후 feat 명세 작성 시 갱신** 이 합리적.

**근거**: manifest §2.1 (구체 버전 하드코딩 금지) + §2.2 (파일 부재 방지). manifest §1 에 등록되지 않은 명세를 참조하면 다른 AI 가 해당 파일을 찾으려다 실패한다.

**검증**:
- `rg "feature_spec_FE-(LAY|PANEL)_v[0-9]+" src/` 결과 0건.
- `rg "feature_spec_FE-(LAY|PANEL)_vN" src/` 결과 0건 (옵션 A 적용 시).

### 4.2 [P2] `Panel.tsx` 주석 `_vN` 누락

**현상**:
```tsx
// src/components/layout/Panel.tsx (line 1)
// frame 단계 — 패널 구조만 자리 표시자로. 실제 분석 수치·배지·판정 결과는
// feat/fe-panel 브랜치에서 API 응답으로 채움 (frame_spec §8.6, web_plan §6.1)
```
`frame_spec` 과 `web_plan` 둘 다 `_vN` 표기 누락. manifest §2.1 의 본문 `_vN` 표기 규칙에 어긋남.

**수정**:
```tsx
// frame 단계 — 패널 구조만 자리 표시자로. 실제 분석 수치·배지·판정 결과는
// feat/fe-panel 브랜치에서 API 응답으로 채움 (frame_spec_frontend_vN §8.6, web_plan_vN §6.1)
```
같은 파일 line 19~22 의 `// §6.6 — 너비 드래그 조절 범위 280~520px` 등은 같은 컴포넌트 본문 내 셀프 참조이므로 그대로 유지.

**검증**: §5 의 일괄 치환과 함께 처리.

### 4.3 [P2] `client.ts` Mock 인터셉터 패턴 — 향후 Axios 1.x 변경 호환성 검토 (선택)

**현상**: `src/api/client.ts` 의 mock 인터셉터는 `Promise.reject({isMockResponse: true, data, config})` 후 response 인터셉터에서 다시 resolve 하는 **이중 인터셉터 우회 패턴**. 현재 정상 동작하지만, Axios `1.x` 의 인터셉터 시그니처가 마이너 버전 갱신에서 보수적으로 바뀔 가능성이 있다.

**문제**: 본 패턴 자체는 Frame 단계 §8.1 더미 응답 정책을 충족 (msw 미도입). 단 향후 `feat/fe-api-connect` (S6) 단계에서 실 API 와 mock 동시 운용 시 디버깅이 어려울 수 있다.

**수정 전략**: **본 플랜에서는 변경하지 않는다**. 본 패턴은 Frame §8.1 정책을 충족하며, 향후 `feat/fe-api-connect` 또는 `feat/fe-stream-chart` 등 mock 분기를 추가할 때 동일 패턴을 따르도록 인접 fixture (예: `streamFixture`) 추가만 수행. 본 항목은 **PM 별건 검토 대상** (§9 4번) 으로 기록.

---

## 5. P3 스테일 버전 주석 정정 (manifest §2.1 위반)

**원칙**: 모든 코드 주석 / docstring / 문자열 상수의 `_v[0-9]+` 표기를 `_vN` 으로 전환. 단 **README 표** (§3.3 옵션 A) 와 **변경 이력 historical 표현** 은 예외.

### 5.1 수정 대상 파일 목록 (5 파일 / 12 occurrences)

#### 5.1.1 `exception_design_v2` → `exception_design_vN` (×8)

| # | 파일 | 라인 | 현재 스테일 표기 | 수정 후 |
|---|---|---|---|---|
| 1 | `src/api/client.ts` | line 79 | `(exception_design_v2 §2.1)` | `(exception_design_vN §2.1)` |
| 2 | `src/api/error.ts` | line 1 | `예외처리 설계 문서(exception_design_v2) 기반` | `예외처리 설계 문서(exception_design_vN) 기반` |
| 3 | `src/api/error.ts` | line 27 | `(exception_design_v2 §2.2)` | `(exception_design_vN §2.2)` |
| 4 | `src/api/error.ts` | line 36 | `(exception_design_v2 §2.2)` | `(exception_design_vN §2.2)` |
| 5 | `src/api/error.ts` | line 63 | `(exception_design_v2 §2.3)` | `(exception_design_vN §2.3)` |
| 6 | `src/api/error.ts` | line 95 | `(exception_design_v2 §2.5)` | `(exception_design_vN §2.5)` |
| 7 | `src/api/error.ts` | line 129 | `(exception_design_v2 §2.4)` | `(exception_design_vN §2.4)` |
| 8 | `src/main.tsx` | line 10 | `(exception_design_v2 §2.4)` | `(exception_design_vN §2.4)` |

#### 5.1.2 `frame_spec §` → `frame_spec_frontend_vN §` (×4) — `_vN` 누락

| # | 파일 | 라인 | 현재 스테일 표기 | 수정 후 |
|---|---|---|---|---|
| 9 | `src/api/error.ts` | line 7 | `(frame_spec §6.4)` | `(frame_spec_frontend_vN §6.4)` |
| 10 | `src/api/error.ts` | line 109 | `(frame_spec §6.4)` | `(frame_spec_frontend_vN §6.4)` |
| 11 | `src/pages/MainPage.tsx` | line 2 | `(frame_spec §8.6)` | `(frame_spec_frontend_vN §8.6)` |
| 12 | `src/components/layout/Panel.tsx` | line 2 | `(frame_spec §8.6, web_plan §6.1)` | `(frame_spec_frontend_vN §8.6, web_plan_vN §6.1)` ← §4.2 와 통합 처리 |

### 5.3 일괄 치환 주의점

- 치환은 **주석·docstring·문자열 내부의 `_v[0-9]+`** 에만 적용한다.
- `vN` 을 다시 `vN` 으로 치환하는 멱등 동작은 안전 (재실행 가능).
- `feature_spec_FE-LAY_v3`, `feature_spec_FE-PANEL_v1` 은 §4.1 옵션 A 로 별도 처리하므로 본 §5 일괄 치환 패턴(`exception_design_v[0-9]+` 등)에는 매칭되지 않는다.
- README.md 의 외부 진입점 링크는 §3.3 정책으로 별도 처리, **본 §5 일괄 치환 대상 아님**.
- 테스트 파일 `tests/frame_smoke.test.ts` 는 `_v[0-9]+` 표기 0건 (확인 완료). 수정 대상 아님.

### 5.4 검토 항목 — `ROCKET_FEATHER_DIRECTIONS` 의 `'symmetric'` 값

**현상**: `src/types/literals.ts` line 68:
```ts
export const ROCKET_FEATHER_DIRECTIONS = ['upward_stronger', 'downward_stronger', 'symmetric'] as const;
```
db_schema_vN §asymmetry_results.rocket_feather_direction 컬럼 코멘트는 `'upward_stronger' | 'downward_stronger' | NULL` (2 값 + null).

**문제**: `'symmetric'` 은 db_schema 에 정의되지 않은 값. Frame §8.10 절대 금지 표 7번 (`명세 8종에 부재한 외부 에러 코드를 src/api/error.ts 에서 임의 정의`) 의 직접 위반은 아니나(에러 코드가 아닌 enum), Frame §6.3 Literal SoT 정책의 정신에 어긋날 수 있다.

**수정 전략** (Sonnet: **옵션 B 권장**):

**옵션 A — `'symmetric'` 제거**:
```ts
export const ROCKET_FEATHER_DIRECTIONS = ['upward_stronger', 'downward_stronger'] as const;
export type RocketFeatherDirection = (typeof ROCKET_FEATHER_DIRECTIONS)[number] | null;
```
DB 가 NULL 또는 2 값만 반환하므로 정확.

**옵션 B — 보존 + 출처 주석 (권장)**:
```ts
// 비대칭 방향 — db_schema_vN.asymmetry_results.rocket_feather_direction 컬럼 + null
// 'symmetric' 은 DB 에 명시적으로 저장되지 않으나(값 또는 NULL),
// Wald 검정 비유의 케이스를 명시적으로 표현하기 위한 프론트 한정 도메인 값.
// 백엔드 API 응답에는 등장하지 않으며, 프론트 내부 계산(asymmetry_significant=false 시)에서만 사용한다.
export const ROCKET_FEATHER_DIRECTIONS = ['upward_stronger', 'downward_stronger', 'symmetric'] as const;
export type RocketFeatherDirection = (typeof ROCKET_FEATHER_DIRECTIONS)[number] | null;
```

옵션 B 권장 이유: api_spec_vN §`stat_metrics.rocket_feather_direction` 은 명시적 값 목록이 부재하나(`예: "upward_stronger"`), 패널의 비대칭 시각화에서 "유의미한 차이 없음" 케이스를 노드 색상으로 구분할 필요가 있다 (web_plan_vN §6.2 TECM α⁺/α⁻ 행). 프론트 도메인에서의 추가 값은 안전하며, 단 **백엔드 응답 검증 시 본 값이 등장할 일은 없음** 을 명시.

**검증**: 본 항목은 **PM 검토 후 결정** (§9 5번). Sonnet 자체 결정 금지. 옵션 B 임시 적용 후 PM 결정 대기.

---

## 6. 실행 순서 (Sonnet 작업 흐름)

각 단계는 **다음 단계 진입 전** 로컬 `npm run lint` + `npm run build` + `npm run test` 통과를 확인한다.

### Phase 1 — 문서 계층 정합 (P1 §3.1·§3.2·§3.3)
1. §3.1 Step 1 — 루트 `CLAUDE.md` 신규 작성 (`frame_spec_backend_vN §8` 골격 가이드 참고, 프론트 컨텍스트로 작성).
2. §3.2 — `docs/CLAUDE.md` 백엔드 내용 → 신규 루트 `CLAUDE.md` 사본으로 덮어쓰기 (옵션 A).
3. §3.1 Step 2 — 루트 `CLAUDE_backend.md` 삭제 (`git rm CLAUDE_backend.md`). **본 단계는 §3.1·§3.2 가 모두 끝난 뒤에 수행** — 신규 루트 `CLAUDE.md` 작성 중에 골격 참고가 필요할 수 있으므로.
4. §3.3 — `README.md` 8 군데 정정 (참조 문서 표는 외부 링크 정책, 산문은 `_vN`).
5. **검증**:
   - `diff CLAUDE.md docs/CLAUDE.md` 0 라인.
   - `ls CLAUDE_backend.md` 결과 부재.
   - `rg "CLAUDE_backend" --glob '!docs/plan_*.md' .` 결과 0건.
   - `rg "_v[0-9]+" README.md` 결과는 §3.3 표만 매칭.

### Phase 2 — UI 자리표시자 정정 (P1 §3.4)
5. §3.4 `Header.tsx` 의 `viewTabs` 4 → 3 항목 + 주석 추가.
6. **검증**: `npm run test` 의 `test_app_renders` 통과. `npm run build` 통과. 화면 스크린샷에서 방법론 중복 제거 확인.

### Phase 3 — 미입고 명세 참조 정정 (P2 §4.1·§4.2)
7. §4.1 `useAppStore.ts` line 17·86 의 `feature_spec_FE-LAY_v3 §3.1` / `feature_spec_FE-PANEL_v1 §2.3` → 옵션 A (Frame + web_plan_vN 으로 회귀).
8. §4.2 `Panel.tsx` 주석 `frame_spec §8.6, web_plan §6.1` → `_vN` 표기. (§5 일괄 치환과 동시 처리)
9. **검증**: `rg "feature_spec_FE-(LAY|PANEL)" src/` 결과 0건.

### Phase 4 — 스테일 주석 일괄 정정 (P3 §5.1)
10. §5.1.1: `exception_design_v2` (×8) → `exception_design_vN`. 대상 파일: `src/api/client.ts` (line 79), `src/api/error.ts` (line 1·27·36·63·95·129), `src/main.tsx` (line 10).
11. §5.1.2: `frame_spec §` (×4) → `frame_spec_frontend_vN §`. 대상 파일: `src/api/error.ts` (line 7·109), `src/pages/MainPage.tsx` (line 2), `src/components/layout/Panel.tsx` (line 2 — §4.2 와 통합).
12. **검증**: `rg "exception_design_v[0-9]+" src/` 결과 0건. `rg "frame_spec\s+§" src/` 결과 0건 (공백 + § 패턴; `frame_spec_frontend_vN §` 는 매칭 안 됨에 유의). `rg "_v[0-9]+" src/ tests/` 결과는 manifest 등록 파일명을 직접 가리키는 외부 진입점 링크 외 0건.

### Phase 5 — Literal 검토 (P3 §5.4) — PM 결정 대기
14. §5.4 의 `ROCKET_FEATHER_DIRECTIONS` 항목은 **옵션 B (보존 + 주석 보강)** 임시 적용. PM 결정 후 옵션 A 가 채택되면 별도 PR 로 처리.
15. **검증**: `npm run test` 의 `test_literal_types_consistency` 그대로 통과 (현재 테스트가 `ROCKET_FEATHER_DIRECTIONS` 를 검증하지 않음).

### Phase 6 — 최종 통합 검증
16. `npm run lint -- --max-warnings 0` 통과.
17. `npm run format:check` 위반 0건.
18. `npm run build` (TypeScript strict 컴파일) 오류 없음.
19. `npm run test` smoke 3건 통과.
20. `npm run dev` 기동 후 `http://localhost:5173` 빈 레이아웃 렌더링, `App.tsx` 의 `commodities.json` mock 응답 콘솔 로그 확인.
21. Frame §9 PM 승인 체크리스트 9개 항목 재확인.
22. Frame §10 PR 템플릿의 "포함된 문서" 체크리스트 재확인 (특히 `docs/` 폴더에 명세 8종 + CLAUDE.md 사본 첨부 행 — §3.1·§3.2 완료 후 통과).

---

## 7. 본 플랜이 **수정하지 않는** 항목 (근거 명시)

| 항목 | 이유 |
|---|---|
| `package.json` 의 27 패키지 버전 | Frame §3 표 완전 일치. `^`/`~` 0건 검증 완료. 후속 feat 단계 PM 승인 없이 변경 금지 (Frame §3 고정 원칙). |
| `src/services/.gitkeep`, `src/components/charts/.gitkeep` | Frame §8.6·§8.7 빈 상태 유지. D3 컴포넌트·비즈니스 로직은 `feat/fe-stream-chart`·`feat/fe-panel` 등 후속 브랜치 담당. |
| Mock 인터셉터 패턴 (`src/api/client.ts`) | §4.3 검토 후 본 플랜 범위 외로 결정. Frame §8.1 정책 충족. |
| 동적 경로 fixture (`/commodities/{id}/stream` 등) | Frame §8.1 — 정적 경로 4종만 frame 단계. 동적 경로 fixture 는 후속 feat 단계 (`feat/fe-stream-chart` 등) 가 자기 fixture 와 함께 분기 추가. |
| 시계열 인라인 그래프·산점도·IRF·결과맵 컴포넌트 | Frame §8.6 — feat 단계. |
| 실 API 연동 전환 (`VITE_USE_MOCK=false`) | Frame §8.1 — `feat/fe-api-connect` 담당 (S6, feature_dev_list_vN). |
| `sprint_plan_vN.md` / `team_ai_collab_vN.md` 본 repo 미입고 | manifest §1.1 — 외부 입고 대기. 본 플랜은 두 문서에 의존하지 않음. |
| `docs/frame_spec_backend_v3.md` 가 본 repo 에 존재 | 백엔드 측 cross-reference 용 (frame_spec_frontend_vN §6.2 의 3방향 일치 검증 시 필요). 제거 금지. |
| `docs/plan_backend_alignment_v1.md` | 백엔드 측 감사 플랜. 본 repo 에 존재해도 무해 (백엔드 작업 기록). 본 플랜의 양식 참고용. |
| `docs/price_lens_mockup_v2.html` | 디자이너 mock-up 파일. 본 플랜 범위 외. |
| `src/types/literals.ts` 의 18종 Literal 배열 | §5.4 의 `ROCKET_FEATHER_DIRECTIONS` 외 모두 db_schema_vN / api_spec_vN 와 1:1 일치 검증 완료. |
| `src/types/anomaly.ts` 의 `model_type: ModelType \| 'TECM'` (line 222) | api_spec_vN §`/stat-snapshot?metric=asymmetry` 응답 예시 `"model_type": "TECM"` 직접 인용. db_schema_vN.asymmetry_results.model_type 은 `'TECM' \| 'asymmetric_VAR'` 이며 ModelType (`'VAR' \| 'VECM'`) 과 다른 도메인. **유지**. (별건 — frame_spec_frontend_vN §6.2 의 model_type 행에 `asymmetry_results.model_type` 추가 요청 §9 6번) |
| Fixture 4종 데이터 | db_schema_vN §초기 데이터 표와 1:1 일치 검증 완료. `commodity_id` 표기 (`maize`/`groundnuts`) 는 db_schema 기준 → 정확. |

---

## 8. 리스크 및 오픈 이슈

| 리스크 | 확률 | 영향 | 완화책 |
|---|---|---|---|
| §3.1 Step 1 루트 `CLAUDE.md` 신규 생성 시 `frame_spec_backend_vN §8` 골격을 그대로 복사하면 백엔드 영역(§13 배치, §15 `from None` 금지 등)이 그대로 남을 가능성 | 중 | 중 | Sonnet 은 `frame_spec_backend_vN §8` 을 **구조 가이드** 로만 사용하고 §3.1 Step 1 의 영역별 치환 가이드를 항목별로 적용. 작성 후 `rg "FastAPI\|alembic\|asyncpg\|APScheduler\|Pydantic" CLAUDE.md` 결과 0건 확인 (백엔드 잔재 검증). |
| §3.1 Step 2 `CLAUDE_backend.md` 삭제 시점이 너무 빨라서 §3.1 Step 1 작성 중 참고 자료가 사라질 가능성 | 낮음 | 낮음 | Phase 1 의 작업 순서를 **§3.1 Step 1 → §3.2 → §3.1 Step 2 → §3.3** 로 명시 (§6 Phase 1). Step 2 는 신규 `CLAUDE.md` 작성 + 사본 동기화가 모두 끝난 뒤에 수행. |
| §3.2 옵션 A 채택 시 `docs/CLAUDE.md` 의 백엔드 historical 정보 손실 | 낮음 | 낮음 | 백엔드 컨텍스트는 백엔드 repo 측에서 자체적으로 운용하며 (그쪽도 본 PM 결정으로 폐기 진행 중), 본 frontend repo 에는 더 이상 보존 의무 없음. |
| §3.3 README 표의 외부 링크 (`docs/api_spec_v5.md` 등) 가 manifest §1 갱신 시점마다 함께 갱신되어야 함 | 중 | 낮음 | §3.3 수정 시 표 헤더 위에 "manifest §1 현재 버전 시점 스냅샷" 주석 추가 필수. 향후 PR 리뷰 체크리스트에 본 표 동기화 항목 추가 (§9 8번 PM 별건). |
| §3.4 의 Header 자리표시자 변경이 향후 `feat/fe-layout-filter` 의 활성 탭 인덱스 매핑과 충돌 | 낮음 | 낮음 | 매핑은 `viewTabs` 의 한국어 라벨이 아닌 Zustand `activeTab` (`'stream' \| 'scatter' \| 'raw-prices' \| 'methodology'`) 으로 이뤄지므로 본 변경 영향 없음. §3.4 주석에 매핑 명시. |
| §4.1 옵션 A 채택 후 feat 명세 작성 시점에 다시 갱신 필요 | 중 | 낮음 | 본 작업은 **2회 갱신** (일괄 회귀 → feat 명세 작성 시 재참조) 을 전제로 한다. feat/fe-layout-filter PM 명세 승인(§기능 명세 작성 순서표 우선순위 2) 시점에 별도 PR 로 갱신. |
| §5.4 옵션 B 임시 적용 후 PM 옵션 A 결정 시 후속 PR 필요 | 중 | 낮음 | 본 항목은 PM 결정 대기 명시. 옵션 A 결정 시 1줄 변경 PR. |

---

## 9. PM 별건 요청 사항 (본 플랜 범위 외, 추후 처리)

1. **`frame_spec_frontend_v4.md §10 PR 템플릿` 의 hardcoded `frame_spec_frontend_v3.md` 정정** — 템플릿 본문(`docs/frame_spec_frontend_v3.md`) 이 manifest §1 의 현재 버전 (v4) 와 불일치. 템플릿을 `frame_spec_frontend_vN.md` 로 정정 또는 sub-bump.
2. **`feature_spec_FE-LAY_vN`·`feature_spec_FE-PANEL_vN` PM 명세 작성 시 manifest §1 등록** — feature_dev_list_vN §기능 명세 작성 순서표 우선순위 2 (S3 시작 전 04.28) / 우선순위 4 (S4 시작 전 05.12) 일정에 맞춰. 등록 후 §4.1 의 코드 참조를 갱신 PR.
3. **`api_spec_vN` 의 `model` 파라미터 값 표기 통일** — api_spec_v5 §ml-map (line 893) 은 `'isolation_forest' | 'lof' | 'ocsvm'` 로 명시하나, `plan_backend_alignment_v1.md §4.2` (line 252~253) 는 `'oneclass_svm'` 으로 표기. 백엔드 Literal 구현 시 어떤 표기를 쓸지 PM 확정 (현 프론트 `MlModel` 은 api_spec 표기인 `'ocsvm'` 채택).
4. **§4.3 Mock 인터셉터 패턴 검토** — `feat/fe-api-connect` 진입 시점에 msw 도입 여부 재검토. Frame 단계에서는 도입하지 않음 (§8.1).
5. **§5.4 `ROCKET_FEATHER_DIRECTIONS` 의 `'symmetric'` 값 PM 결정** — 옵션 A (제거) / 옵션 B (보존 + 프론트 도메인 명시) 결정. 결정 후 별도 PR.
6. **`frame_spec_frontend_vN §6.2` 3방향 타입 일치 표 보강** — `asymmetry_results.model_type` (`'TECM' \| 'asymmetric_VAR'`) 행 추가. 현재 표는 `model_params.model_type` (`'VAR' \| 'VECM'`) 만 명시. (§7 표 참고)
7. ~~**`CLAUDE_backend.md §10` 의 `commodity_id` 표기 (`corn`, `peanut`) vs db_schema_vN §commodities (`maize`, `groundnuts`) 불일치**~~ — **해소**: 백엔드 repo 측에서 `CLAUDE.md` (=현 `CLAUDE_backend.md`) 폐기 결정 (2026-05-07). 본 frontend repo 도 §3.1 Step 2 에서 사본 삭제 → 더 이상 cross-reference 출처 자체가 사라짐. 본 항목은 별건 추적 종료. (참고: 백엔드 측 `db_schema_vN` 이 정통 SoT 이며 `maize`/`groundnuts` 가 정답.)
8. **`README.md` 참조 문서 표 동기화 절차 수립** — manifest §1 버전 갱신 시 README 표도 함께 갱신하는 규칙을 manifest §2.3 또는 README 표 헤더 주석에 명시.
9. **`api_spec_vN §방법론 엔드포인트` 응답 예시의 `version: "v8"` 표현** — `plan_backend_alignment_v1.md §3.3` 와 동일 이슈. 프론트는 `meta.ts` 에서 `version: string` 으로 받아 그대로 보관하므로 본 repo 에는 영향 없으나, 사용자가 방법론 탭에서 본 값을 표시할 경우 (web_plan_vN §8) 백엔드의 옵션 B 채택 후 응답이 `'v10'` 등으로 갱신되어야 일관됨.

---

## 10. 변경 이력

- v1 (2026-05-07): 최초 작성. `docs/docs_manifest.md` v1 기반 프론트엔드 코드 감사 결과를 Sonnet 실행용 플랜으로 정리. P0 0건 / P1 4건 / P2 3건 / P3 5 파일 12 occurrences. `plan_backend_alignment_v1.md` 양식 참고.
- v1.1 (2026-05-07): PM 결정 반영. 백엔드 repo 측 `CLAUDE.md` 폐기 결정에 따라 §3.1 을 2단계 작업(루트 `CLAUDE.md` 신규 생성 + 루트 `CLAUDE_backend.md` 삭제)으로 확장. §9 7번(`commodity_id` 표기 불일치 별건) 종결 처리. `CLAUDE_frontend.md` 신규 생성안은 폐기 (단일 `CLAUDE.md` 운용 결정).

---

*본 플랜 실행 후, Sonnet 은 `docs/docs_manifest.md` §6 변경 이력에 본 플랜 실행 완료 기록 1줄 추가를 요청한다 (별도 플랜 PR 커밋 메시지로 대체 가능).*

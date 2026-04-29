# 가격렌즈 — 소비자 물가 이상 탐지 프론트엔드

2026-1 선문대학교 종합프로젝트 11분반 1팀
계량경제학 + 머신러닝 기반 국내 소비자 물가 이상 탐지 웹 서비스 — **프론트엔드 repo**

---

## 프로젝트 소개

밀, 설탕 등 10개 식품 품목에 대해 **국제가 → 수입단가 → PPI → (도매가) → CPI** 가격 전달 체인의 이상을 탐지하고 시각화하는 웹 서비스입니다.
이 repo는 백엔드 FastAPI에서 분석 결과를 받아 **D3.js로 렌더링하는 React 프론트엔드**입니다.

> **현재 단계: `frame/frontend`** — 레이아웃·타입·API 클라이언트·자리 표시자만 구현. D3 차트, 분석 패널 수치, 미니맵 등 실제 시각화는 `feat/fe-*` 후속 브랜치에서 단계별로 구현됩니다 (`docs/frame_spec_frontend_v3.md §8.6` 참조).

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Node.js | 20.11.1 |
| React | 18.3.1 |
| TypeScript | 5.4.5 |
| Vite | 5.2.11 |
| D3.js | 7.9.0 |
| Zustand | 4.5.2 |
| React Router | 6.23.0 |
| Axios | 1.6.8 |
| TanStack Query | 5.32.0 |
| Tailwind CSS | 3.4.3 |
| Vitest | 1.6.0 |

> 모든 패키지는 `package.json`에 정확한 버전으로 고정되어 있습니다 (버전 범위 연산자 `^`, `~` 사용 금지).

---

## 로컬 실행 방법

### 1. Node.js 버전 확인

```bash
node -v  # v20.11.1 이어야 합니다
```

nvm을 사용하는 경우:

```bash
nvm use  # .nvmrc의 20.11.1 자동 적용
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일의 기본값:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK=true
VITE_APP_TITLE=가격 전달 이상 탐지
```

> `VITE_USE_MOCK=true` 상태에서는 백엔드 없이 `src/fixtures/` 정적 데이터로 동작합니다.

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:5173 접속
```

---

## 주요 npm 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | 개발 서버 실행 (포트 5173) |
| `npm run build` | 프로덕션 빌드 (TypeScript strict 컴파일 + Vite 번들) |
| `npm run preview` | 빌드 결과물 미리보기 |
| `npm run test` | smoke test 실행 (Vitest) |
| `npm run test:watch` | 테스트 watch 모드 |
| `npm run lint` | ESLint 검사 (`--max-warnings 0`) |
| `npm run format` | Prettier 자동 포맷 |
| `npm run format:check` | Prettier 포맷 검증 |

### Frame 단계 통과 기준

PR 제출 전 아래 모두 성공해야 합니다 (`docs/frame_spec_frontend_v3.md §1`):

```bash
npm run build         # 오류 0건
npm run lint          # 경고 0건
npm run format:check  # 위반 0건
npm run test          # smoke test 3건 통과
```

---

## 디렉토리 구조

```
price-transmission-frontend/
├── public/                  # 정적 자원 (favicon 등)
├── src/
│   ├── api/                 # Axios 클라이언트 + 엔드포인트 상수 + 에러 파서
│   ├── components/
│   │   ├── layout/          # AppShell · Header · FilterBar · Panel
│   │   └── charts/          # (feat/fe-*에서 D3 차트 추가)
│   ├── fixtures/            # Mock 응답 JSON (VITE_USE_MOCK=true 전용)
│   ├── pages/               # MainPage 등
│   ├── router/              # React Router v6 설정
│   ├── services/            # (feat/fe-*에서 데이터 변환 로직 추가)
│   ├── stores/              # Zustand 전역 스토어
│   ├── types/               # TypeScript 타입 (API 응답과 1:1 대응, snake_case 유지)
│   ├── App.tsx              # 최상위 컴포넌트
│   ├── main.tsx             # Vite 진입점
│   └── index.css            # Tailwind import
├── tests/
│   ├── setup.ts             # Vitest 환경 설정
│   └── frame_smoke.test.ts  # frame 단계 smoke test 3건
├── docs/                    # 명세서 사본 (읽기 전용)
├── CLAUDE.md                # AI 컨텍스트 기준 파일
└── README.md                # 이 파일
```

---

## 분석 대상 품목

| 품목 | 경로 유형 |
|------|-----------|
| 밀 · 옥수수 · 대두 · 팜유 · 설탕 · 커피 · 소고기 | 3구간 (A → B → D′) |
| 땅콩 · 바나나 · 오렌지 | 4구간 (A → B → C → D) |

---

## API 연동

- **Base URL**: `/api/v1` (총 18개 GET 엔드포인트)
- **날짜 형식**: API 요청·응답 모두 `YYYY-MM` 문자열 그대로 사용
- **필드명**: API 응답의 `snake_case` 키를 변환 없이 그대로 TypeScript 타입에 매핑
- **인증**: 없음 (1차 출시 기준)

상세 명세: `docs/api_spec_v4.md`

---

## 참조 문서 (`docs/`)

| 파일 | 내용 |
|------|------|
| `frame_spec_frontend_v3.md` | 프론트엔드 Frame 명세 (구현 기준) |
| `web_plan_v6.md` | UI/UX 웹 플랜 |
| `api_spec_v4.md` | API 명세 18개 엔드포인트 |
| `db_schema_v3.md` | DB 스키마 (필드명·Literal 값 출처) |
| `exception_spec_v4.md` | 예외 코드 명세 |
| `pipeline_output_spec_v5.md` | 파이프라인 출력 명세 |
| `doc1_technical_pipeline_v9.md` | 파이프라인 기술 명세 |
| `doc3_research_proposal_v11.md` | 연구 제안서 |
| `sprint_plan.md` | 스프린트 일정 |
| `CLAUDE.md` | AI 컨텍스트 기준 파일 사본 |

---

## 브랜치 전략

```
main
└── develop
    └── frame/frontend   ← 이 브랜치 (프레임 단계, S1 후반)
        ├── feat/fe-layout-filter   (S3)
        ├── feat/fe-stream-chart    (S3)
        ├── feat/fe-minimap         (S3)
        ├── feat/fe-panel           (S4)
        ├── feat/fe-scatter-chart   (S4)
        ├── feat/fe-raw-timeseries  (S4)
        ├── feat/fe-methodology-tab (S5)
        ├── feat/fe-onboarding      (S5)
        └── feat/fe-api-connect     (S6)
```

`feat/fe-*` 브랜치는 PM 승인 후 `frame/frontend`에서 분기합니다 (`docs/sprint_plan.md`).

---

## 팀

| 역할 | 이름 |
|------|------|
| 프론트엔드 리드 | 하대수 |
| PM | 최수안 |
| 백엔드 리드 | 바게스타니 샤킬라 |

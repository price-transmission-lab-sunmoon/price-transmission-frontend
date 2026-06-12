# 사람 스타일 헌장 (리팩토링 SoT)

목표: 이 코드를 학부생~초급 개발자가 직접 작성한 것처럼 보이게 한다. **동작은 절대 불변.**
import/export, 함수 시그니처, JSX 구조, 상태 로직, 네이밍, 전역 포맷 규칙은 손대지 않는다.
변경 범위 = 주석 + 미세한 코드 구조 완화뿐.

## 1. 주석 규칙

**톤: 간단 명료, 객관적 서술.** 정중한 설명체, 장식, 이모지, 메타 정보(누가·언제·왜 결정) 금지.
**밀도: 현재의 절반.** 까다로운 로직(D3 줌, 디바운스, 에러 체인, 3D)에만 한두 줄. 자명한 코드엔 주석 없음.

### 전량 삭제
- 이슈태그 주석: `// IS-6:`, `// BE-4:`, `// P1-3:`, `// P2-4:`, `// ZOOM-1:` 등 코드명 태그. 태그 뒤 내용이 여전히 유효하고 비자명하면 태그만 떼고 간결화.
- spec 문서 참조: `feature_spec_..._vN §4.1 SoT`, `frame_spec_frontend_vN §6.4 정합`, `exception_design_vN §2.1`, `rev.6 spec`, `(2026-05-21 확정)` 류 전부.
- 파일 헤더의 "변경 이력" 블록 전체.
- `@example` 블록, 함수 한 줄짜리에 붙은 JSDoc 전체 블록.
- 함수명·코드와 중복되는 당연한 설명 (`// 요청 인터셉터: ...` 등).
- 결정 사유 서사 주석 (`// 자동 anomaly 선택 + 패널 자동 열림 폐기 (2026-05-21). 사용자 클릭 없이...` → 삭제하거나 한 줄 요약).

### 완화 (삭제 아님)
- 장식 구분선 `// ─── 메인 셋업 useEffect ───────`, `// ====...` → 대부분 삭제. 250줄 이상 파일에서 구역 구분이 정말 필요한 곳만 짧은 `// 섹션명` 한 줄로 대체 (파일당 최대 2~3개).
- JSDoc 블록 → 꼭 필요한 정보만 남긴 1~2줄 일반 주석으로 축약.

### Before/After 예시 (이 톤을 그대로 따를 것)

예시 1 — 이슈태그+스펙 참조 헤더:
```ts
// before
// 예외처리 설계 문서(exception_design_vN) §2.1 + frame_spec_frontend_vN §6.4 정합
// feature_spec_fe-api-connect_vN §4.1 §4.4 §4.5 SoT (v4 정정 반영)
//
// 변경 이력:
//   IS-6: FEError constructor에서 cause 직접 파라미터 제거 → context.cause 보관 패턴으로 전환
//   IS-9: parseApiError 시그니처 → (axiosError: unknown) 단일 인자

// after (전부 삭제, 파일 첫 줄은 import부터 시작)
```

예시 2 — 과잉 JSDoc:
```ts
// before
/**
 * 프론트엔드 공통 에러 베이스 클래스 (exception_spec_vN §부록 A + frame_spec_frontend_vN §6.4).
 *
 * IS-6: `cause`는 ES2022 Error.cause로 전달하지 않는다.
 * 원인 에러를 보존해야 할 때 `context.cause` 필드로 명시 보관한다.
 * → traceErrorChain 이 FEError.context.cause 를 우선 탐색.
 *
 * @example
 *   throw new FEError('FE-D3-001', '데이터 빈 배열', { cause: originalErr, chart_type: 'stream' });
 */

// after
// 공통 에러 베이스. 원인 에러는 context.cause에 보관한다.
```

예시 3 — 장식 구분선:
```ts
// before
// ─── 메인 셋업 useEffect ──────────────────────────────

// after (그냥 삭제. 정말 필요하면)
// 차트 셋업
```

예시 4 — 결정 서사:
```ts
// before
// 자동 anomaly 선택 + 패널 자동 열림 폐기 (2026-05-21).
// 사용자 클릭 없이 패널이 열리면 차트 가림 + 매번 같은 노드 강제 강조.

// after (삭제. 코드가 없는데 "폐기했다"는 주석은 사람이 안 남김)
```

예시 5 — 태그만 떼고 간결화 (내용이 비자명한 경우):
```ts
// before
// ZOOM-1: 외부 filter 동기화용 보존

// after
// 외부 필터 동기화에 쓰는 줌 상태
```

예시 6 — 유지 가치 있는 방어 패턴 설명 (간결화해서 유지):
```ts
// before
// ResizeObserver 첫 fire 전 0크기 진입 차단 — 2회 setup 방지.
if (containerSize.w === 0 || containerSize.h === 0) return;

// after
// 컨테이너 크기 잡히기 전이면 그리지 않는다
if (containerSize.w === 0 || containerSize.h === 0) return;
```

예시 7 — CLAUDE.md 참조 주석 (내용 보존, 출처 제거):
```ts
// before
// CLAUDE.md §StreamChart 방어 패턴: 컨테이너 div는 항상 outermost로 마운트

// after
// 컨테이너 div를 조건부로 마운트하면 ResizeObserver가 발화하지 않아 차트가 안 그려진다
```

## 2. 구조 완화 규칙
- `x === null || x === undefined` → `x == null` 로 축약. **`!x` 변환 금지** (0/'' 의미가 달라짐).
- 한 곳(또는 두 곳)에서만 쓰는 모듈 상수는 사용처에 인라인. 예: `const CLIP_ID = 'stream-chart-clip'`이 1회 사용이면 문자열 직접 사용. 다회 사용 상수(MARGIN 등)는 유지.
- 모듈 내 한 번만 쓰는 로컬 타입/인터페이스는 인라인화 가능 (확신 없으면 유지).
- 명백한 복붙 반복 구조는 미세 변주 허용 (예: 비슷한 세 블록 중 하나는 다른 형태로). 확신 없으면 그대로 둔다.
- **적용 기준: 보수적으로.** 동작이 1%라도 의심되면 손대지 않는다. 주석 정리가 주 임무, 구조 완화는 부 임무.

## 3. 사람 흔적 (할당된 파일에만)
- 배치 지시에 "TODO 주입: <파일명>"이 명시된 경우에만 해당 파일에 TODO 1개 주입. 톤은 객관 서술: `// TODO: 리사이즈 시 깜빡임 개선 필요`, `// TODO: 품목 늘어나면 여기 정리`.
- 관용구 편차는 자연스럽게: 이미 있는 코드의 스타일을 억지로 통일하지 말 것 (비일관 발견 시 그대로 둔다).

## 4. 금지 규칙 (어기면 빌드·린트 실패)
1. non-null assertion(`!.`) 추가 금지. optional chaining 유지.
2. `!x` 축약 금지 (위 참조). `== null`만 허용.
3. 새 중간 변수 도입 금지 (`noUnusedLocals` 에러남). 안 쓰는 파라미터는 `_` prefix.
4. `as any` 추가 금지 (lint `--max-warnings 0`).
5. switch 각 case에 break/return 유지 (`noFallthroughCasesInSwitch`).
6. 훅 호출 순서·위치 변경 금지. early return을 훅 호출 위로 올리지 말 것.
7. Prettier 규칙 준수: printWidth 100, singleQuote, trailingComma all, semi true. 주석을 합치거나 나눌 때 100자 초과 금지.
8. import/export, 함수 시그니처, JSX 구조, 상태 로직, 파일명, 식별자 이름 변경 금지.
9. 한국어 주석의 ' — '(em dash)·'·'(middle dot) 남용 금지. 쉼표와 조사로 쓴다.
10. 차트 파일(StreamChart, Minimap, ScatterChart, RawPricesChart)의 가드·순서·d3 호출은 절대 건드리지 않는다 (주석만 정리).

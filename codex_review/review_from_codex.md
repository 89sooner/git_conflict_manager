# Review From Codex

작성일: 2026-04-14

## 1. 검토 범위

현재 워크트리의 변경은 Phase 5 `web shell` 완성 범위에 집중되어 있다.

- `apps/web` 라우트/셸/상태 컴포넌트
- `apps/web/lib/api/*`, `apps/web/lib/auth/*`, `apps/web/lib/navigation.ts`
- `packages/shared-types/src/index.ts`
- `packages/config/src/index.ts`
- `apps/api/src/plugins/auth.ts`
- `README.md`, `docs/05-decisions/adr-0001-web-data-fetching-strategy.md`
- `plans/05_task_board.md`, `workflows/05_web_shell.md`

검토 기준 문서:

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `plans/01_phase_order.md`
- `workflows/00_read_context.md`
- `workflows/05_web_shell.md`
- `docs/04-frontend/frontend_badge_action_mapping.md`

## 2. 실행 검증

실행한 명령:

- `pnpm --filter @gsp/web test`
- `pnpm --filter @gsp/web build`
- `pnpm --filter @gsp/web typecheck`
- `pnpm --filter @gsp/contract-tests test -- web-api-envelope`

결과 요약:

- `@gsp/web test`: 통과, `3` files / `16` tests
- `@gsp/web build`: 통과
- `@gsp/contract-tests test -- web-api-envelope`: 통과, 전체 `9` files / `42` tests
- `@gsp/web typecheck`: 순차 실행 기준 통과

주의:

- `@gsp/web typecheck`는 병렬 검증 중 한 차례 실패했다.
- 실패 원인은 `apps/web/tsconfig.json`이 `.next/types/**/*.ts`를 직접 include 하고 있어서, `.next` 산출물이 없는 시점 또는 build/typecheck 동시 실행 시 파일 부재 오류가 날 수 있기 때문이다.
- 즉, “최종 상태에서 타입 오류”는 아니지만 “타입체크가 clean/병렬 환경에서 불안정”하다는 의미다.

## 3. 통합 평가

현재 변경은 기존 구현과 **대체로 잘 통합될 수 있는 상태**다.

긍정적인 점:

- Phase 5 workflow가 요구한 라우트 추가, 공통 상태 컴포넌트, typed API client, dev auth gate, AppShell 활성 내비게이션이 모두 들어가 있다.
- `apps/web/lib/auth/session.ts`와 `apps/api/src/plugins/auth.ts`가 `@gsp/shared-types`의 공통 상수(`BOOTSTRAP_DEV_USER`, `DEV_USER_HEADER`, `DEV_USER_BOOTSTRAP_TOKEN`)를 공유하도록 정리되어, 이전에 우려되던 dev identity drift는 해소되었다.
- `AppShell`은 `usePathname()` 기반 활성 표시를 분리된 helper(`apps/web/lib/navigation.ts`)로 캡슐화했고, 테스트도 존재한다.
- `README`, ADR, workflow, task board까지 같이 갱신되어 문서 정합성은 비교적 좋다.

다만 현재 상태는 “병합 가능 후보”이지 “하드닝 완료” 상태는 아니다.

핵심 이유:

- `typecheck`가 `.next/types` 생성 상태에 의존해 재현성이 약하다.
- `lint`가 실제 검증을 하지 않는다.
- `apps/web/AGENTS.md`가 요구하는 component/page test, snapshot/story 수준까지는 도달하지 못했다.
- 홈 대시보드는 여전히 정적 데모 데이터라 실제 read model과 동기화되지 않는다.

## 4. 주요 발견 사항

### F1. `typecheck`가 clean/병렬 환경에서 불안정하다

근거:

- `apps/web/tsconfig.json:20-27`에서 `.next/types/**/*.ts`를 직접 include 한다.
- `apps/web/package.json:8`의 `typecheck`는 단순 `tsc -p tsconfig.json --noEmit`라서, `.next/types`가 없으면 실패할 수 있다.
- 실제 검증 중 build와 typecheck를 병렬로 돌렸을 때 `.next/types/app/...` missing 오류가 발생했다.

영향:

- CI나 로컬에서 명령 실행 순서에 따라 false negative가 발생할 수 있다.
- clean checkout 직후 `typecheck`만 단독 실행하는 워크플로우가 깨질 수 있다.

판정:

- 현재 가장 중요한 통합 리스크다.
- 기능 버그라기보다 “검증 파이프라인 불안정” 문제다.

### F2. `lint`가 no-op 이라 회귀 방지 역할을 못 한다

근거:

- `apps/web/package.json:7`의 `lint`는 `echo 'lint web'`뿐이다.

영향:

- import 정리, unused code, Next/React 규칙 위반, 접근성 경고를 전혀 잡지 못한다.
- `apps/web/AGENTS.md`의 필수 체크와 실제 저장소 상태가 어긋난다.

판정:

- merge blocker까지는 아니지만, 현재 규모부터는 바로 정비해야 할 운영 리스크다.

### F3. UI 검증이 helper 수준에 치우쳐 있다

근거:

- web 테스트는 현재 `apps/web/lib/__tests__/navigation.test.ts`, `apps/web/lib/api/__tests__/client.test.ts`, `apps/web/lib/api/__tests__/errors.test.ts` 중심이다.
- `apps/web/AGENTS.md:15-20`은 component test 또는 page test, 상태 배지/액션 패널 snapshot 또는 story를 요구한다.
- `AppShell`, `StatusBadge`, `ErrorState`, `EmptyState`, 라우트 페이지 자체에 대한 렌더링 테스트는 없다.

영향:

- 현재 변경처럼 UI 셸이 커질수록 화면 회귀를 build/test만으로 잡기 어렵다.
- navigation active state, 인증 사용자 표시, error/empty state 렌더링, route placeholder 문구 같은 핵심 UX가 미검증 상태다.

판정:

- 기능 동작은 되지만, 유지보수 안전성은 아직 낮다.

### F4. 홈 대시보드는 Phase 4 read model 위에 올라가 있지 않다

근거:

- `apps/web/app/page.tsx:21-126`은 전부 정적 값으로 렌더링한다.
- 반면 `/repositories`, `/pulls`는 typed API client로 실제 데이터를 읽는다.

영향:

- 첫 화면의 수치와 상태가 실제 시스템 상태와 쉽게 어긋날 수 있다.
- 사용자가 “실제 대시보드”로 받아들이면 오해할 수 있다.

판정:

- Phase 5 데모 셸로는 허용 가능하다.
- 다만 Phase 6 이후에도 유지되면 UX debt가 된다.

### F5. `apiFetch`의 query 타입이 아직 느슨하다

근거:

- `apps/web/lib/api/client.ts:4-5`에 `QueryParams`가 정의돼 있지만,
- `ApiFetchOptions.query`는 `object`로 선언돼 있다 (`apps/web/lib/api/client.ts:17-20`).

영향:

- 호출자가 배열, 중첩 객체, 예상하지 않은 값을 넘겨도 `String(value)`로 직렬화된다.
- 현재 호출부는 안전하지만, 이후 필터/정렬 파라미터가 늘어나면 URL 직렬화 드리프트가 생길 수 있다.

판정:

- 지금 당장 깨지는 문제는 아니지만, Phase 6의 필터/정렬 UI 전에 다듬는 편이 좋다.

## 5. 최적화 계획

### P0. 바로 정리할 항목

#### 1. `typecheck` 재현성 고정

목표:

- clean checkout, CI, 병렬 실행 환경에서 `pnpm --filter @gsp/web typecheck`가 안정적으로 돌아가게 만든다.

권장 작업:

1. `apps/web/package.json`의 `typecheck`를 `next typegen && tsc -p tsconfig.json --noEmit` 형태로 바꾸거나,
2. `.next/types/**/*.ts` 의존을 없애고, 필요 타입만 명시적으로 생성/포함하는 구조로 바꾼다.
3. CI에서 `build` 없이 `typecheck`만 먼저 실행해도 통과하는지 확인한다.

완료 기준:

- `.next`가 없는 상태에서도 `typecheck`가 결정적으로 통과한다.
- build와 typecheck를 별도 step으로 나눠도 flake가 없다.

#### 2. 실제 lint 도입

목표:

- web 패키지의 최소 정적 품질 게이트를 복구한다.

권장 작업:

1. Next/TypeScript 기준 ESLint 설정 추가
2. `apps/web/package.json`의 `lint`를 실제 검사 명령으로 교체
3. 최소한 unused import, invalid Link usage, accessibility basics를 검사

완료 기준:

- `pnpm --filter @gsp/web lint`가 실제 검사 결과를 반환한다.

#### 3. 최소 UI 테스트 추가

목표:

- 현재 셸/상태 컴포넌트의 회귀를 빌드 외 경로로 잡는다.

우선 대상:

1. `AppShell`
   - 활성 nav에 `aria-current="page"`가 붙는지
   - `user` prop 유무에 따라 사용자 표시/미인증 표시가 바뀌는지
2. `ErrorState`
   - `ApiClientError`와 일반 Error 정규화 결과가 올바른지
3. `StatusBadge`
   - tone/label 렌더링
4. `/repositories`, `/pulls`
   - empty/error/success 한 케이스씩 smoke test

완료 기준:

- `apps/web/AGENTS.md`의 component/page test 요구를 최소 수준에서 충족한다.

### P1. Phase 6 진입 전에 하면 좋은 항목

#### 4. 홈 대시보드의 정적 카드/패널을 명시적 placeholder 또는 실제 데이터로 전환

선택지:

1. 지금 단계에서 명시적으로 “demo shell” 문구를 추가해 오해를 막는다.
2. 또는 실제 read model 기반 요약 API를 연결해 숫자를 진짜 값으로 교체한다.

권장:

- Phase 6 직전까지는 1번으로 정리하고,
- PR/위험도 summary endpoint가 생기면 2번으로 전환한다.

#### 5. 페이지 공통 패턴 추출

현재 중복:

- `Header`
- `BackLink`
- list card wrapper
- error/empty 분기

권장 작업:

- `PageHeader`, `BackLink`, `EntityListCard`, `DataStateBoundary` 같은 공통 컴포넌트/헬퍼를 추가해 route 간 drift를 줄인다.

효과:

- `/repositories`, `/pulls`, `/conflicts`, `/backouts` 확장 시 중복이 줄고 스타일/행동 일관성이 유지된다.

#### 6. `apiFetch` query 타입 강화

권장 작업:

1. `ApiFetchOptions.query`를 `QueryParams`로 교체
2. 배열/중첩 객체 허용 여부를 명시적으로 결정
3. 필터/정렬이 늘어날 Phase 6 전에 serialization policy를 고정

효과:

- URL 생성 규칙이 타입 수준에서 더 분명해진다.

### P2. 하드닝 관점의 후속 항목

#### 7. 상태 컴포넌트 snapshot/story 추가

대상:

- `StatusBadge`
- `EmptyState`
- `ErrorState`
- `ListSkeleton`
- `DetailSkeleton`

효과:

- 디자인 드리프트와 문구 회귀를 더 빠르게 잡을 수 있다.

#### 8. fetch/cache 정책 재평가

현재:

- `apiFetch`는 기본 `cache: 'no-store'`를 사용한다 (`apps/web/lib/api/client.ts:69-74`).

후속 검토:

- read-heavy 화면에서는 `revalidate`, `tagged fetch`, route-level caching이 더 적합할 수 있다.
- 다만 이는 Phase 6 이후 실제 데이터 사용 패턴을 본 뒤 결정하는 편이 맞다.

## 6. 권장 실행 순서

가장 현실적인 순서는 아래와 같다.

1. `typecheck` 안정화 (`.next/types` 의존 제거 또는 생성 절차 고정)
2. 실제 lint 도입
3. `AppShell` / 상태 컴포넌트 / 페이지 smoke test 추가
4. 홈 대시보드의 demo 성격 명시 또는 실제 데이터 연결
5. 페이지 공통 패턴 추출
6. query typing 강화

## 7. 최종 결론

현재 changes는 **기존 구현과 구조적으로는 잘 통합되고 있으며, Phase 5 web shell 결과물로는 충분히 의미 있는 진전**이다.

특히 다음은 긍정적이다.

- dev auth alignment가 shared-types 중심으로 정리됨
- AppShell 활성 내비게이션과 user display가 구현됨
- typed API client와 read-model 라우트가 연결됨
- ADR, README, workflow, task board까지 같이 갱신됨
- build/test/contract가 현재 상태에서 통과함

하지만 바로 손봐야 하는 운영 리스크도 분명하다.

- `typecheck`의 `.next/types` 의존성
- no-op `lint`
- UI 테스트 부족

따라서 권장 판단은 다음과 같다.

- **통합 가능**: 예
- **즉시 최적화 필요**: 예
- **우선순위 1순위**: 타입체크 재현성 안정화, 실제 lint 도입, 최소 UI 테스트 추가

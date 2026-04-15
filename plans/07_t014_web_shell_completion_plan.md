# 07 · T-014 Web Shell Completion Plan (Phase 5)

## 0. 메타

- 작업 ID: T-014
- Phase: 5 (웹 셸 구축)
- Workflow: `workflows/05_web_shell.md` (이번 작업으로 신규 작성)
- Owner: claude
- 작성일: 2026-04-14
- 선행 작업: T-010 (web shell scaffold), T-012 (read model API), T-013 (Codex review fixes)
- 후속 작업: T-015 (Phase 6 — PR 핵심 기능 UI/API 연결)

## 1. 배경

T-010, T-013에서 `apps/web`에 Tailwind 기반 `AppShell`/`StatusBadge`/`ListPanel`/`MetricCard`와 데모 대시보드 `/`를 도입했고, T-012에서 백엔드 read model 라우트(`/api/v1/repositories`, `/branches`, `/pull-requests`)를 stub 구현했다.

그러나 다음 갭으로 인해 `plans/01_phase_order.md` §5 Phase 5 DoD가 충족되지 않는다.

1. `apps/web/app`에 `/`만 존재. T-013이 추가한 CTA 링크(`/pulls`, `/backouts`)가 전부 404.
2. 웹은 아직 API를 호출하지 않는다. 대시보드는 하드코딩된 카운터/항목으로만 채워져 있다.
3. dev/SSO 무관하게 auth 진입 흐름이 정의되지 않았다. API의 `x-gsp-dev-user: bootstrap` 헤더가 web에서 자동으로 주입되지 않는다.
4. `frontend_badge_action_mapping.md` §15가 요구하는 Empty / Loading / Error 공통 컴포넌트가 없다.
5. `workflows/04_read_model.md`, `workflows/05_web_shell.md` 워크플로 문서가 미작성 상태로 Phase 4·5 작업이 진행되었다.

T-014는 Phase 5의 모든 DoD를 충족시키고, Phase 6 PR 화면 작업이 의존하는 라우팅·데이터 수집·상태 컴포넌트의 토대를 만든다.

## 2. 목표

1. Next.js App Router 기준의 핵심 라우트(`/repositories`, `/repositories/[id]`, `/pulls`, `/conflicts`, `/backouts`)가 200으로 응답한다.
2. `/repositories`, `/pulls`가 실제로 백엔드 API를 호출하여 `EmptyState`를 렌더한다 (DB가 비어 있어도 정상 동작).
3. 백엔드 다운 시 `ErrorState`가 친화적 메시지 + 에러 코드 + retry 액션을 표시한다.
4. dev 모드에서 `x-gsp-dev-user: bootstrap` 헤더가 server-side fetch에 자동 주입되어 401이 발생하지 않는다.
5. AppShell 네비게이션이 신규 라우트 모두를 포함한다.
6. 새 contract test가 web API client envelope 처리 회귀를 잡는다.
7. workflows/04, 05와 ADR-0001이 함께 커밋되어 다음 작업이 동일 가이드를 따를 수 있다.

## 3. 비목표

- 실제 SSO/OIDC 통합 (Phase 10에서 처리). dev header만 hook 구조로 둔다.
- DB 연결 및 실데이터 시드. 백엔드는 빈 배열을 반환해도 충분하다.
- PR 상세 / Conflict 상세 / Backout 상세 화면의 실제 로직 (Phase 6~8 분담).
- React Query / SWR 도입. server component + 직접 fetch로 시작하고 상호작용이 필요해질 때 도입한다 (ADR-0001).
- 디자인 폴리싱, 다크모드, i18n.

## 4. 작업 분해

### 4.1 API client 레이어

경로: `apps/web/lib/api/`

- `client.ts`
  - `apiFetch<T>(path, init?)` 형태의 server-safe wrapper
  - base URL: `process.env.API_BASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'`
  - dev 헤더 자동 주입 (Node 환경에서 `process.env.GSP_DEV_USER` 존재 시)
  - 응답 본문이 ErrorEnvelope이면 `ApiClientError`를 throw
- `errors.ts`
  - `ApiClientError extends Error` (`code: ErrorCode`, `status`, `retryable`, `userAction?`)
  - `parseErrorEnvelope(unknown)` → `ApiClientError | null`
- `repositories.ts`
  - `listRepositories(params?)` → `RepositoryListResponse`
  - `getRepository(id)` → `RepositorySummaryResponse`
  - `listBranches(repositoryId, params?)` → `BranchListResponse`
- `pullRequests.ts`
  - `listPullRequests(params?)` → `PullRequestListResponse`
  - `getPullRequest(id)` → `PullRequestDetailResponse` (Phase 6에서 사용 시작)
- `index.ts` 바렐 export

산출물: ~5 파일, ~250 LOC

### 4.2 공통 상태 컴포넌트

경로: `apps/web/components/states/`

- `EmptyState.tsx` — props: `title`, `description`, `action?` (Slot), 배지 아이콘 옵션
- `ErrorState.tsx` — props: `error: ApiClientError | { code, message, retryable, userAction? }`, `onRetry?`. 코드/userAction/retry 버튼 노출
- `ListSkeleton.tsx` — skeleton row × 5 (Tailwind animate-pulse)
- `DetailSkeleton.tsx` — 요약 카드 + 우측 액션 placeholder

`frontend_badge_action_mapping.md` §15.1~15.3에 명시된 케이스 매핑.

산출물: 4 파일, ~180 LOC

### 4.3 라우트 추가 (Next.js App Router)

| Route | 파일 | 역할 |
|---|---|---|
| `/repositories` | `app/repositories/page.tsx` | server component, `listRepositories()` 호출, EmptyState/ErrorState fallback |
| `/repositories/[id]` | `app/repositories/[id]/page.tsx` | `getRepository(id)` + `listBranches(id)` 병렬 호출 |
| `/pulls` | `app/pulls/page.tsx` | `listPullRequests()` 호출, state/risk 필터 placeholder |
| `/pulls/[id]` | `app/pulls/[id]/page.tsx` | placeholder + EmptyState (Phase 6 자리) |
| `/conflicts` | `app/conflicts/page.tsx` | placeholder + EmptyState (Phase 7 자리) |
| `/backouts` | `app/backouts/page.tsx` | placeholder + EmptyState (Phase 8 자리) |

각 페이지는 `try { await ... } catch (e) { return <ErrorState .../> }` 패턴으로 일관 처리.

산출물: 6 파일, ~280 LOC

### 4.4 dev auth gate

- `apps/web/lib/auth/session.ts` — `getDevSession()` server-only helper. env `GSP_DEV_USER`가 'bootstrap'이면 dev session 반환, 아니면 null. SSO 통합 자리에 명시적 TODO 주석.
- `apiFetch`는 dev session이 있으면 헤더 자동 주입.
- `apps/web/app/layout.tsx`에서 dev session 조회 후 AppShell에 user prop 전달.

산출물: 1 신규 + 2 수정, ~80 LOC

### 4.5 AppShell 네비게이션 정합

- `packages/config/src/index.ts`의 `appConfig.navigation`에 다음 추가:
  - `{ key: 'dashboard', label: '홈', href: '/' }`
  - `{ key: 'repositories', label: '저장소', href: '/repositories' }`
  - `{ key: 'pulls', label: 'Pull Request', href: '/pulls' }`
  - `{ key: 'conflicts', label: '충돌', href: '/conflicts' }`
  - `{ key: 'backouts', label: 'Backout', href: '/backouts' }`
- `AppShell.tsx`가 `usePathname()`으로 현재 경로 highlight (client component 분리 필요)

산출물: 2 수정, ~60 LOC

### 4.6 테스트

| 종류 | 파일 | 목적 |
|---|---|---|
| Unit (web) | `apps/web/lib/api/__tests__/client.test.ts` | fetch mock으로 envelope 파싱, 헤더 주입, 에러 throw 검증 |
| Unit (web) | `apps/web/components/states/__tests__/ErrorState.test.tsx` | 에러 코드/retry 노출 검증 |
| Contract | `tests/contract/src/web-api-client.test.ts` | typed wrapper가 `RepositoryListResponse`/`PullRequestListResponse` 모양과 호환되는지 형식 검증 |

기존 contract 37 + api 22 회귀 0 유지. 신규 테스트 5~7건 추가 목표.

산출물: 3 파일, ~180 LOC

### 4.7 문서 / ADR / 작업 보드

- `workflows/04_read_model.md` — Phase 4 회고 + Phase 5의 진입 조건 명시
- `workflows/05_web_shell.md` — 이번 작업의 단계, DoD, Phase 6 진입 조건
- `docs/05-decisions/adr-0001-web-data-fetching-strategy.md`
  - 결정 1: server component + 직접 `fetch`로 시작, 상호작용 필요 시 React Query 도입
  - 결정 2: dev 모드는 `GSP_DEV_USER` env 헤더 주입, SSO는 Phase 10
  - 결정 3: `NEXT_PUBLIC_API_BASE_URL`와 `API_BASE_URL_INTERNAL` 분리로 SSR/CSR base URL 일치 보장
- `plans/05_task_board.md`에 T-014 행 추가
- `apps/web/README.md` 또는 루트 README의 dev 기동 절차 갱신

산출물: 4~5 파일

## 5. 파일 변경 요약 (예상)

신규 ~18 파일:
- `apps/web/lib/api/{client,errors,repositories,pullRequests,index}.ts`
- `apps/web/lib/auth/session.ts`
- `apps/web/components/states/{EmptyState,ErrorState,ListSkeleton,DetailSkeleton}.tsx`
- `apps/web/app/repositories/page.tsx`
- `apps/web/app/repositories/[id]/page.tsx`
- `apps/web/app/pulls/page.tsx`
- `apps/web/app/pulls/[id]/page.tsx`
- `apps/web/app/conflicts/page.tsx`
- `apps/web/app/backouts/page.tsx`
- `tests/contract/src/web-api-client.test.ts`
- `apps/web/lib/api/__tests__/client.test.ts`
- `apps/web/components/states/__tests__/ErrorState.test.tsx`
- `workflows/04_read_model.md`, `workflows/05_web_shell.md`
- `docs/05-decisions/adr-0001-web-data-fetching-strategy.md`

수정 ~7 파일:
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx` (CTA 링크 그대로, 데모 데이터는 유지하되 컴포넌트 정리)
- `apps/web/components/AppShell.tsx`
- `apps/web/package.json` (필요 시 `@testing-library/react` 추가)
- `packages/config/src/index.ts` (navigation entries)
- `plans/05_task_board.md`
- 루트 `README.md`

총 LOC 예상: ~900 (테스트 포함)

## 6. 검증 (Definition of Done)

1. `pnpm install` → `pnpm -r build` 성공
2. `pnpm --filter @gsp/api test` 22 tests 통과
3. `pnpm --filter @gsp/contract-tests test` 38+ tests 통과 (web-api-client 추가)
4. `pnpm --filter web test` 신규 web 단위 테스트 통과
5. `pnpm --filter web exec tsc --noEmit` 타입 에러 0
6. `pnpm --filter web build` (Next build) 성공
7. 로컬 수동 확인:
   - `pnpm --filter @gsp/api dev` + `pnpm --filter web dev`
   - `/`, `/repositories`, `/repositories/00000000-0000-0000-0000-000000000001`, `/pulls`, `/conflicts`, `/backouts` 모두 200 (200 + EmptyState 또는 정상 placeholder)
   - 백엔드 종료 시 모든 데이터 화면이 ErrorState 렌더
8. `plans/05_task_board.md` T-014 done
9. workflows/04, 05 + ADR-0001 커밋

## 7. 리스크 및 완화

| Risk | Mitigation |
|---|---|
| SSR fetch에서 base URL이 `localhost:4000`이라 컨테이너 환경에서 불일치 | `API_BASE_URL_INTERNAL` env 분리, 기본값을 dev 친화적으로 |
| Tailwind + Next.js 15 server component | T-013에서 검증됨 |
| `usePathname` 사용으로 AppShell이 client component가 되어 server-only API 호출이 layout으로 끌려가는 것 | AppShell을 client로 두고 layout/server에서 데이터를 props로 내려주는 패턴 |
| `@gsp/shared-types` 타입을 web에서 사용할 때 빌드 순서 | Turbo `dependsOn`/`tsc --build`로 이미 해결 |
| 빈 데이터 화면이 빈약해 보임 | EmptyState 메시지를 frontend doc §15.1 문구로 고정 + Phase 6 진입 시 자연스럽게 채워짐 |
| 신규 라우트가 늘어나면서 contract 회귀 가능성 | web-api-client contract test가 envelope 모양을 잡음 |

## 8. 진행 단계 (실행 순서)

1. ADR-0001 작성 → fetching/auth 결정 고정
2. `lib/api/{errors,client}` + `lib/auth/session` 작성
3. `lib/api/repositories,pullRequests` wrapper 작성
4. `components/states/*` 4종 작성
5. layout/AppShell client 분리, navigation 갱신
6. `/repositories`, `/repositories/[id]`, `/pulls` 실데이터 라우트 작성
7. `/pulls/[id]`, `/conflicts`, `/backouts` placeholder 작성
8. 단위 테스트 + contract test 작성
9. 타입체크 + 빌드 + 수동 라우트 확인
10. workflows/04, 05 작성, task board 갱신
11. 커밋 (commit message: `feat: complete Phase 5 web shell — routes, API client, state components (T-014)`)

## 9. 후속 작업으로 넘어가는 hand-off

T-014 완료 후 다음 작업(T-015, Phase 6 PR 핵심 기능)이 사용할 수 있는 것:

- typed API client (`@/lib/api/pullRequests`) — `getPullRequest(id)`만 채우면 PR 상세 화면 즉시 가능
- ErrorState/EmptyState/Skeleton — PR 상세 fallback에 그대로 사용
- AppShell + navigation — 새 PR 화면을 라우트만 추가하면 통합
- `workflows/05_web_shell.md`의 패턴 — Phase 6에서 동일 구조로 PR detail/risk-analysis/review-recommendations UI 작성

## 10. 참고 문서

- `docs/01-product/prd.md` §11.4 (PR 보조 화면 — Phase 6 진입 시 화면 요구사항 일부 본 작업에서 토대 마련)
- `docs/04-frontend/frontend_badge_action_mapping.md` §15 (Empty/Loading/Error)
- `docs/03-api/openapi.yaml` `/api/v1/repositories`, `/api/v1/pull-requests`
- `plans/01_phase_order.md` §5 Phase 5
- `plans/02_dependency_map.md` (read model 차단 관계)

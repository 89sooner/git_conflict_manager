# 05 Web Shell

## Goal

Phase 5 웹 셸을 완성한다. 타입드 API 클라이언트, 핵심 라우트, 공통 상태 컴포넌트, dev 인증 게이트를 정비하여 Phase 6(PR 기능) 진입 조건을 만족시킨다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `plans/07_t014_web_shell_completion_plan.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`
- `docs/04-frontend/frontend_badge_action_mapping.md`
- `docs/05-decisions/adr-0001-web-data-fetching-strategy.md`
- `packages/shared-types/src/index.ts`

## Steps

1. `apps/web/lib/api/` 작성: `errors.ts` (`ApiClientError`), `client.ts` (`apiFetch`), 도메인별 helper (`repositories.ts`, `pullRequests.ts`)
2. 서버/클라이언트 base URL 분리 (`API_BASE_URL_INTERNAL` vs `NEXT_PUBLIC_API_BASE_URL`)
3. dev 인증 게이트: `lib/auth/session.ts` + `GSP_DEV_USER` 헤더 주입
4. 공통 상태 컴포넌트 (`components/states/`): `EmptyState`, `ErrorState`, `ListSkeleton`, `DetailSkeleton`
5. AppShell 갱신: `'use client'`, `usePathname` 기반 활성 표시, user display
6. 라우트 추가:
   - `/repositories`, `/repositories/[id]`
   - `/pulls`, `/pulls/[id]` (Phase 6 placeholder)
   - `/conflicts` (Phase 7 placeholder)
   - `/backouts` (Phase 8 placeholder)
7. 단위 테스트(`lib/api/__tests__/client.test.ts`) + 계약 round-trip 테스트(`tests/contract/src/web-api-envelope.test.ts`)
8. ADR-0001 작성 (data fetching 전략, dev auth, base URL 분리)

## Output

- 타입드 API 클라이언트 + 도메인 helper
- 공통 상태 컴포넌트
- AppShell 네비게이션 갱신
- 6개 라우트
- web/contract 테스트
- ADR-0001

## Done when

- 모든 라우트가 server component + `apiFetch` 로 데이터를 조회하거나 placeholder 를 표시한다
- `ApiClientError` 가 envelope을 정확히 파싱한다
- `GSP_DEV_USER=bootstrap` 환경에서 헤더가 주입되고, 미설정 시 누락된다
- `pnpm --filter @gsp/web test` / `tsc --noEmit` / `build` 가 통과한다
- contract envelope round-trip 테스트가 통과한다
- AppShell 활성 항목이 `aria-current="page"` 로 표기된다

## Phase 6 진입 조건

- Phase 5 결과물 위에 PR 상세 화면, 위험도 분석, 액션 패널을 얹을 수 있어야 한다
- `/pulls/[id]` placeholder 를 실 데이터로 교체하기 전, PR 상세 read 모델(`getPullRequest`)이 검증돼 있어야 한다

# 08 Backout / Revert Center

## Goal

Phase 8에서 backout 요청 CRUD, 검증 job, revert PR 생성 엔드포인트, backout center UI를 구현한다. 목표는 merged PR 또는 commit 집합을 안전하게 되돌리는 표준 워크플로우의 최소 사용 가능 상태를 만드는 것이다. release 브랜치 대상 승인 제약과 감사 로그 기록을 포함한다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `plans/05_task_board.md`
- `docs/01-product/prd.md` §11.12 Backout / Revert 지원
- `docs/03-api/openapi.yaml` (Backouts tag)
- `docs/03-api/state_transition_spec.md` §7 Backout / Revert 상태 전이
- `docs/03-api/error_code_standard.md` §7.8 Backout / Revert
- `docs/04-frontend/frontend_badge_action_mapping.md` §8 Backout 상태 매핑
- `docs/02-architecture/data_model_and_db_schema.md`
- `packages/shared-types/src/index.ts`
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/worker/AGENTS.md`

## PRD coverage

- `docs/01-product/prd.md` 10.1 MVP 범위 (암묵적 — backout은 merged PR의 안전 되돌리기 필수 경로)
- `docs/01-product/prd.md` 11.12 Backout / Revert 지원 (핵심 기능 전체)
- `docs/01-product/prd.md` 13.1 일반 개발자 플로우 (backout 시작)
- `docs/01-product/prd.md` 15.2 graceful degradation (revert 생성 실패 시 최소 안내)

## Current implementation snapshot

1. `BackoutState` 12-state enum이 `packages/shared-types`에 정의되어 있고, `BACKOUT_STATE_BADGES`와 `backoutBadge()` 함수가 존재한다.
2. `docs/03-api/openapi.yaml`에 4개 Backout 엔드포인트가 계약으로 정의되어 있다:
   - `GET /api/v1/backouts` (list)
   - `POST /api/v1/backouts` (create)
   - `GET /api/v1/backouts/{backoutId}` (detail)
   - `POST /api/v1/backouts/{backoutId}/generate-revert-pr` (revert PR 생성)
3. `docs/03-api/error_code_standard.md`에 Backout 에러 코드 8종이 정의되어 있다.
4. `docs/03-api/state_transition_spec.md` §7에 12-state 전이 표와 운영 규칙이 정의되어 있다.
5. `docs/04-frontend/frontend_badge_action_mapping.md` §8에 상태별 배지/액션 매핑이 완비되어 있다.
6. `apps/api/src/routes/`에 backout routes 파일이 없고, `index.ts`에도 미등록이다.
7. `apps/api/src/db/migrations/`에 backout 관련 migration이 없다.
8. `apps/web/app/backouts/page.tsx`는 Phase 8 대기 placeholder만 존재한다.
9. `packages/shared-types`에 Backout summary/detail/target/request 도메인 타입이 없다 (BackoutState/badge만 존재).
10. `packages/runtime-store`에 backout 시드 데이터가 없다.
11. Worker에 backout validation job이 없다.

## Dependency gates

1. Phase 7 완료 확인 — task board T-019 done ✅
2. Backout은 merged PR과 연결되므로 `PullRequestSummary`가 정의되어 있어야 한다 ✅
3. `BackoutState` enum과 badge가 이미 shared-types에 존재해야 한다 ✅
4. OpenAPI에 Backout 계약이 존재해야 한다 ✅

## Scope

### In scope

- `packages/shared-types` backout summary/detail/target/request 타입 추가
- `packages/runtime-store` backout 시드 데이터 추가
- backout persistence migration (`0004_backout_support.sql`)
- `apps/api` backout CRUD routes + service + repository
- `apps/worker` backout validation job + state transition 검증
- `apps/web` backout center 목록/상세 + 액션 패널
- contract/api/worker/web 테스트
- 문서 갱신 및 task board 갱신

### Out of scope

- GitHub API를 통한 실제 revert PR 생성 (dry-run placeholder로 대체)
- 실제 merge queue 진입 자동화
- 브랜치 동기화 추적 (main/release 간 차이 탐지)
- backport 의존 커밋 추천
- 충돌 자동 수정
- 정책/대시보드 도메인 (Phase 9)

## Functional requirements

### 1. Contract-first updates

1. `packages/shared-types`에 다음 타입을 OpenAPI와 동일하게 추가한다:
   - `BackoutTarget` (sourceType: pull_request | commit_list)
   - `BackoutSummary` (id, repositoryId, targetBranch, status, urgency, createdBy, createdAt)
   - `BackoutDetail` (backout + target + impactSummary + impactedModules + recommendedValidations + revertPullRequest)
   - `CreateBackoutRequest` (repositoryId, targetBranch, reason, incidentTicket, urgency, approverIds, target)
   - `GenerateRevertPullRequestResult` (dryRun, canGenerate, pullRequest, warnings)
   - Response envelope aliases
2. `BackoutState` enum이 OpenAPI, shared-types, migration, worker, web badge 전 계층에서 일치해야 한다.
3. `BackoutUrgency` 타입 (`normal` | `high` | `emergency`)을 shared-types에 정의한다.

### 2. Data and persistence

1. `apps/api/src/db/migrations/0004_backout_support.sql`에 최소 아래 테이블을 생성한다:
   - `core_backout_requests`: id, repository_id, target_branch, status, urgency, reason, incident_ticket, created_by, created_at, updated_at
   - `core_backout_targets`: backout_id, source_type, pull_request_id, commit_shas
   - status CHECK constraint — 12-state enum
   - urgency CHECK constraint — normal, high, emergency
2. `packages/runtime-store`에 backout 시드 데이터 최소 3건 추가:
   - draft 상태 1건
   - pending-approval 상태 1건 (release branch, urgency: high)
   - merged 상태 1건 (완료된 backout)

### 3. Worker requirements

1. backout validation job을 `apps/worker/src/jobs/backoutValidation.ts`에 구현한다.
2. 상태 전이 검증 함수 `isValidBackoutTransition(current, next)` 구현:
   - `state_transition_spec.md` §7.3 전이 표를 코드로 반영
3. validation job은 다음을 결정한다:
   - 대상 PR/commit 존재 여부
   - release branch 여부 → 승인 필수 여부 결정
   - 충돌 가능성 추정 (현 Phase에서는 placeholder)
4. worker는 UI 문구를 만들지 않고, 검증 결과와 상태 전이만 처리한다.

### 4. API requirements

1. `GET /api/v1/backouts`: repository/status/branchKind 필터, 페이지네이션 지원
2. `POST /api/v1/backouts`: 표준 envelope + validation
   - reason 필수 검증 → `BACKOUT_REASON_REQUIRED`
   - target 필수 검증 → `BACKOUT_TARGET_REQUIRED`
   - 중복 backout 검증 → `BACKOUT_ALREADY_EXISTS`
   - release branch일 때 approverIds 필수 → `BACKOUT_APPROVER_REQUIRED`
3. `GET /api/v1/backouts/{backoutId}`: detail envelope
   - 없으면 `BACKOUT_NOT_FOUND`
4. `POST /api/v1/backouts/{backoutId}/generate-revert-pr`:
   - dryRun=true 시 충돌 가능성/경고 반환
   - dryRun=false 시 현 Phase에서는 placeholder PR 정보 반환
   - 실패 시 `BACKOUT_REVERT_PR_GENERATION_FAILED`
   - release 정책 차단 시 `BACKOUT_RELEASE_POLICY_BLOCKED`

### 5. Web requirements

1. `/backouts` 목록: placeholder 제거 → 실제 API 호출
   - status/urgency 배지, targetBranch, createdBy, createdAt 표시
   - 상태별 인라인 액션 (`frontend_badge_action_mapping.md` §8.3)
2. `/backouts/[id]` 상세 화면:
   - 상태 배지 + 긴급도 배지
   - 원본 PR/commit 개요
   - 되돌릴 변경 요약 (impactSummary)
   - 영향 모듈 목록
   - 추천 검증 목록
   - revert PR 정보 (있는 경우)
   - 상태별 액션 패널 (`frontend_badge_action_mapping.md` §8.4)
   - destructive 액션 (Cancel Backout)은 별도 영역
3. `frontend_badge_action_mapping.md`에서 아직 구현하지 않은 write 액션은 disabled + 이유 표기로 처리한다.

### 6. Security and audit requirements

1. release backout은 `pending-approval`을 생략할 수 없다.
2. destructive 액션 (cancel, generate revert PR)에는 확인 절차를 UI에서 제공해야 한다.
3. 상태 전이 시 최소한 audit trail 연결 지점(transition metadata)을 데이터에 남겨야 한다.

### 7. Tests and documentation

1. OpenAPI, shared-types, API handler, web client 사이 backout 계약 round-trip 테스트를 추가한다.
2. API 테스트: backout list/detail/create/generate-revert-pr의 success, not-found, validation-error, policy-blocked를 포함한다.
3. Worker 테스트: backout validation job 상태 전이 검증을 포함한다.
4. Web 테스트: backout list/detail의 주요 상태 렌더링을 포함한다.
5. 새 상태 전이나 에러 코드가 추가되면 관련 문서를 함께 갱신한다.
6. 완료 시 `plans/05_task_board.md`를 갱신한다.

## Steps

1. `packages/shared-types`에 backout 도메인 타입을 추가하고 OpenAPI와 정합성을 맞춘다.
2. `packages/runtime-store`에 backout 시드 데이터를 추가한다.
3. `apps/api/src/db/migrations/0004_backout_support.sql`을 작성한다.
4. `apps/api`에 backout repository → service → routes를 구현하고 `index.ts`에 등록한다.
5. `apps/worker`에 backout validation job과 state transition 검증을 추가한다.
6. `apps/web`에 backout center 목록/상세 UI를 구현한다.
7. contract/api/worker/web 테스트를 추가한다.
8. 문서와 task board를 갱신한다.

## Output

- Phase 8 backout workflow 문서 (본 문서)
- `packages/shared-types` backout 타입 확장
- `packages/runtime-store` backout 시드 데이터
- backout persistence migration
- worker backout validation job
- backout CRUD + generate-revert-pr API
- backout center list/detail web UI
- contract/api/worker/web 테스트

## Done when

- `/backouts`가 placeholder가 아니라 실제 data/state를 렌더링한다
- backout list/detail/create API가 OpenAPI 계약대로 응답한다
- 12-state 상태 전이가 worker와 API에서 검증된다
- release branch backout에 approval 제약이 적용된다
- destructive 액션에 확인 절차가 있다
- `pnpm --filter @gsp/api test`
- `pnpm --filter @gsp/api typecheck`
- `pnpm --filter @gsp/worker test`
- `pnpm --filter @gsp/web test`
- `pnpm --filter @gsp/web typecheck`
- `pnpm --filter @gsp/web build`
- `pnpm --filter @gsp/contract-tests test`
- 관련 문서와 task board가 최신 상태다

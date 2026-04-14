# 05 Task Board

## 사용 규칙

- 각 작업은 phase와 workflow를 연결해서 기록한다.
- 상태는 `todo`, `doing`, `blocked`, `done` 중 하나를 사용한다.
- blocked는 반드시 이유와 해소 조건을 같이 적는다.

## 예시 템플릿

| ID | Phase | Workflow | Task | Owner | Status | Notes |
|---|---|---|---|---|---|---|
| T-001 | 0 | 00_read_context | docs canonical path 정리 | unassigned | todo | |
| T-002 | 1 | 02_backend_contract_first | openapi validate 추가 | unassigned | todo | |
| T-003 | 2 | 01_bootstrap_repo | api app scaffold | unassigned | todo | |

## Active Tasks

| ID | Phase | Workflow | Task | Owner | Status | Notes |
|---|---|---|---|---|---|---|
| T-004 | 0 | 00_read_context | 워크스페이스 심층 분석 및 최적화 계획 작성 | codex | done | `plans/06_workspace_optimization_plan.md` 추가 |
| T-005 | 0 | 01_bootstrap_repo | Node/pnpm 재현성 정비 및 lockfile 고정 | claude | done | `.nvmrc`, `pnpm-lock.yaml` 커밋, CI `--frozen-lockfile`, api tsconfig 분리, web/worker `--passWithNoTests` |
| T-006 | 1 | 02_backend_contract_first | OpenAPI/에러/상태/공통 타입 계약 드리프트 정리 | claude | done | `ErrorResponse` retryable/userAction, `ApiMeta.timestamp`, `ErrorCode` enum, `BackoutStatus` full state machine, shared-types 확장, `internal_api_spec.md` reference-only 배너 |
| T-007 | 1 | 02_backend_contract_first | OpenAPI validation 및 contract baseline 테스트 추가 | claude | done | `tests/contract` 워크스페이스 생성, swagger-parser/ajv/yaml 도입, 10개 테스트 통과 (openapi-valid, error-envelope, me-envelope, backout-status) |
| T-008 | 1 | 02_backend_contract_first | DB migration baseline 및 상태 enum SQL 추가 | claude | done | `apps/api/src/db/migrations/0001_baseline.sql`, 6개 테이블 + PR 11-state / sync_jobs status check constraint, contract test 추가 (14 tests) |
| T-009 | 2 | 02_backend_contract_first | API error middleware와 `/api/v1/me` 표준 응답 정비 | claude | done | `plugins/requestId,errorHandler,auth`, `lib/errors.ApiError`, `services/userService` + `repositories/baseRepository` 스캐폴딩, `src/server.ts` 분리, 6 api tests (health/me/errorEnvelope) |
| T-010 | 2 | 01_bootstrap_repo | 웹 셸과 shared package 실제 사용 시작 | claude | done | `AppShell`/`StatusBadge` 컴포넌트, `@gsp/shared-types` PR/Risk/Backout badge mapping + `@gsp/config` BADGE_TONE_STYLES/navigation, badge-mapping contract test (17 tests), next build 통과 |
| T-011 | 3 | 03_github_app_integration | webhook normalization/idempotency/sync baseline 구현 | claude | done | `POST /webhooks/github` (HMAC-SHA256 검증, 스코프 raw-body 파싱), `lib/github/verify,normalizer,types`, `lib/sync/queue`, delivery_id 인메모리 idempotency, 13 api tests + 10 contract tests |
| T-012 | 4 | 04_read_model | 읽기 모델 라우트 — Repository/Branch/PR 조회 API | claude | done | shared-types 확장(RepositorySummary/BranchSummary/PullRequestSummary/Detail), 서비스/레포지터리 레이어 스캐폴딩, GET /api/v1/repositories+branches+pull-requests, 22 api tests + 9 contract shape tests |

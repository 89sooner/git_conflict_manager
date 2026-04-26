# 05 Task Board

## 사용 규칙

- 각 작업은 phase와 workflow를 연결해서 기록한다.
- 상태는 `todo`, `doing`, `blocked`, `done` 중 하나를 사용한다.
- blocked는 반드시 이유와 해소 조건을 같이 적는다.

## 예시 템플릿 <!-- 참고용 포맷입니다. T-001~T-003은 실제 태스크가 아닙니다. -->

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
| T-013 | 2 | 01_bootstrap_repo | Codex 리뷰 지적 사항 적용 — CTA no-op 및 conflict badge bypass 수정 | claude | done | `page.tsx` 버튼→`<a>` 링크(/pulls,/backouts), conflict 패널 custom span → `conflictBadge('detected')` + StatusBadge, `ConflictCaseStatus`/`CONFLICT_STATUS_BADGES`/`conflictBadge` shared-types 추가, badge-mapping contract test +1 (37 tests 통과) |
| T-014 | 5 | 05_web_shell | Phase 5 web shell 완성 — 타입드 API client, 라우트, 상태 컴포넌트, dev auth | claude | done | `apps/web/lib/api/{client,errors,repositories,pullRequests}`, `lib/auth/session`, `components/states/*`, AppShell `usePathname` + user display, 6개 라우트(/repositories[/id], /pulls[/id], /conflicts, /backouts), ADR-0001, web 단위 테스트 6 + contract envelope round-trip 5, 70 tests 전체 통과 |
| T-015 | 6 | 06_pr_core_features | PRD 기준 Phase 6 갭 분석 및 기능 요구사항/workflow 문서화 | codex | done | `workflows/06_pr_core_features.md` 추가, 현재 코드의 stub/placeholder/contract drift 및 Phase 6 범위 정리 |
| T-016 | 6 | 06_pr_core_features | PR 상세 read flow, 위험도 분석, 리뷰 추천, 액션 패널 구현 | codex | done | OpenAPI PR detail 확장, `packages/shared-types` risk/review 타입 추가, fixture-backed read model + `/pull-requests/{id}/risk-analysis`/`review-recommendations`/`assist` 구현, `/pulls/[id]` 상세 및 홈 PR 패널 실데이터화, api/web/contract 테스트 및 web build 통과 |
| T-017 | 6 | 06_pr_core_features | PR risk/review read model을 실제 DB/worker 파이프라인에 연결 | codex | done | `@gsp/runtime-store` 패키지 추가, repository read path를 runtime store 조회로 전환, webhook sync job을 persistent queue로 저장, worker `processPendingSyncJobs` 구현, api/worker/web/contract 검증 통과 |
| T-018 | 7 | 07_conflict_support | PRD 기준 Phase 7 갭 분석 및 기능 요구사항/workflow 문서화 | codex | done | `workflows/07_conflict_support.md` 추가, conflict API/UI/worker/migration 부재와 Phase 7 범위·의존성 정리 |
| T-019 | 7 | 07_conflict_support | conflict case list/detail, guidance job, 상태 전이 구현 | gemini | done | openapi.yaml status enum 3→7 확장, shared-types conflict 타입/badge 추가, runtime-store conflict 시드 3건, migration 0003, API routes/service/repository, worker guidance job + state transition 검증, web list/detail UI, contract enum tests, api 38·worker 27·contract 53 tests 통과, web build 통과 |
| T-020 | 6 | 06_pr_core_features | Gemini 리뷰 보완 — 스타일 토큰, 홈 데모 정리, ADR-0003 작성 | claude | done | `conflicts/backouts` `text-slate-*` → `text-foreground/muted-foreground`, 홈 충돌/backout 패널 하드코딩 → placeholder, `docs/05-decisions/adr-0003-runtime-store-and-db-migration-strategy.md` 추가 |
| T-021 | 6 | 06_pr_core_features | Gemini audit follow-up — mockReadModel 중복 제거, ADR-0002 작성, ADR 번호 갭 해소 | gemini | done | `apps/api/src/data/mockReadModel.ts` 삭제 (dead code 404줄 제거), `docs/05-decisions/adr-0002-mock-read-model-deprecation.md` 추가, ADR-0003 전환 작업 §3 완료 표기 |
| T-022 | 8 | 08_backout_revert | Phase 8 워크플로우 문서 작성 | gemini | done | `workflows/08_backout_revert.md` 추가, PRD §11.12 기반 현재 구현 snapshot/scope/functional requirements/steps 정의 |
| T-023 | 8 | 08_backout_revert | shared-types backout 도메인 타입 + runtime-store 시드 데이터 추가 | gemini | done | BackoutTarget/Summary/Detail/CreateRequest/GenerateRevertResult 타입, BackoutUrgency, response envelopes, runtime-store 시드 3건 |
| T-024 | 8 | 08_backout_revert | backout API CRUD + migration + service/repository 구현 | gemini | done | migration 0004, GET/POST /backouts, GET /backouts/:id, POST /backouts/:id/generate-revert-pr, 에러 코드 검증, contract test |
| T-025 | 8 | 08_backout_revert | worker backout validation job + 상태 전이 검증 구현 | gemini | done | `isValidBackoutTransition()`, validation job (release branch 승인 필수 판정, 충돌 가능성 placeholder), worker test |
| T-026 | 8 | 08_backout_revert | backout center 목록/상세 UI + 액션 패널 구현 | gemini | done | placeholder 제거, /backouts list, /backouts/[id] detail, 상태별 액션 패널, destructive 액션 확인, web test + build |

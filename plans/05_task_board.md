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
| T-005 | 0 | 01_bootstrap_repo | Node/pnpm 재현성 정비 및 lockfile 고정 | unassigned | todo | `.nvmrc`, `pnpm-lock.yaml`, CI 정비 |
| T-006 | 1 | 02_backend_contract_first | OpenAPI/에러/상태/공통 타입 계약 드리프트 정리 | unassigned | todo | `requestId`, `/api/v1/me`, Backout 상태 enum 정합성 |
| T-007 | 1 | 02_backend_contract_first | OpenAPI validation 및 contract baseline 테스트 추가 | unassigned | todo | `tests/contract` 실체화 |
| T-008 | 1 | 02_backend_contract_first | DB migration baseline 및 상태 enum SQL 추가 | unassigned | todo | Phase 2와 Phase 3 선행조건 |
| T-009 | 2 | 02_backend_contract_first | API error middleware와 `/api/v1/me` 표준 응답 정비 | unassigned | todo | request id, error envelope, unit test 포함 |
| T-010 | 2 | 01_bootstrap_repo | 웹 셸과 shared package 실제 사용 시작 | unassigned | todo | app shell, status badge skeleton |
| T-011 | 3 | 03_github_app_integration | webhook normalization/idempotency/sync baseline 구현 | unassigned | todo | Phase 1/2 완료 후 착수 |

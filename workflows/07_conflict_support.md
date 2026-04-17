# 07 Conflict Support

## Goal

Phase 7에서 merge/rebase/cherry-pick 충돌 케이스를 조회하고, 현재 상태 해석과 단계형 가이드를 제공하는 read-first 충돌 지원 흐름을 구현한다. 목표는 자동 해결이 아니라 conflict case 모델, 가이드 생성 job, 상세 UI, 상태 전이 검증을 갖춘 최소 사용 가능 상태를 만드는 것이다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `plans/02_dependency_map.md`
- `plans/05_task_board.md`
- `docs/01-product/prd.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/state_transition_spec.md`
- `docs/03-api/error_code_standard.md`
- `docs/04-frontend/frontend_badge_action_mapping.md`
- `docs/02-architecture/data_model_and_db_schema.md`
- `docs/02-architecture/github_app_integration_design.md`
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/worker/AGENTS.md`
- `packages/shared-types/src/index.ts`

## PRD coverage

- `docs/01-product/prd.md` 10.1 MVP 범위 중 `merge/rebase/cherry-pick 상황별 가이드 뷰`
- `docs/01-product/prd.md` 11.5 충돌 해결 지원 화면
- `docs/01-product/prd.md` 13.2 충돌 해결 플로우
- `docs/01-product/prd.md` 15.2 graceful degradation 요구사항

## Current implementation snapshot

1. 현재 task board 기준 Phase 6의 사용자 노출 기능은 구현됐지만, `T-017`이 아직 남아 있어 PR risk/review read model은 fixture-backed 상태다.
2. `apps/web/app/conflicts/page.tsx`는 placeholder 화면만 있고, conflict list/detail UI와 액션 패널이 없다.
3. `apps/api/src/index.ts`에는 conflict routes가 등록돼 있지 않고, 런타임에는 `/api/v1/conflicts` 계열 엔드포인트가 존재하지 않는다.
4. `docs/03-api/openapi.yaml`에는 conflict list/detail 계약이 정의돼 있지만, `packages/shared-types/src/index.ts`에는 badge용 `ConflictCaseStatus` 외에 conflict summary/detail 타입이 없다.
5. `apps/worker/src/index.ts`와 `apps/worker/src/jobs/README.md` 기준으로 conflict guidance job은 아직 구현되지 않았다.
6. `apps/api/src/db/migrations`에는 `core_conflict_cases`, `core_conflict_files`를 실제로 생성하는 migration이 없고, conflict persistence는 아직 아키텍처 문서에만 존재한다.
7. 현재 홈 화면의 충돌 관련 표시는 PR `hasConflicts` 기반 요약일 뿐, 독립적인 conflict case read model은 없다.

## Dependency gates

1. `T-017`이 완료되기 전에는 Phase 7 구현도 fixture 중심으로 흐를 위험이 있다. 최소한 API/service/repository가 실제 DB 조회 패턴으로 확장 가능해야 한다.
2. conflict 지원은 `core_branches`, `core_commits`, `core_conflict_cases`, `core_conflict_files` 또는 동등한 read model이 있어야 의미 있는 detail을 제공할 수 있다.
3. worker의 conflict guidance job 없이 detail API만 먼저 만들면 `guided/analyzing/stale` 상태를 계약대로 유지하기 어렵다.

## Scope

### In scope

- conflict case summary/detail 계약 정리
- conflict persistence migration과 shared types 추가
- conflict guidance job 상태 모델과 API 연결
- `/conflicts` 목록 및 상세 화면
- stale/resolved/aborted 상태와 도움 요청 placeholder
- contract/api/web 테스트

### Out of scope

- 충돌 자동 수정
- 사용자의 로컬 working tree 원격 스캔
- backport/backout/policy/dashboard 구현
- Git 시뮬레이터와 학습 모듈 전체

## Functional requirements

### 1. Contract-first updates

1. `docs/03-api/openapi.yaml`의 conflict summary/detail 계약을 Phase 7 UI에 필요한 수준으로 먼저 확정한다.
2. conflict detail은 최소한 다음 정보를 표현할 수 있어야 한다.
- conflict type
- business status와 interpreted status
- repository/branch/base branch
- 관련 commit 또는 PR 연결 정보
- conflicting files와 file type
- guidance 단계 목록
- recovery actions
- escalation 대상 또는 안내 링크
3. `packages/shared-types`는 conflict summary/detail, conflict type, conflict status, conflict file 타입을 OpenAPI와 동일하게 가져야 한다.
4. conflict 상태 enum이 API, worker, frontend badge mapping, migration에서 일치해야 한다.

### 2. Data and persistence

1. conflict case는 PR 또는 branch 맥락과 연결돼 저장돼야 한다.
2. 최소 persistence는 아래 두 계층을 포함해야 한다.
- conflict case current row
- file-level conflict context
3. migration은 아키텍처 문서의 `core_conflict_cases`, `core_conflict_files` 또는 동등한 구조를 실제 SQL로 반영해야 한다.
4. stale/resolved/aborted 상태 전이를 기록할 transition history 또는 audit trail 연결 지점을 정의해야 한다.
5. user-submitted metadata가 필요한 경우 patch 원문 대신 메타데이터 저장을 우선하고, 민감한 로컬 파일 내용은 기본 저장 대상으로 두지 않는다.

### 3. Worker requirements

1. webhook 또는 수동 conflict ingest 이벤트가 들어오면 conflict guidance job을 멱등하게 enqueue 해야 한다.
2. worker는 최소한 다음 단계를 구분해야 한다.
- detected
- analyzing
- guided
- stale
- resolved
- aborted
3. worker는 UI 문구를 만들지 않고, guidance step, recovery action, file context, escalation metadata를 저장해야 한다.
4. source branch/PR/commit 맥락이 바뀌면 기존 guidance를 `stale`로 전환할 수 있어야 한다.
5. guidance 생성 실패 시 재시도 가능 여부와 실패 사유를 남겨 `CONFLICT_GUIDANCE_NOT_READY` 또는 `CONFLICT_ESCALATION_REQUIRED`와 연결해야 한다.

### 4. API requirements

1. `GET /api/v1/conflicts`는 repository/type/status 필터를 지원해야 한다.
2. list 응답은 최소한 id, type, status, repositoryId, branchName, conflictingFileCount, createdAt을 반환해야 한다.
3. `GET /api/v1/conflicts/{conflictCaseId}`는 conflict summary 외에 interpretedStatus, gitConceptHint, conflictingFiles, guidance, recoveryActions를 반환해야 한다.
4. 가이드가 아직 생성 중이면 `202` + pending envelope 또는 표준 준비 중 상태를 노출하는 방식을 계약으로 고정해야 한다.
5. conflict case가 없거나 컨텍스트가 불충분하면 표준 에러 코드를 반환해야 한다.
6. help/escalation 액션은 Phase 7에서 placeholder로 둘 수 있지만, 최소한 disabled reason 또는 안내 링크를 내려줘야 한다.

### 5. Web requirements

1. `/conflicts` 목록 화면은 placeholder를 제거하고 conflict case list를 실제 API로 렌더링해야 한다.
2. conflict list는 type/status/conflicting file count/branch name을 한눈에 보여줘야 한다.
3. conflict detail 화면은 공통 우측 액션 패턴을 따르고 최소한 다음 영역을 가져야 한다.
- 상태 배지
- 현재 상태 해석 문장
- 관련 branch/base/commit 정보
- 파일별 conflict context
- 단계형 guidance
- recovery path
- escalation/help placeholder
4. `frontend_badge_action_mapping.md`의 Conflict Case 상태 표현 규칙과 일치하도록 badge/action panel을 구현해야 한다.
5. analyzing/pending, guided/ready, failed-or-insufficient-context 상태를 각각 구분해서 보여야 한다.
6. stale 상태는 숨기지 않고 재분석 필요 안내를 노출해야 한다.

### 6. Security and privacy requirements

1. 로컬 working tree 내용은 기본적으로 서버에 업로드하지 않는다.
2. 충돌 파일 메타데이터와 patch 업로드가 필요하면 명시적 사용자 액션을 통해서만 수집한다.
3. 민감 저장소 또는 보안 모듈 경로는 최소 권한 원칙과 감사 로그 요구사항을 따라야 한다.
4. webhook 기반 ingest 데이터와 사용자 업로드 데이터는 source를 분리해서 기록해야 한다.

### 7. Tests and documentation

1. OpenAPI, shared-types, API handler, web client 사이 conflict 계약 round-trip 테스트를 추가한다.
2. API 테스트는 conflict list/detail의 success, pending, not-found, insufficient-context를 포함해야 한다.
3. Web 테스트는 conflict list와 detail의 guided/stale/pending 상태를 포함해야 한다.
4. 상태 표현 규칙이 바뀌면 `docs/04-frontend/frontend_badge_action_mapping.md`를 함께 갱신한다.
5. 새 상태 전이나 에러 코드가 추가되면 `state_transition_spec.md`, `error_code_standard.md`를 함께 갱신한다.
6. 완료 시 `plans/05_task_board.md`를 갱신한다.

## Steps

1. conflict API와 shared types 계약을 고정한다.
2. conflict persistence migration과 repository/service scaffolding을 추가한다.
3. worker에 conflict guidance job과 state transition 저장을 추가한다.
4. API에 conflict list/detail read flow를 구현한다.
5. web의 `/conflicts` 목록/상세와 액션 패널을 구현한다.
6. contract/api/web 테스트와 관련 문서를 갱신한다.

## Output

- Phase 7 conflict support workflow 문서
- OpenAPI 및 shared-types conflict 타입 확장
- conflict persistence migration
- worker conflict guidance job
- conflict list/detail API
- conflict list/detail web UI
- contract/api/web 테스트

## Done when

- `/conflicts`가 placeholder가 아니라 실제 data/state를 렌더링한다
- conflict list/detail API가 OpenAPI 계약대로 응답한다
- guided/stale/analyzing/resolved/aborted 상태가 UI와 API에서 일관된다
- stale conflict를 재분석 대상으로 식별할 수 있다
- `pnpm --filter @gsp/api test`
- `pnpm --filter @gsp/api typecheck`
- `pnpm --filter @gsp/web test`
- `pnpm --filter @gsp/web typecheck`
- `pnpm --filter @gsp/web build`
- `pnpm --filter @gsp/contract-tests test`
- 관련 문서와 task board가 최신 상태다

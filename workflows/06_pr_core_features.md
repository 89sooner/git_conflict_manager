# 06 PR Core Features

## Goal

Phase 6에서 PR 핵심 흐름을 실제 데이터 기반으로 사용할 수 있게 만든다. Phase 5 web shell 위에 PR 목록/상세, 위험도 분석, 리뷰 추천, 상태 배지/액션 패널을 얹고, PRD의 PR 보조 경험을 read-first 방식으로 구현한다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `plans/02_dependency_map.md`
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

- `docs/01-product/prd.md` 10.1 MVP 범위 중 `PR 생성/업데이트 시 위험도 분석`, `CODEOWNERS 및 리뷰어 추천`, `필수 품질 게이트 가시화`
- `docs/01-product/prd.md` 11.4 PR 보조 화면
- `docs/01-product/prd.md` 11.8 리뷰어 추천 및 CODEOWNERS 보조
- `docs/01-product/prd.md` 12.1 PR 위험도 산식 예시
- `docs/01-product/prd.md` 13.1 일반 개발자 PR 생성 플로우 중 read/assist 성격 단계

## Current implementation snapshot

1. 현재 task board 기준 Phase 5 web shell까지 완료되었고, 다음 허용 범위는 Phase 6 PR 핵심 기능이다.
2. `apps/api/src/repositories/repositoryRepository.ts`, `apps/api/src/repositories/branchRepository.ts`, `apps/api/src/repositories/pullRequestRepository.ts`는 아직 DB 조회 대신 빈 배열 또는 `null`을 반환하는 stub 상태다.
3. `apps/api/src/index.ts`에는 `GET /api/v1/pull-requests`와 `GET /api/v1/pull-requests/:pullRequestId`만 연결되어 있고, `openapi.yaml`에 정의된 `risk-analysis`, `review-recommendations`, `assist` 라우트는 런타임에 존재하지 않는다.
4. `packages/shared-types/src/index.ts`에는 PR 위험도 분석, 리뷰 추천, PR assist 계약 타입이 아직 없다.
5. `apps/web/app/pulls/[id]/page.tsx`는 Phase 6 placeholder이고, `apps/web/app/page.tsx`의 PR 관련 홈 대시보드도 demo data를 사용한다.
6. `apps/web/lib/api/pullRequests.ts`는 OpenAPI의 `riskLevel`이 아니라 `risk` 쿼리 키를 보내고 있어 기존 web client에도 계약 드리프트가 있다.
7. `apps/worker/src/index.ts`는 bootstrap만 존재하며, `apps/worker/AGENTS.md`에서 요구하는 risk analysis job과 review recommendation job이 아직 없다.
8. `apps/api/src/db/migrations/0001_baseline.sql`에는 `core_pull_requests`는 있지만, PR 위험도 current/history 저장소와 PR 상세 read flow에 필요한 후속 read model은 아직 반영되지 않았다.

## Scope

### In scope

- PR 목록/상세를 실제 DB read model로 전환
- PR 위험도 분석 read API와 pending/failure 상태 처리
- 리뷰 추천 및 CODEOWNERS coverage read API
- PR 상세 화면의 상태 배지, 해석 문장, 액션 패널
- Phase 6 구현에 필요한 shared types, migration, worker job, contract test
- PR 흐름을 직접 참조하는 홈 화면 demo data 정리

### Out of scope

- Conflict, Backout, Policy, Dashboard 도메인 구현
- merge, queue, review request, PR 생성 같은 GitHub write 액션 자동화
- 학습 모듈, 시뮬레이터, 조직 운영 지표
- `POST /api/v1/pull-requests/assist`의 full wizard 구현

## Functional requirements

### 1. Contract-first updates

1. Phase 6에서 필요한 PR 상세 정보가 현재 `PullRequestDetailResponse`에 부족하면 `docs/03-api/openapi.yaml`을 먼저 갱신한다.
2. PR 상세 계약은 최소한 다음 정보를 표현할 수 있어야 한다.
- 리뷰 준비 상태
- CODEOWNERS 충족 여부
- 필수 체크 요약
- merge blocking reason 목록
- GitHub 원본 링크 또는 deep-link용 식별자
3. `packages/shared-types`는 OpenAPI와 동일한 PR detail, risk analysis, review recommendations 타입을 가져야 한다.
4. 필터 파라미터 이름은 web/api/openapi 모두 `riskLevel`로 일치시킨다.

### 2. Data and persistence

1. PR 목록/상세는 webhook 동기화로 저장된 DB 데이터를 사용해야 한다.
2. 위험도 분석 current result와 history를 저장할 테이블 또는 동등한 read model을 migration으로 추가한다.
3. 리뷰 추천 결과가 current snapshot으로 조회 가능해야 하며, 필요한 경우 전용 테이블 또는 JSONB read model을 추가한다.
4. PR 상세 화면이 요구하는 changed files, commits, labels, builds, related issues, review 상태, check 상태를 저장소 레이어에서 조합할 수 있어야 한다.
5. worker가 계산한 결과와 API가 노출하는 결과 사이에는 별도 UI 변환 로직을 두지 않는다.

### 3. Worker requirements

1. PR 생성/수정, 리뷰, check 관련 이벤트가 들어오면 risk analysis job과 review recommendation job을 멱등하게 enqueue 해야 한다.
2. job은 `queued`, `running`, `succeeded`, `failed`, `stale`를 구분할 수 있어야 하며 API의 202/200/503 응답과 연결돼야 한다.
3. worker는 결과를 저장하고 상태 전이 이력을 남기며, UI 문구나 배지 문자열을 직접 만들지 않는다.
4. 분석 실패 시 `PR_ANALYSIS_FAILED`로 매핑 가능한 실패 원인과 재시도 가능 여부를 남겨야 한다.

### 4. API requirements

1. `GET /api/v1/pull-requests`는 stub이 아니라 실제 결과를 반환해야 한다.
2. `GET /api/v1/pull-requests/{pullRequestId}`는 Phase 6 상세 화면에 필요한 overview/gating 정보를 포함해야 한다.
3. `GET /api/v1/pull-requests/{pullRequestId}/risk-analysis`는 아래 동작을 만족해야 한다.
- 결과 준비 완료 시 `200`
- 작업 중이면 `202`와 `AsyncPendingResponse`
- 최근 분석 실패 상태면 표준 에러 envelope과 `PR_ANALYSIS_FAILED`
4. `GET /api/v1/pull-requests/{pullRequestId}/review-recommendations`는 required code owners, missing code owners, recommended reviewers, rationale을 반환해야 한다.
5. PR이 존재하지 않거나 저장소 scope에 접근할 수 없으면 표준 에러 코드를 반환해야 한다.
6. read-only 범위에서 구현하는 액션은 deep link 또는 상태 설명을 위한 데이터 제공까지를 목표로 한다.

### 5. Web requirements

1. `/pulls` 목록은 실제 API 응답을 렌더링하고 `riskLevel` 필터 계약을 따른다.
2. `/pulls/[id]` 상세 화면은 placeholder를 제거하고 다음 영역을 가진다.
- PR 개요 헤더
- 상태/위험도 배지
- 해석 문장
- 영향 분석 요약
- 리뷰 준비 상태
- 품질 게이트 상태
- 리뷰 추천
- 우측 액션 패널
3. 액션 패널은 `docs/04-frontend/frontend_badge_action_mapping.md`의 PR 상태 규칙을 따르되, 아직 구현하지 않은 write 액션은 숨김 또는 disabled 이유 표기로 처리한다.
4. 위험도 분석이 `202`인 경우 web은 skeleton 또는 “분석 중” 상태를 보여야 한다.
5. 분석 실패 시 GitHub 원본 PR 정보와 실패 사유를 함께 보여야 한다.
6. 홈 화면의 PR 관련 demo data는 실데이터로 교체하거나 Phase 6 범위 밖임이 드러나지 않도록 제거한다.

### 6. Tests and documentation

1. OpenAPI, shared-types, API handler, web client 사이 계약 round-trip 테스트를 추가 또는 갱신한다.
2. API 테스트는 PR list/detail/risk/review endpoints의 success, pending, failure, not-found를 포함해야 한다.
3. Web 테스트는 PR 상세 화면의 ready, pending, failed 상태와 액션 패널 상태 노출을 포함해야 한다.
4. 상태 표현 규칙 변경이 있으면 `docs/04-frontend/frontend_badge_action_mapping.md`를 함께 갱신한다.
5. 새 상태 전이 또는 에러 코드가 생기면 각각 `state_transition_spec.md`, `error_code_standard.md`를 함께 갱신한다.
6. 완료 시 `plans/05_task_board.md`를 갱신한다.

## Steps

1. `openapi.yaml`과 `packages/shared-types`에서 PR 상세/분석/리뷰 추천 계약을 고정한다.
2. PR risk/review read model에 필요한 migration과 repository query를 추가한다.
3. worker에 risk analysis/review recommendation job과 job status 저장을 추가한다.
4. API service/repository/route 계층에 PR detail, risk analysis, review recommendations read flow를 구현한다.
5. web의 `/pulls`, `/pulls/[id]`, 홈 PR 패널을 실제 데이터 기반으로 교체한다.
6. contract/api/web 테스트와 관련 문서를 갱신한다.

## Output

- Phase 6 PR workflow 기준 문서
- OpenAPI 및 shared-types 확장
- PR risk/review read model migration
- worker risk/review jobs
- API PR read endpoints 확장
- web PR detail/action panel 구현
- contract/api/web 테스트

## Done when

- PR 목록/상세가 stub 또는 placeholder 없이 동작한다
- `risk-analysis`와 `review-recommendations` 라우트가 OpenAPI 계약대로 응답한다
- web이 pending/failed/ready 상태를 모두 처리한다
- `riskLevel` 필터 드리프트가 제거된다
- `pnpm --filter @gsp/api test`
- `pnpm --filter @gsp/api typecheck`
- `pnpm --filter @gsp/web test`
- `pnpm --filter @gsp/web typecheck`
- `pnpm --filter @gsp/web build`
- `pnpm --filter @gsp/contract-tests test`
- 관련 문서와 task board가 최신 상태다

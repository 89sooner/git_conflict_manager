# 04 Read Model

## Goal

Repository / Branch / PullRequest 읽기 모델 라우트를 구축하고, 웹/계약 테스트가 동일한 envelope 타입을 공유하도록 한다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`
- `docs/02-architecture/data_model_and_db_schema.md`
- `packages/shared-types/src/index.ts`

## Steps

1. shared-types에 RepositorySummary / BranchSummary / PullRequestSummary / PullRequestDetail 정의
2. `apps/api/src/services` + `repositories` 레이어 스캐폴딩
3. `GET /api/v1/repositories`, `GET /api/v1/repositories/:id`, `GET /api/v1/repositories/:id/branches`, `GET /api/v1/pull-requests`, `GET /api/v1/pull-requests/:id` 라우트 구현
4. 모든 응답을 표준 envelope (`data` + `meta`) 으로 직렬화
5. api 단위 테스트 + contract shape 테스트 추가

## Output

- 읽기 전용 REST 라우트 5종
- 서비스/레포지터리 레이어
- shared-types 확장
- api/contract 테스트

## Done when

- 모든 라우트가 envelope 계약을 만족한다
- shared-types 타입과 OpenAPI 스키마가 일치한다
- api / contract 테스트 통과
- 페이지네이션 메타(`page`, `pageSize`, `total`) 가 일관되게 반환된다

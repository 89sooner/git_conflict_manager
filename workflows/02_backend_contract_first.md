# 02 Backend Contract First

## Goal

API 계약과 상태/에러 모델에 맞는 백엔드 골격을 먼저 구현한다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`
- `docs/03-api/state_transition_spec.md`
- `docs/02-architecture/data_model_and_db_schema.md`

## Steps

1. OpenAPI validation 파이프라인 추가
2. shared types 생성 경로 확정
3. DB enum 및 core table migration 초안 작성
4. API app scaffold
5. 공통 error middleware 작성
6. auth/me/health 엔드포인트 작성
7. contract test baseline 추가

## Output

- `apps/api` scaffold
- migration baseline
- health/me handlers
- contract test baseline

## Done when

- `openapi.yaml` validate 성공
- `GET /api/v1/me` 동작
- 표준 에러 응답 반환 가능
- 상태 enum이 migration과 코드에 존재
- contract test 최소 1개 이상 통과

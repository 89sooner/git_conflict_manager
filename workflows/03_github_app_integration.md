# 03 GitHub App Integration

## Goal

GitHub App 설치, webhook 수신, 핵심 메타데이터 동기화를 구현한다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `docs/02-architecture/github_app_integration_design.md`
- `docs/02-architecture/data_model_and_db_schema.md`
- `docs/03-api/error_code_standard.md`

## Steps

1. GitHub App credential loading 구현
2. webhook signature verification 추가
3. installation/repository/pull_request/push 이벤트 normalize
4. idempotency 처리
5. sync worker enqueue
6. repository/pr metadata upsert
7. 실패 및 재시도 경로 정의

## Output

- webhook endpoint
- event normalizer
- sync worker baseline
- repository/pr sync

## Done when

- 샘플 webhook payload를 수신/검증 가능
- 중복 이벤트 재처리가 안전
- repository/pr 기본 메타데이터 저장 가능

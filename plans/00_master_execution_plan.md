# 00 Master Execution Plan

## 목적

이 문서는 구현 전체의 진행 순서를 한 장으로 요약한다.

## 현재 기준 문서

- `docs/01-product/prd.md`
- `docs/02-architecture/github_app_integration_design.md`
- `docs/02-architecture/data_model_and_db_schema.md`
- `docs/03-api/internal_api_spec.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`
- `docs/03-api/state_transition_spec.md`
- `docs/04-frontend/frontend_badge_action_mapping.md`

## 핵심 개발 축

1. 계약 축: OpenAPI, 에러, 상태 전이
2. 데이터 축: DB schema, migration, read model
3. 연동 축: GitHub App, webhook, worker
4. UI 축: shell, state badge, action panel, feature pages

## 병렬화 원칙

- Phase 1 완료 전에는 병렬화하지 않는다.
- Phase 2 이후 `api`와 `web shell`은 일부 병렬 가능하다.
- Worker 기능은 webhook ingestion 골격 이후 병렬화한다.
- Backout/Conflict는 PR read model이 준비된 뒤 시작한다.

## 주간 운영 방식 권장

- 주 초: phase 목표 확인
- 주 중: workflow 기준 구현
- 주 말: task board 정리 + 문서/ADR 업데이트

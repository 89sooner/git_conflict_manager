# 00 Read Context

## 목적

모든 에이전트가 구현 전에 반드시 수행해야 하는 공통 문맥 읽기 절차를 정의한다.

## 읽기 순서

1. `AGENTS.md`
2. `plans/01_phase_order.md`
3. 현재 작업과 가장 직접 관련된 문서
4. 관련 workflow 문서
5. 필요한 경우 관련 ADR

## 기능별 필수 읽기 매트릭스

### 저장소/브랜치 조회 작업
- `docs/02-architecture/data_model_and_db_schema.md`
- `docs/03-api/openapi.yaml`

### PR 목록/상세 작업
- `docs/01-product/prd.md`
- `docs/03-api/openapi.yaml`
- `docs/04-frontend/frontend_badge_action_mapping.md`

### 충돌 지원 작업
- `docs/01-product/prd.md`
- `docs/03-api/state_transition_spec.md`
- `docs/03-api/openapi.yaml`

### Backout 작업
- `docs/01-product/prd.md`
- `docs/03-api/state_transition_spec.md`
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`

### GitHub App / webhook 작업
- `docs/02-architecture/github_app_integration_design.md`
- `docs/02-architecture/data_model_and_db_schema.md`

## 작업 시작 체크리스트

- 현재 phase가 무엇인지 확인했는가
- 이번 작업의 source of truth 문서를 확인했는가
- 관련 상태 전이와 에러 코드를 확인했는가
- 변경해야 할 코드와 문서가 무엇인지 목록화했는가
- 완료 조건을 정의했는가

## 작업 종료 체크리스트

- 코드 반영 완료
- 테스트 반영 완료
- 문서 갱신 완료
- task board 갱신 완료
- phase를 넘는 scope creep이 없는지 확인 완료

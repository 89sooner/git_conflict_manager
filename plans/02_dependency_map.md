# 02 Dependency Map

## 핵심 의존성

- `openapi.yaml` -> api handlers -> shared types -> web pages
- `state_transition_spec.md` -> DB enum -> service validation -> badge/action mapping
- `error_code_standard.md` -> backend middleware -> frontend error banner
- `github_app_integration_design.md` -> webhook ingestion -> sync worker -> read model
- `data_model_and_db_schema.md` -> migrations -> repositories -> dashboard queries

## 차단 관계

- contract 미고정 -> backend/web 동시 진행 금지
- read model 없음 -> dashboard/conflict/backout 기능 착수 금지
- 권한 모델 없음 -> policy/release/backout 승인 UI 착수 금지

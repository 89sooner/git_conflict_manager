# AGENTS.md

## api 앱 목적

`apps/api`는 REST API, 권한 검증, 읽기 모델 조회, Backout/Conflict/Policy 도메인 서비스, webhook ingestion entrypoint를 담당한다.

## 구현 원칙

1. `openapi.yaml`이 계약 기준이다.
2. handler -> service -> repository 계층을 유지한다.
3. 에러 코드는 `error_code_standard.md` 기준을 따른다.
4. 상태 전이는 `state_transition_spec.md` 기준을 따른다.
5. DB enum과 API enum이 다르면 변환 레이어를 명시적으로 둔다.

## 필수 체크

- unit test
- contract test
- migration test
- lint/typecheck

## 우선 구현 순서

1. health/auth/me
2. repository overview
3. branch detail/history graph
4. PR list/detail
5. risk analysis read API
6. review recommendation read API
7. conflict/backout APIs

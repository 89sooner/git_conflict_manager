# AGENTS.md

## 문서 우선순위

에이전트는 아래 순서대로 문서를 사실상 source of truth로 간주한다.

1. `docs/01-product/prd.md`
2. `docs/02-architecture/github_app_integration_design.md`
3. `docs/02-architecture/data_model_and_db_schema.md`
4. `docs/03-api/openapi.yaml`
5. `docs/03-api/error_code_standard.md`
6. `docs/03-api/state_transition_spec.md`
7. `docs/04-frontend/frontend_badge_action_mapping.md`
8. `plans/01_phase_order.md`
9. `workflows/*.md`

초안 문서와 최종 문서를 혼동하지 않는다.
- `docs/03-api/openapi.yaml`이 API 계약의 최종 기준이다.
- `openapi_3_1_spec_draft.md`는 참고 문서일 뿐이다.

## 작업 기본 원칙

1. 코드를 작성하기 전에 반드시 관련 workflow 문서를 먼저 읽는다.
2. PRD를 임의로 수정하지 않는다.
3. API를 변경할 때는 `openapi.yaml`을 먼저 또는 함께 갱신한다.
4. 상태 전이가 바뀌면 `state_transition_spec.md`를 함께 갱신한다.
5. 에러 응답 구조가 바뀌면 `error_code_standard.md`를 함께 갱신한다.
6. 프론트 상태 표현이 바뀌면 `frontend_badge_action_mapping.md`를 함께 갱신한다.
7. 아키텍처 결정이 생기면 `docs/05-decisions/adr-*.md`를 추가한다.
8. 큰 기능은 한 번에 끝까지 밀지 말고 phase 단위로 끊어서 완료 조건을 만족시킨다.

## 구현 순서 제약

다음 순서를 깨지 않는다.

1. 워크스페이스 정리
2. 계약 고정
3. 백엔드 골격
4. GitHub App 연동
5. 읽기 모델
6. 웹 셸
7. PR 기능
8. 충돌 지원
9. Backout
10. 정책/대시보드
11. 하드닝/릴리스

허용되지 않는 예:
- `openapi.yaml` 없이 API 핸들러부터 구현
- DB 모델 없이 분석 워커 로직부터 구현
- 권한 모델 없이 운영자 기능부터 구현
- 공통 상태 배지 규칙 없이 화면별 UI를 제각각 구현

## 코드 작업 규칙

1. `apps/api`는 계약 우선 방식으로 구현한다.
2. `apps/web`는 `packages/shared-types`를 사용한다.
3. `apps/worker`는 직접 UI 상태를 만들지 않고 도메인 이벤트와 저장 상태만 갱신한다.
4. 공통 타입, enum, validation schema는 `packages/shared-types` 또는 `packages/config`에 둔다.
5. 테스트가 없는 새 상태 전이나 새 에러 코드는 허용하지 않는다.

## 반드시 남겨야 하는 산출물

기능 구현 시 아래 중 해당되는 항목을 함께 남긴다.

- 코드
- 테스트
- 문서 갱신
- task board 갱신
- ADR
- 샘플 fixture 또는 mock

## 완료 조건

각 작업은 아래를 만족해야 완료로 본다.

1. 관련 workflow의 Done when 항목을 만족한다.
2. 빌드가 성공한다.
3. 테스트가 통과한다.
4. lint/typecheck가 통과한다.
5. 관련 문서가 최신 상태다.
6. `plans/05_task_board.md`가 갱신되었다.

## 금지 사항

1. 대규모 리팩터링을 사전 계획 없이 수행하지 않는다.
2. API 계약을 깨는 변경을 문서 없이 반영하지 않는다.
3. 상태 enum을 화면 코드에 하드코딩하지 않는다.
4. 운영자 기능을 일반 사용자에게 노출하지 않는다.
5. release/backout 관련 destructive 액션을 확인 절차 없이 연결하지 않는다.

## 작업 시작 절차

매 작업 시작 시 아래 순서를 따른다.

1. `plans/01_phase_order.md` 확인
2. 해당 `workflows/*.md` 확인
3. 현재 phase와 의존성 확인
4. scope를 정하고 산출물 정의
5. 구현
6. 테스트
7. 문서/보드 갱신

## 하위 디렉토리 규칙

하위 디렉토리에 별도 `AGENTS.md`가 있으면 더 구체적인 규칙이 우선한다.

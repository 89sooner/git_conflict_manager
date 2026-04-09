# 01 Phase Order

## 목적

이 문서는 구현 순서를 고정하기 위한 master phase 문서다.
에이전트는 이 문서를 기준으로 현재 작업 가능 범위를 판단한다.

## Phase 0. 워크스페이스 정리

### 목표
문서, 코드, 테스트, 에이전트 지침이 일관된 위치에 있도록 정리한다.

### 작업
- 디렉토리 표준화
- `AGENTS.md` 생성
- `docs/`, `plans/`, `workflows/`, `apps/`, `packages/`, `tests/` 구조 생성
- 기존 문서 canonical path로 이동
- README 초안 작성

### 완료 조건
- 모든 기준 문서가 표준 경로에 존재
- 루트 및 하위 AGENTS.md 존재
- phase/workflow 문서 존재

## Phase 1. 계약 고정

### 목표
API, 에러, 상태 모델을 고정해 병렬 개발이 가능하도록 만든다.

### 입력 문서
- `docs/03-api/openapi.yaml`
- `docs/03-api/error_code_standard.md`
- `docs/03-api/state_transition_spec.md`
- `docs/02-architecture/data_model_and_db_schema.md`

### 작업
- OpenAPI validate
- 공통 enum 정리
- shared types 생성 전략 결정
- contract test 골격 작성
- DB enum/상태 모델 정합성 점검

### 완료 조건
- `openapi.yaml` 유효성 검증 통과
- 에러 코드/상태 모델 TODO 정리 완료
- shared types 생성 경로 고정
- contract baseline 준비 완료

## Phase 2. 백엔드 골격

### 목표
앱 서버, DB 마이그레이션, 공통 미들웨어를 준비한다.

### 작업
- `apps/api` scaffold
- DB connection / migration / seed 체계
- auth middleware
- error middleware
- health endpoint
- `GET /api/v1/me`
- base repository/service layer

### 완료 조건
- 앱 기동
- migration 적용 가능
- health/me 응답 가능
- 에러 포맷 표준 적용

## Phase 3. GitHub App 연동

### 목표
GitHub App 설치, webhook 수신, 기본 동기화가 가능해야 한다.

### 입력 문서
- `docs/02-architecture/github_app_integration_design.md`

### 작업
- App credentials loading
- webhook signature verification
- installation/repository metadata sync
- PR/branch/push webhook ingestion
- event normalization
- idempotency key 처리

### 완료 조건
- webhook 수신 성공
- repository/PR metadata 저장
- 중복 이벤트 재처리 안전성 확인

## Phase 4. 읽기 모델 구축

### 목표
저장소, 브랜치, PR 조회 API를 구현한다.

### 작업
- repository overview
- branch list/detail
- history graph
- PR list/detail
- pagination/filtering

### 완료 조건
- web에서 mock 없이 조회 가능
- contract test 통과
- 기본 인덱스와 query plan 검토 완료

## Phase 5. 웹 셸 구축

### 목표
사용자 로그인 후 기본 레이아웃과 라우트를 사용할 수 있어야 한다.

### 작업
- `apps/web` scaffold
- auth gate
- app shell
- sidebar / topbar / search placeholder
- shared state badge/action panel 골격
- error/empty/loading 공통 컴포넌트

### 완료 조건
- 기본 라우트 접근 가능
- auth 기반 가드 동작
- repository/pr 화면 shell 렌더링 가능

## Phase 6. PR 핵심 기능

### 목표
PR 목록/상세, 위험도, 리뷰 추천을 사용 가능 상태로 만든다.

### 작업
- PR list/detail UI/API 연결
- risk analysis read flow
- review recommendations read flow
- 상태 배지/액션 패널 반영
- 필터/정렬/기본 empty/error 처리

### 완료 조건
- PR 핵심 흐름 사용 가능
- 상태/위험도/권장 액션 표시 가능

## Phase 7. 충돌 지원

### 목표
Conflict case 조회 및 가이드 제공 기능을 구현한다.

### 작업
- conflict case model/API
- guidance generation job
- conflict detail UI
- stale/resolved/aborted 처리
- 도움 요청 액션 placeholder

### 완료 조건
- merge/rebase/cherry-pick conflict 케이스 조회 가능
- guidance 상태 전이 검증 완료

## Phase 8. Backout / Revert Center

### 목표
Backout 요청과 revert PR 생성 흐름을 구현한다.

### 작업
- backout request CRUD 최소 구현
- validation job
- revert PR generation endpoint
- backout center UI
- release approval 제약 반영

### 완료 조건
- PR 또는 commit 기준 backout 요청 생성 가능
- 상태 전이와 감사 로그 기록 가능

## Phase 9. 정책 / 운영 대시보드

### 목표
정책 템플릿과 조직 관측 화면을 구현한다.

### 작업
- policy template CRUD
- assignment model
- dashboard overview
- 주요 KPI API/UI
- 권한별 가시성

### 완료 조건
- 운영자가 정책 템플릿과 핵심 KPI를 확인 가능

## Phase 10. 하드닝 / 릴리스 준비

### 목표
테스트, 관측성, 운영 문서, 배포 준비를 마무리한다.

### 작업
- contract/integration/e2e 테스트 확대
- observability
- rate limit/failure handling
- security review checklist
- release runbook

### 완료 조건
- 파일럿 배포 가능
- 핵심 시나리오 e2e 통과
- 운영 체크리스트 완성

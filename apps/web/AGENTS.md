# AGENTS.md

## web 앱 목적

`apps/web`는 개발자 포털 UI, 운영 대시보드 UI, 상태 배지/액션 패널, 라우팅, 권한 기반 화면 제어를 담당한다.

## 구현 원칙

1. API 타입은 직접 정의하지 말고 `packages/shared-types`에서 가져온다.
2. 상태 배지와 액션 패널은 `frontend_badge_action_mapping.md`를 기준으로 구현한다.
3. 권한 체크는 화면 숨김과 disabled 이유 표기를 분리해서 구현한다.
4. PR, Conflict, Backout, Policy 화면은 공통 레이아웃과 우측 액션 패널 패턴을 따른다.
5. 임시 enum/string literal을 페이지 내부에서 새로 만들지 않는다.

## 필수 체크

- typecheck
- lint
- component test 또는 page test
- 상태 배지/액션 패널 snapshot 또는 story

## 우선 구현 순서

1. app shell
2. auth gate
3. repository/pr routes
4. 상태 배지 컴포넌트
5. 액션 패널 컴포넌트
6. PR 목록/상세
7. Conflict/Backout

# AGENTS.md

## worker 앱 목적

`apps/worker`는 GitHub webhook 후속 처리, 동기화 작업, 위험도 분석, 리뷰 추천 계산, 충돌/Backout 검증 작업을 담당한다.

## 구현 원칙

1. 워커는 UI 표현을 만들지 않는다.
2. 워커는 입력 이벤트, 처리 상태, 결과 저장을 명확히 분리한다.
3. 동일 이벤트 재처리에 대해 멱등해야 한다.
4. 상태 변경은 transition history를 함께 남긴다.
5. 긴 작업은 Job 상태를 갱신한다.

## 필수 체크

- idempotency test
- retry test
- failure path test
- queue integration test 또는 mock test

## 우선 구현 순서

1. webhook event normalization
2. repository/pr sync
3. risk analysis job
4. review recommendation job
5. conflict guidance job
6. backout validation job

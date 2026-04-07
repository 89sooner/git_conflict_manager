# Error Code Standard

## 1. 문서 목적

이 문서는 GitHub Enterprise 전환 지원 웹 도구의 공통 에러 코드 표준을 정의한다.

목표는 다음과 같다.

1. 프론트엔드, 백엔드, 분석 워커, 운영 대시보드가 동일한 실패 의미를 사용하게 한다.
2. HTTP status, machine-readable error code, 사용자 메시지, 재시도 가능 여부를 일관되게 관리한다.
3. 알림, 감사 로그, SLO 모니터링, 장애 대응에서 동일한 분류 체계를 사용하게 한다.
4. OpenAPI 응답 모델과 실제 구현의 간극을 줄인다.

## 2. 설계 원칙

1. 하나의 실패는 하나의 대표 에러 코드를 가진다.
2. HTTP status는 전송 계층 의미를, error code는 도메인 의미를 담당한다.
3. 사용자 메시지와 내부 디버깅 메시지는 분리한다.
4. 재시도 가능 여부를 명시한다.
5. 정책 위반, 권한 부족, 외부 연동 장애, 비동기 분석 지연을 구분한다.
6. 에러 코드는 변경 불가 계약으로 취급하며, 삭제 대신 deprecated 처리한다.

## 3. 공통 응답 포맷

```json
{
  "error": {
    "code": "PR_ANALYSIS_NOT_READY",
    "message": "PR 분석이 아직 완료되지 않았습니다.",
    "details": {
      "jobId": "3f6b0f4d-8d13-4d43-9f7d-1d5f2e0f0c61",
      "pullRequestId": "0f3ef26b-36fc-4e18-8b11-058f8b695d03"
    },
    "retryable": true,
    "userAction": "잠시 후 다시 시도하거나 작업 상태를 확인하세요."
  },
  "meta": {
    "requestId": "req_01JXYZ...",
    "timestamp": "2026-04-07T09:12:30Z"
  }
}
```

## 4. 필드 정의

| 필드 | 타입 | 설명 |
|---|---|---|
| error.code | string | 시스템 계약용 에러 코드 |
| error.message | string | 사용자에게 보여줄 기본 메시지 |
| error.details | object | 디버깅 및 보조 처리용 세부 정보 |
| error.retryable | boolean | 동일 요청 재시도가 의미 있는지 |
| error.userAction | string | 사용자가 다음에 취해야 할 행동 |
| meta.requestId | string | 로그 추적용 요청 식별자 |
| meta.timestamp | string | 서버 응답 시각 |

## 5. 네이밍 규칙

에러 코드는 다음 규칙을 따른다.

- 형식: `DOMAIN_REASON`
- 대문자 스네이크 케이스 사용
- 짧고 명확하게 작성
- HTTP status를 코드명에 넣지 않음

예시:
- `AUTH_TOKEN_EXPIRED`
- `REPOSITORY_NOT_FOUND`
- `PR_ANALYSIS_NOT_READY`
- `BACKOUT_APPROVER_REQUIRED`

## 6. HTTP status 매핑 원칙

| HTTP status | 의미 | 사용 예시 |
|---|---|---|
| 400 | 요청 형식 오류 | 필수 필드 누락, 파라미터 형식 오류 |
| 401 | 인증 실패 | 토큰 만료, 로그인 없음 |
| 403 | 권한/정책 거부 | 저장소 접근 불가, 정책상 실행 금지 |
| 404 | 리소스 없음 | 저장소, PR, Backout 요청 없음 |
| 409 | 현재 상태 충돌 | 이미 생성된 Backout, 상태 전이 불가 |
| 422 | 의미적 검증 실패 | 승인자 필수, base branch 부적합 |
| 429 | 요청 과다 | rate limit, 내부 보호 제한 |
| 500 | 내부 처리 실패 | 예기치 못한 서버 오류 |
| 502 | 외부 연동 오류 | GitHub API upstream 오류 |
| 503 | 일시적 서비스 불가 | 분석 워커 불가, 유지보수 |
| 504 | 외부/비동기 시간 초과 | GitHub API timeout, 분석 timeout |

## 7. 공통 에러 카탈로그

### 7.1 인증/세션

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| AUTH_REQUIRED | 401 | false | 인증 정보 없음 | 다시 로그인 |
| AUTH_TOKEN_EXPIRED | 401 | false | 세션 또는 토큰 만료 | 다시 로그인 |
| AUTH_TOKEN_INVALID | 401 | false | 잘못된 인증 토큰 | 다시 로그인 |
| SSO_ACCESS_DENIED | 403 | false | SSO 정책상 접근 불가 | 관리자 문의 |

### 7.2 권한/가시성

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| PERMISSION_DENIED | 403 | false | 일반 권한 부족 | 권한 요청 |
| REPOSITORY_ACCESS_DENIED | 403 | false | 저장소 접근 권한 없음 | 저장소 권한 요청 |
| ORG_SCOPE_DENIED | 403 | false | 조직 범위 접근 불가 | 조직 관리자 문의 |
| ADMIN_REQUIRED | 403 | false | 관리자 권한 필요 | 관리자 계정 사용 또는 요청 |

### 7.3 공통 입력/검증

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| INVALID_REQUEST | 400 | false | 잘못된 요청 형식 | 입력값 수정 |
| INVALID_FILTER | 400 | false | 지원하지 않는 필터 | 필터 값 수정 |
| VALIDATION_FAILED | 422 | false | 의미적 검증 실패 | 안내에 따라 수정 |
| IDEMPOTENCY_KEY_CONFLICT | 409 | false | 중복 요청 | 기존 요청 결과 확인 |

### 7.4 GitHub 연동

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| GITHUB_APP_NOT_INSTALLED | 403 | false | GitHub App 미설치 | 설치 진행 |
| GITHUB_APP_PERMISSION_INSUFFICIENT | 403 | false | App 권한 부족 | 권한 재설정 |
| GITHUB_API_RATE_LIMITED | 429 | true | GitHub API rate limit 초과 | 잠시 후 재시도 |
| GITHUB_API_UNAVAILABLE | 502 | true | GitHub API 오류 | 잠시 후 재시도 |
| GITHUB_WEBHOOK_SIGNATURE_INVALID | 401 | false | 웹훅 서명 검증 실패 | 운영자 점검 |
| GITHUB_RESOURCE_STALE | 409 | true | 동기화 데이터가 오래됨 | 다시 조회 |

### 7.5 저장소/브랜치

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| REPOSITORY_NOT_FOUND | 404 | false | 저장소 없음 | 저장소 확인 |
| BRANCH_NOT_FOUND | 404 | false | 브랜치 없음 | 브랜치명 확인 |
| BASE_BRANCH_REQUIRED | 422 | false | base branch 필수 | base branch 선택 |
| BRANCH_NAME_INVALID | 422 | false | 유효하지 않은 브랜치명 | 브랜치명 수정 |
| HISTORY_GRAPH_TOO_LARGE | 422 | false | 그래프 범위 과다 | limit 축소 |

### 7.6 PR/리뷰

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| PR_NOT_FOUND | 404 | false | PR 없음 | PR 확인 |
| PR_ANALYSIS_NOT_READY | 202 | true | 분석 아직 진행 중 | 잠시 후 재시도 |
| PR_ANALYSIS_FAILED | 503 | true | 분석 실패 | 재시도 또는 운영자 문의 |
| PR_BASE_BRANCH_INVALID | 422 | false | 부적절한 base branch | base branch 변경 |
| PR_REVIEWERS_REQUIRED | 422 | false | 필수 리뷰어 누락 | 리뷰어 추가 |
| PR_CODEOWNERS_MISSING | 422 | false | CODEOWNERS 승인 누락 | 코드 소유자 지정 |
| PR_REQUIRED_CHECKS_FAILED | 409 | false | 필수 체크 실패 | 빌드/테스트 수정 |
| PR_MERGE_QUEUE_REQUIRED | 409 | false | merge queue 사용 필수 | queue로 전환 |
| PR_ALREADY_LINKED | 409 | false | 이미 연결된 내부 PR 보조 리소스 존재 | 기존 리소스 사용 |

### 7.7 충돌 지원

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| CONFLICT_CASE_NOT_FOUND | 404 | false | 충돌 케이스 없음 | 식별자 확인 |
| CONFLICT_TYPE_UNSUPPORTED | 422 | false | 미지원 충돌 유형 | 수동 대응 또는 운영자 문의 |
| CONFLICT_CONTEXT_INSUFFICIENT | 422 | false | 분석에 필요한 컨텍스트 부족 | 추가 메타데이터 제공 |
| CONFLICT_GUIDANCE_NOT_READY | 202 | true | 가이드 생성 중 | 잠시 후 다시 확인 |
| CONFLICT_ESCALATION_REQUIRED | 409 | false | 자동 안내만으로 해결 어려움 | 담당 팀에 에스컬레이션 |

### 7.8 Backout / Revert

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| BACKOUT_NOT_FOUND | 404 | false | Backout 요청 없음 | 요청 확인 |
| BACKOUT_REASON_REQUIRED | 422 | false | 사유 입력 필수 | 사유 입력 |
| BACKOUT_TARGET_REQUIRED | 422 | false | 되돌릴 대상 필수 | PR 또는 commit 선택 |
| BACKOUT_APPROVER_REQUIRED | 422 | false | 승인자 필수 | 승인자 지정 |
| BACKOUT_ALREADY_EXISTS | 409 | false | 동일 대상 Backout 존재 | 기존 요청 확인 |
| BACKOUT_REVERT_PR_GENERATION_FAILED | 503 | true | revert PR 생성 실패 | 재시도 |
| BACKOUT_RELEASE_POLICY_BLOCKED | 403 | false | release 정책상 차단 | 승인 절차 진행 |
| BACKOUT_CONFLICT_PREDICTED | 409 | false | 충돌 가능성 높음 | dry-run 결과 확인 후 진행 |

### 7.9 정책 엔진

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| POLICY_TEMPLATE_NOT_FOUND | 404 | false | 정책 템플릿 없음 | 템플릿 확인 |
| POLICY_RULE_INVALID | 422 | false | 정책 규칙 구성 오류 | 규칙 수정 |
| POLICY_APPLY_SCOPE_INVALID | 422 | false | 적용 대상 오류 | 대상 재선택 |
| POLICY_EXCEPTION_REQUIRED | 422 | false | 예외 정책 정보 부족 | 예외 사유/기간 입력 |
| POLICY_ENFORCEMENT_BLOCKED | 403 | false | 정책상 실행 차단 | 정책 충족 또는 예외 승인 |
| POLICY_VERSION_CONFLICT | 409 | false | 동시 수정 충돌 | 최신 버전 재조회 |

### 7.10 대시보드/분석/비동기 작업

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| DASHBOARD_RANGE_INVALID | 422 | false | 잘못된 조회 기간 | 기간 수정 |
| ANALYTICS_NOT_READY | 202 | true | 집계 준비 중 | 잠시 후 재조회 |
| JOB_NOT_FOUND | 404 | false | 작업 없음 | jobId 확인 |
| JOB_ALREADY_TERMINAL | 409 | false | 이미 종료된 작업 | 결과 조회 |
| JOB_TIMEOUT | 504 | true | 작업 시간 초과 | 재시도 |
| JOB_WORKER_UNAVAILABLE | 503 | true | 워커 불가 | 잠시 후 재시도 |

### 7.11 내부/예상 외 오류

| 코드 | HTTP | retryable | 의미 | 사용자 액션 |
|---|---:|---|---|---|
| INTERNAL_SERVER_ERROR | 500 | false | 예기치 못한 내부 오류 | requestId로 문의 |
| DEPENDENCY_UNAVAILABLE | 503 | true | 내부 의존 서비스 불가 | 잠시 후 재시도 |
| DATABASE_UNAVAILABLE | 503 | true | DB 불가 | 잠시 후 재시도 |
| CACHE_UNAVAILABLE | 503 | true | 캐시 불가 | 잠시 후 재시도 |
| UPSTREAM_TIMEOUT | 504 | true | 외부 호출 시간 초과 | 재시도 |

## 8. 프론트엔드 표시 원칙

### 8.1 사용자 메시지 수준

- 안내: 입력 수정이나 재시도로 해결 가능
- 경고: 정책 또는 품질 요건 미충족
- 오류: 현재 작업 진행 불가
- 장애: 시스템 또는 외부 연동 문제

### 8.2 화면별 처리 원칙

| 상황 | UI 처리 |
|---|---|
| 202 계열 준비 중 | 스켈레톤 또는 “분석 중” 상태 표시 |
| 401 | 로그인 화면 또는 세션 갱신 |
| 403 | 권한 부족 안내 + 요청 경로 제공 |
| 404 | 빈 상태 + 올바른 탐색 링크 제공 |
| 409 | 현재 상태 변경 안내 + 최신 상태 재조회 버튼 |
| 422 | 필드별 오류 표시 |
| 5xx | requestId 포함 장애 안내 |

## 9. 백엔드 구현 원칙

1. 모든 에러 응답에는 `requestId`를 포함한다.
2. 비즈니스 예외는 반드시 공통 에러 클래스로 변환한다.
3. 동일 원인에 대해 서로 다른 코드가 중복되지 않게 한다.
4. 로그에는 내부 stack trace를 남기되 응답에는 숨긴다.
5. 외부 시스템 에러는 가능한 한 우리 도메인 코드로 매핑한다.

## 10. 로그 및 모니터링 표준

에러 발생 시 최소한 다음 필드를 로그와 이벤트에 남겨야 한다.

| 필드 | 설명 |
|---|---|
| requestId | 요청 추적 ID |
| errorCode | 표준 에러 코드 |
| httpStatus | HTTP status |
| actorId | 사용자 또는 시스템 주체 |
| organizationId | 조직 ID |
| repositoryId | 저장소 ID |
| resourceType | PR, branch, backout 등 |
| resourceId | 리소스 식별자 |
| retryable | 재시도 가능 여부 |
| upstream | GitHub, DB, Cache 등 |
| occurredAt | 발생 시각 |

권장 알림 기준은 아래와 같다.

| 조건 | 알림 수준 |
|---|---|
| `GITHUB_API_RATE_LIMITED` 5분 내 반복 | warning |
| `DATABASE_UNAVAILABLE` 발생 | critical |
| `PR_ANALYSIS_FAILED` 비율 급증 | warning |
| `BACKOUT_REVERT_PR_GENERATION_FAILED` 발생 | high |
| `POLICY_VERSION_CONFLICT` 급증 | info |

## 11. 에러 코드 운영 정책

1. 신규 코드는 문서와 OpenAPI에 동시에 반영한다.
2. 코드 삭제 대신 deprecated 표시 후 최소 1개 릴리스 주기 유지한다.
3. 코드명 변경은 금지한다.
4. 다국어 사용자 메시지는 코드 기준으로 관리한다.
5. 프론트는 코드 기준 분기, 문구 기준 분기를 하지 않는다.

## 12. 권장 공통 enum 예시

```ts
export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_TOKEN_EXPIRED"
  | "PERMISSION_DENIED"
  | "GITHUB_APP_NOT_INSTALLED"
  | "REPOSITORY_NOT_FOUND"
  | "PR_ANALYSIS_NOT_READY"
  | "PR_REQUIRED_CHECKS_FAILED"
  | "CONFLICT_GUIDANCE_NOT_READY"
  | "BACKOUT_APPROVER_REQUIRED"
  | "POLICY_ENFORCEMENT_BLOCKED"
  | "JOB_TIMEOUT"
  | "INTERNAL_SERVER_ERROR";
```

## 13. 구현 예시

### 13.1 정책 차단 예시

```json
{
  "error": {
    "code": "POLICY_ENFORCEMENT_BLOCKED",
    "message": "현재 정책에 따라 이 작업을 수행할 수 없습니다.",
    "details": {
      "policyTemplateId": "67e68d30-f29e-483d-b882-76ca88b69555",
      "ruleType": "merge_queue_required"
    },
    "retryable": false,
    "userAction": "merge queue를 사용하거나 예외 승인을 요청하세요."
  },
  "meta": {
    "requestId": "req_01JABCDEF",
    "timestamp": "2026-04-07T10:11:22Z"
  }
}
```

### 13.2 비동기 분석 대기 예시

```json
{
  "error": {
    "code": "ANALYTICS_NOT_READY",
    "message": "분석 결과가 아직 준비되지 않았습니다.",
    "details": {
      "jobId": "d99357d6-c5ec-4e49-a5b8-fc55ce77d7c6"
    },
    "retryable": true,
    "userAction": "잠시 후 다시 조회하세요."
  },
  "meta": {
    "requestId": "req_01JABCDEG",
    "timestamp": "2026-04-07T10:12:22Z"
  }
}
```

## 14. 다음 단계 권장

1. OpenAPI `components/schemas`에 표준 에러 코드 enum 반영
2. 서버 공통 예외 매퍼 구현
3. 프론트 공통 에러 토스트/배너 컴포넌트 구현
4. 운영 알림 룰에 에러 코드 기준 필터 추가
5. 상태 전이 문서 작성

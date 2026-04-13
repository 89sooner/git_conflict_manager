# GitHub Enterprise 전환 지원 도구 내부 API 명세 초안

> **Reference-only.** 이 문서는 초안이며, API 계약의 최종 기준은 `docs/03-api/openapi.yaml`이다.
> 본 문서의 필드 네이밍(예: `request_id`, `pull_request_id`, `backout_request_id`) 및 응답 예시는
> `openapi.yaml`이 사용하는 camelCase (`requestId`, `pullRequestId`, `backoutId`)와 다를 수 있다.
> 구현 시에는 항상 `openapi.yaml`과 `docs/03-api/error_code_standard.md`,
> `docs/03-api/state_transition_spec.md`를 먼저 따른다. 본 문서는 설계 의도 파악 용도로만 사용한다.

## 1. 문서 개요

- 문서명: 내부 API 명세 초안
- 목적: 프론트엔드, 백엔드, 분석 워커, 운영 자동화가 공통으로 사용할 내부 API 계약을 정의한다.
- 범위: MVP 및 MVP 직후 1단계 확장 범위
- 대상 독자: Backend Engineer, Frontend Engineer, Data/Analysis Engineer, Platform Engineer, QA
- API 스타일: REST 우선, 일부 대시보드/검색은 서버 집계형 조회 API로 제공
- 기본 Base Path: `/api/v1`

이 문서는 제품 요구사항 문서가 아니라 구현 계약 초안이다. 화면 요구사항과 일치해야 하지만, 경로 구조와 응답 형식은 실제 구현 난이도와 운영성을 우선한다.

## 2. API 설계 목표

### 2.1 핵심 목표

1. 프론트엔드가 저장소, 브랜치, PR, 충돌, Backout, 정책, 대시보드 화면을 일관된 방식으로 호출할 수 있어야 한다.
2. GitHub 원본 데이터를 그대로 중계하지 않고, 해석/집계/위험도/권장 액션을 포함한 제품화된 응답을 제공해야 한다.
3. 분석 시간이 긴 작업은 비동기 Job 모델로 분리해야 한다.
4. 조직 권한과 저장소 권한을 기준으로 데이터 접근이 통제되어야 한다.
5. 이후 OpenAPI 명세로 기계 변환 가능한 수준의 구조를 제공해야 한다.

### 2.2 비목표

1. GitHub REST/GraphQL API의 완전한 대체 API를 제공하지 않는다.
2. 모든 화면마다 1:1 전용 엔드포인트를 남발하지 않는다.
3. 로컬 Git 저장소 상태를 원격 API만으로 직접 다루지 않는다.
4. 실시간 스트리밍 프로토콜을 MVP에서 필수로 요구하지 않는다.

## 3. 상위 설계 원칙

1. 조회 API와 명령 API를 구분한다.
2. 화면 친화적인 응답을 제공하되, 도메인 무결성을 해치는 과도한 중복은 피한다.
3. `organization_id`, `repository_id`, `pull_request_id` 같은 내부 식별자를 기본으로 사용하고, 필요 시 GitHub 외부 식별자를 함께 반환한다.
4. 위험도, 권장 액션, 정책 위반 정보는 별도 중첩 객체로 표준화한다.
5. 긴 작업은 `job_id`를 발급하고 polling으로 조회한다.
6. 목록 API는 기본적으로 cursor 기반 pagination을 사용한다.
7. 쓰기 API는 가능하면 idempotency key를 지원한다.

## 4. 인증 및 권한 모델

### 4.1 인증

- 사내 SSO/OIDC 로그인 후 세션 또는 bearer token 사용
- 서비스 간 호출은 machine token 사용
- 운영 배치/워커는 내부 서비스 계정 사용

### 4.2 권한 범주

- `developer`: 조회 + 개인 액션
- `reviewer`: 리뷰 관련 조회/추천 확인
- `team_lead`: 팀 지표 조회, 일부 승인
- `platform_operator`: 정책 관리, 전사 대시보드
- `admin`: 시스템 설정, 연동 관리

### 4.3 권한 적용 원칙

1. 조직 접근 권한이 없으면 해당 조직 하위 리소스 전부 숨김 처리
2. 저장소 접근 권한이 없으면 상세 응답 404 또는 403 정책 중 하나로 일관 적용
3. 정책 수정, 예외 승인, backout 승인 같은 작업은 역할 기반으로 별도 제한

## 5. 공통 규약

### 5.1 공통 헤더

요청 헤더 예시:

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-Id: 9c4c8d0a-3dcb-4f2a-9b5a-4b1c42f7bb85
Idempotency-Key: 91e0b35d-c24d-4f03-a4c8-b35f0d8df2a8
```

### 5.2 공통 응답 Envelope

단건 성공 응답:

```json
{
  "data": { ... },
  "meta": {
    "request_id": "9c4c8d0a-3dcb-4f2a-9b5a-4b1c42f7bb85"
  }
}
```

목록 응답:

```json
{
  "data": [ ... ],
  "page": {
    "next_cursor": "eyJvZmZzZXQiOjI1fQ==",
    "has_next": true
  },
  "meta": {
    "request_id": "9c4c8d0a-3dcb-4f2a-9b5a-4b1c42f7bb85"
  }
}
```

에러 응답:

```json
{
  "error": {
    "code": "POLICY_VIOLATION",
    "message": "Release backout requires approver assignment.",
    "details": {
      "field": "approver_ids"
    }
  },
  "meta": {
    "request_id": "9c4c8d0a-3dcb-4f2a-9b5a-4b1c42f7bb85"
  }
}
```

### 5.3 표준 필드

가능하면 아래 필드를 반복 사용한다.

- `id`: 내부 식별자
- `external_id`: GitHub 식별자 또는 외부 시스템 식별자
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`
- `last_synced_at`

### 5.4 시간 형식

- ISO-8601 UTC 문자열 사용
- 예: `2026-04-07T05:15:33Z`

### 5.5 Pagination

- 기본 파라미터: `cursor`, `limit`
- 기본 `limit`: 25
- 최대 `limit`: 100

### 5.6 정렬

- 기본 정렬: 최신 업데이트 우선
- 파라미터: `sort_by`, `sort_order`

### 5.7 필터링

- 단순 equality는 query parameter
- 복합 필터는 명시 필드 사용
- 자유 검색은 `q`

## 6. 공통 도메인 타입

### 6.1 RiskSummary

```json
{
  "level": "high",
  "score": 82,
  "signals": [
    {"code": "LARGE_PR", "label": "대형 PR", "weight": 20},
    {"code": "RELEASE_TARGET", "label": "릴리스 브랜치 대상", "weight": 25}
  ],
  "recommended_actions": [
    "테스트 범위를 확대하세요.",
    "리뷰어를 한 명 추가하세요."
  ]
}
```

### 6.2 PolicyStatus

```json
{
  "is_compliant": false,
  "violations": [
    {
      "code": "MISSING_CODEOWNER_APPROVAL",
      "label": "CODEOWNERS 승인 누락",
      "severity": "high"
    }
  ],
  "applied_templates": [
    {"id": "pt_001", "name": "Release Branch Default"}
  ]
}
```

### 6.3 ActionHint

```json
{
  "type": "rebase_recommended",
  "label": "최신 main 반영 필요",
  "description": "현재 브랜치는 main 대비 5 commits behind 입니다.",
  "priority": "medium"
}
```

## 7. 인증/세션 API

### 7.1 현재 사용자 정보 조회

`GET /api/v1/me`

응답:

```json
{
  "data": {
    "id": "usr_001",
    "name": "홍길동",
    "email": "hong@example.com",
    "roles": ["developer"],
    "organizations": [
      {"id": "org_001", "name": "Semiconductor Platform"}
    ]
  }
}
```

### 7.2 현재 사용자 홈 요약

`GET /api/v1/me/home-summary`

설명:
- 홈 화면 초기 진입용 집계 API
- 다수 위젯 호출을 한 번에 줄이기 위한 서버 집계형 엔드포인트

## 8. 조직 및 저장소 API

### 8.1 조직 목록 조회

`GET /api/v1/organizations`

### 8.2 조직 상세 조회

`GET /api/v1/organizations/{organization_id}`

### 8.3 저장소 목록 조회

`GET /api/v1/repositories?q=&team_id=&status=&cursor=&limit=`

응답 항목 예시:

```json
{
  "data": [
    {
      "id": "repo_001",
      "name": "soc-boot",
      "default_branch": "main",
      "owner_team": {"id": "team_01", "name": "Boot Team"},
      "open_pull_request_count": 12,
      "risk_pull_request_count": 3,
      "last_synced_at": "2026-04-07T05:15:33Z"
    }
  ]
}
```

### 8.4 저장소 홈 조회

`GET /api/v1/repositories/{repository_id}/summary`

포함 내용:
- 기본 정보
- 브랜치 상태 요약
- 품질 상태 요약
- 정책 상태 요약
- 최근 이벤트
- 상위 위험 PR

### 8.5 저장소 최근 이벤트 조회

`GET /api/v1/repositories/{repository_id}/events?types=pull_request,backout,conflict&cursor=&limit=`

## 9. 브랜치 및 히스토리 API

### 9.1 브랜치 목록 조회

`GET /api/v1/repositories/{repository_id}/branches?category=feature|release|default|hotfix&status=active|stale&cursor=&limit=`

### 9.2 브랜치 상세 조회

`GET /api/v1/branches/{branch_id}`

응답 예시:

```json
{
  "data": {
    "id": "br_001",
    "name": "feature/payment",
    "repository_id": "repo_001",
    "head_commit": {
      "sha": "a1b2c3d4",
      "message": "payment: add retry guard"
    },
    "comparison": {
      "base_branch": "main",
      "ahead_by": 3,
      "behind_by": 2,
      "is_diverged": true
    },
    "connected_pull_request": {
      "id": "pr_0099",
      "number": 99,
      "status": "open"
    },
    "risk": {
      "level": "medium",
      "score": 55,
      "signals": [
        {"code": "STALE_BASE", "label": "최신 main 미반영", "weight": 20}
      ],
      "recommended_actions": [
        "main을 반영한 뒤 PR 상태를 다시 확인하세요."
      ]
    },
    "action_hints": [
      {
        "type": "update_branch",
        "label": "브랜치 업데이트 권장",
        "description": "현재 브랜치는 main 대비 2 commits behind 입니다.",
        "priority": "medium"
      }
    ]
  }
}
```

### 9.3 브랜치 비교 조회

`GET /api/v1/branches/{branch_id}/compare?base_branch=main`

포함 내용:
- ahead/behind
- diverged 여부
- 파일 수 요약
- 주요 위험 신호
- 권장 작업

### 9.4 브랜치 히스토리 그래프 조회

`GET /api/v1/branches/{branch_id}/graph?base_branch=main&depth=100`

응답 예시:

```json
{
  "data": {
    "nodes": [
      {"sha": "A", "parents": [], "labels": []},
      {"sha": "B", "parents": ["A"], "labels": []},
      {"sha": "C", "parents": ["B"], "labels": ["main"]},
      {"sha": "D", "parents": ["C"], "labels": []},
      {"sha": "E", "parents": ["D"], "labels": ["feature/payment", "HEAD"]}
    ],
    "interpretation": {
      "summary": "현재 브랜치는 main에서 갈라진 뒤 2개의 커밋이 추가되었습니다.",
      "base_branch": "main"
    }
  }
}
```

### 9.5 브랜치 작업 시뮬레이션 조회

`POST /api/v1/branches/{branch_id}/simulate`

요청 예시:

```json
{
  "operation": "rebase",
  "base_branch": "main"
}
```

응답 예시:

```json
{
  "data": {
    "operation": "rebase",
    "estimated_result": {
      "conflict_probability": "medium",
      "affected_commits": 3,
      "affected_files": 12
    },
    "summary": "현재 브랜치를 main 위로 rebase할 경우 build/config 영역에서 충돌 가능성이 있습니다."
  }
}
```

## 10. Pull Request API

### 10.1 PR 목록 조회

`GET /api/v1/pull-requests?repository_id=&author_id=&review_state=&risk_level=&target_branch=&status=&cursor=&limit=&q=`

### 10.2 내 PR 목록 조회

`GET /api/v1/me/pull-requests?status=open|merged|closed`

### 10.3 내 리뷰 요청 목록 조회

`GET /api/v1/me/review-requests?status=pending|overdue`

### 10.4 PR 상세 조회

`GET /api/v1/pull-requests/{pull_request_id}`

포함 내용:
- 기본 정보
- source/base branch
- 작성자/리뷰어/승인 상태
- 체크 상태
- 영향 분석 요약
- 위험도
- 정책 준수 상태
- 관련 이슈/빌드/문서 링크

### 10.5 PR 변경 파일 조회

`GET /api/v1/pull-requests/{pull_request_id}/files?cursor=&limit=`

### 10.6 PR 영향 분석 조회

`GET /api/v1/pull-requests/{pull_request_id}/impact`

응답 예시:

```json
{
  "data": {
    "subsystems": ["driver", "build-config"],
    "targets": ["soc_a", "soc_b"],
    "recommended_tests": [
      "driver_regression_soc_a",
      "full_boot_smoke_soc_b"
    ],
    "sensitive_paths": [
      {"path": "boards/soc_a/linker.ld", "reason": "linker script 변경"}
    ]
  }
}
```

### 10.7 PR 위험도 조회

`GET /api/v1/pull-requests/{pull_request_id}/risk`

### 10.8 PR 리뷰 준비 상태 조회

`GET /api/v1/pull-requests/{pull_request_id}/review-readiness`

### 10.9 PR 생성 보조 조회

`POST /api/v1/pull-requests/draft-assistant`

요청 예시:

```json
{
  "repository_id": "repo_001",
  "source_branch": "feature/payment",
  "base_branch": "main"
}
```

응답 예시:

```json
{
  "data": {
    "recommended_reviewers": [
      {"id": "usr_101", "name": "김리뷰", "reason": "CODEOWNERS + 최근 변경 이력"}
    ],
    "suggested_title": "[driver] payment retry guard 추가",
    "checklist": [
      "영향 타깃 빌드를 확인했습니다.",
      "필수 테스트를 실행했습니다."
    ],
    "policy_warnings": [
      "release 브랜치를 base로 선택하지 않았는지 확인하세요."
    ]
  }
}
```

### 10.10 PR 분석 재실행 요청

`POST /api/v1/pull-requests/{pull_request_id}/recompute`

응답:

```json
{
  "data": {
    "job_id": "job_001",
    "status": "queued"
  }
}
```

## 11. 리뷰어 추천 및 CODEOWNERS API

### 11.1 추천 리뷰어 조회

`GET /api/v1/pull-requests/{pull_request_id}/reviewer-suggestions`

### 11.2 CODEOWNERS 분석 조회

`GET /api/v1/pull-requests/{pull_request_id}/codeowners-status`

응답 예시:

```json
{
  "data": {
    "required_owners": [
      {"team_id": "team_boot", "team_name": "Boot Team", "matched_paths": ["boot/**"]}
    ],
    "approved_owners": [],
    "missing_owners": [
      {"team_id": "team_boot", "team_name": "Boot Team"}
    ]
  }
}
```

## 12. 충돌 지원 API

### 12.1 충돌 케이스 목록 조회

`GET /api/v1/conflicts?repository_id=&type=merge|rebase|cherry-pick&status=open|resolved&cursor=&limit=`

### 12.2 충돌 케이스 상세 조회

`GET /api/v1/conflicts/{conflict_case_id}`

포함 내용:
- 충돌 유형
- 관련 브랜치/PR/commit
- 현재 상태 해석
- 충돌 파일 목록
- 위험 경고
- 권장 절차
- 중단/복구 절차

### 12.3 충돌 해석 생성 요청

`POST /api/v1/conflicts/interpret`

요청 예시:

```json
{
  "repository_id": "repo_001",
  "type": "rebase",
  "source_branch": "feature/payment",
  "base_branch": "main",
  "commit_sha": "abc1234",
  "conflict_files": [
    "drivers/uart/uart_init.c",
    "build/build.cfg"
  ]
}
```

응답:

```json
{
  "data": {
    "job_id": "job_conf_01",
    "status": "queued"
  }
}
```

### 12.4 충돌 hotspot 조회

`GET /api/v1/repositories/{repository_id}/conflict-hotspots?period=30d`

## 13. Backout / Revert API

### 13.1 Backout 대상 검색

`GET /api/v1/backouts/candidates?repository_id=&target_branch=&type=pull_request|commit&q=&cursor=&limit=`

### 13.2 PR 단위 Backout 초안 생성

`POST /api/v1/backouts/from-pull-request`

요청 예시:

```json
{
  "pull_request_id": "pr_1187",
  "target_branch": "main",
  "reason": "boot regression on soc_a",
  "incident_ticket": "INC-24017",
  "urgency": "high"
}
```

응답 예시:

```json
{
  "data": {
    "backout_request_id": "bo_0001",
    "status": "draft",
    "revert_strategy": "pull_request_revert",
    "impact_summary": {
      "subsystems": ["bootloader"],
      "targets": ["soc_a"]
    }
  }
}
```

### 13.3 Commit 단위 Backout 초안 생성

`POST /api/v1/backouts/from-commits`

요청 예시:

```json
{
  "repository_id": "repo_001",
  "target_branch": "release/2026.04",
  "commit_shas": ["a1b2c3d4", "e5f6g7h8"],
  "reason": "release regression",
  "incident_ticket": "INC-24018",
  "urgency": "critical"
}
```

### 13.4 Backout 상세 조회

`GET /api/v1/backouts/{backout_request_id}`

### 13.5 Backout 영향 분석 조회

`GET /api/v1/backouts/{backout_request_id}/impact`

### 13.6 Backout 승인 요청

`POST /api/v1/backouts/{backout_request_id}/submit`

설명:
- draft 상태를 approval_pending 또는 ready 상태로 전환

### 13.7 Backout 승인

`POST /api/v1/backouts/{backout_request_id}/approve`

### 13.8 Backout 거절

`POST /api/v1/backouts/{backout_request_id}/reject`

### 13.9 Revert PR 생성

`POST /api/v1/backouts/{backout_request_id}/generate-revert-pr`

응답 예시:

```json
{
  "data": {
    "backout_request_id": "bo_0001",
    "generated_pull_request": {
      "id": "pr_1302",
      "number": 1302,
      "url": "https://github.example.com/org/repo/pull/1302"
    },
    "status": "pr_generated"
  }
}
```

### 13.10 Backout 정합성 추적 조회

`GET /api/v1/backouts/{backout_request_id}/consistency`

포함 내용:
- main/release 간 반영 불일치
- 후속 조치 권장

## 14. 릴리스 운영 API

### 14.1 릴리스 브랜치 목록 조회

`GET /api/v1/releases/branches?repository_id=&status=active|closed`

### 14.2 릴리스 대시보드 조회

`GET /api/v1/releases/branches/{branch_id}/summary`

### 14.3 Backport 후보 조회

`GET /api/v1/releases/branches/{branch_id}/backport-candidates?status=pending|recommended`

### 14.4 Backport 초안 생성

`POST /api/v1/backports`

### 14.5 Backport 상세 조회

`GET /api/v1/backports/{backport_request_id}`

## 15. 정책 관리 API

### 15.1 정책 템플릿 목록 조회

`GET /api/v1/policies/templates?scope=organization|repository&type=branch|review|quality|exception`

### 15.2 정책 템플릿 상세 조회

`GET /api/v1/policies/templates/{policy_template_id}`

### 15.3 정책 템플릿 생성

`POST /api/v1/policies/templates`

요청 예시:

```json
{
  "name": "Release Branch Default",
  "type": "branch",
  "scope": "organization",
  "rules": {
    "require_merge_queue": true,
    "require_codeowner_approval": true,
    "block_direct_push": true
  }
}
```

### 15.4 정책 템플릿 수정

`PATCH /api/v1/policies/templates/{policy_template_id}`

### 15.5 정책 바인딩 생성

`POST /api/v1/policies/bindings`

### 15.6 정책 예외 요청 생성

`POST /api/v1/policies/exceptions`

### 15.7 정책 예외 승인

`POST /api/v1/policies/exceptions/{exception_request_id}/approve`

### 15.8 정책 준수 상태 조회

`GET /api/v1/repositories/{repository_id}/policy-status`

## 16. 운영 대시보드 API

### 16.1 전사 KPI 조회

`GET /api/v1/dashboards/organization-overview?organization_id=&period=7d|30d|90d`

### 16.2 팀별 KPI 조회

`GET /api/v1/dashboards/teams?organization_id=&period=30d&sort_by=lead_time`

### 16.3 저장소별 KPI 조회

`GET /api/v1/dashboards/repositories?organization_id=&period=30d`

### 16.4 PR 흐름 분석 조회

`GET /api/v1/dashboards/pull-request-flow?organization_id=&repository_id=&period=30d`

### 16.5 충돌 분석 조회

`GET /api/v1/dashboards/conflicts?organization_id=&repository_id=&period=30d`

### 16.6 Backout 분석 조회

`GET /api/v1/dashboards/backouts?organization_id=&period=30d`

### 16.7 정책 위반 분석 조회

`GET /api/v1/dashboards/policy-violations?organization_id=&period=30d`

### 16.8 hotspot 조회

`GET /api/v1/dashboards/hotspots?organization_id=&period=30d&type=files|modules`

### 16.9 리포트 생성 요청

`POST /api/v1/reports`

## 17. 알림 API

### 17.1 내 알림 목록 조회

`GET /api/v1/notifications?status=unread|all&cursor=&limit=`

### 17.2 알림 읽음 처리

`POST /api/v1/notifications/{notification_id}/read`

### 17.3 알림 설정 조회

`GET /api/v1/me/notification-preferences`

### 17.4 알림 설정 수정

`PATCH /api/v1/me/notification-preferences`

## 18. 학습 센터 API

### 18.1 개념 카드 목록 조회

`GET /api/v1/learning/concepts`

### 18.2 플레이북 목록 조회

`GET /api/v1/learning/playbooks?category=pr|conflict|backout|release`

### 18.3 플레이북 상세 조회

`GET /api/v1/learning/playbooks/{playbook_id}`

### 18.4 시뮬레이터 시나리오 목록 조회

`GET /api/v1/learning/simulations`

## 19. 관리 API

### 19.1 GitHub App 연동 상태 조회

`GET /api/v1/admin/integrations/github-app`

### 19.2 GitHub App 설치 저장소 동기화 요청

`POST /api/v1/admin/integrations/github-app/sync-installations`

### 19.3 CI 연동 상태 조회

`GET /api/v1/admin/integrations/ci`

### 19.4 시스템 헬스 조회

`GET /api/v1/admin/system/health`

### 19.5 감사 로그 조회

`GET /api/v1/admin/audit-logs?actor_id=&action=&cursor=&limit=`

## 20. 비동기 Job API

### 20.1 Job 조회

`GET /api/v1/jobs/{job_id}`

응답 예시:

```json
{
  "data": {
    "id": "job_001",
    "type": "pull_request_recompute",
    "status": "running",
    "progress": 65,
    "result_resource": null,
    "error": null,
    "created_at": "2026-04-07T05:15:33Z",
    "updated_at": "2026-04-07T05:16:12Z"
  }
}
```

### 20.2 Job 결과 링크 규칙

Job 완료 시 `result_resource`에 아래 중 하나를 포함한다.

```json
{
  "type": "pull_request",
  "id": "pr_0099",
  "path": "/api/v1/pull-requests/pr_0099"
}
```

## 21. 내부 전용 이벤트/웹훅 수신 API

이 섹션은 외부 공개 API가 아니라 서비스 내부 전용 엔드포인트다.

### 21.1 GitHub webhook 수신

`POST /internal/webhooks/github`

규칙:
- GitHub 서명 검증 필수
- 원문 payload 저장
- 중복 delivery 방지
- 비즈니스 처리는 비동기 queue 전달

### 21.2 CI 결과 수신

`POST /internal/webhooks/ci`

### 21.3 수동 재동기화 트리거

`POST /internal/sync/repository`

## 22. 에러 코드 체계

| 코드 | 의미 | HTTP |
|---|---|---|
| UNAUTHORIZED | 인증 실패 | 401 |
| FORBIDDEN | 권한 부족 | 403 |
| NOT_FOUND | 리소스 없음 | 404 |
| VALIDATION_ERROR | 입력값 오류 | 400 |
| CONFLICT_STATE | 현재 상태와 충돌 | 409 |
| POLICY_VIOLATION | 정책 위반 | 422 |
| RATE_LIMITED | 호출 제한 | 429 |
| UPSTREAM_UNAVAILABLE | GitHub 또는 CI 연동 장애 | 503 |
| INTERNAL_ERROR | 내부 처리 오류 | 500 |

## 23. 쓰기 API의 상태 전이 규칙

### 23.1 BackoutRequest 상태

```text
Draft -> ApprovalPending -> Approved -> RevertPrGenerated -> Merged
                     \-> Rejected
```

### 23.2 PolicyException 상태

```text
Requested -> Approved -> Active -> Expired
         \-> Rejected
```

### 23.3 Job 상태

```text
Queued -> Running -> Succeeded
      \-> Failed
      \-> Cancelled
```

## 24. 캐시 및 일관성 규칙

1. 저장소 목록/요약은 짧은 TTL 캐시 허용
2. PR 상세와 정책 상태는 가능하면 최신 동기화 결과 사용
3. 위험도/영향 분석은 지연 허용 가능하지만 `generated_at`을 표시
4. GitHub webhook 수신 후 해당 리소스 캐시는 즉시 무효화

## 25. API 보안 요구사항

1. 모든 요청은 인증 필요
2. 민감 쓰기 API는 CSRF 또는 bearer-only 정책을 명확히 적용
3. 관리자 API는 별도 역할 확인과 감사 로그 기록 필수
4. backout, 정책 예외 승인, 연동 설정 변경은 actor 정보와 변경 전후 값 저장 필수
5. 응답에서 GitHub token, webhook secret, 내부 인프라 정보는 절대 노출 금지

## 26. 관측성 요구사항

각 API 호출에 대해 아래 메트릭을 수집한다.

- request count
- latency p50/p95/p99
- error rate
- upstream dependency latency
- cache hit ratio
- job queue depth

로그에는 아래 필드를 포함한다.

- request_id
- user_id 또는 service_id
- route
- status_code
- duration_ms
- organization_id
- repository_id

## 27. MVP 범위에 실제 포함할 엔드포인트

### 27.1 반드시 구현

- `GET /api/v1/me`
- `GET /api/v1/me/home-summary`
- `GET /api/v1/repositories`
- `GET /api/v1/repositories/{repository_id}/summary`
- `GET /api/v1/branches/{branch_id}`
- `GET /api/v1/branches/{branch_id}/graph`
- `GET /api/v1/pull-requests`
- `GET /api/v1/pull-requests/{pull_request_id}`
- `GET /api/v1/pull-requests/{pull_request_id}/impact`
- `GET /api/v1/pull-requests/{pull_request_id}/risk`
- `GET /api/v1/pull-requests/{pull_request_id}/review-readiness`
- `GET /api/v1/pull-requests/{pull_request_id}/reviewer-suggestions`
- `GET /api/v1/pull-requests/{pull_request_id}/codeowners-status`
- `GET /api/v1/conflicts/{conflict_case_id}`
- `POST /api/v1/conflicts/interpret`
- `POST /api/v1/backouts/from-pull-request`
- `GET /api/v1/backouts/{backout_request_id}`
- `GET /api/v1/backouts/{backout_request_id}/impact`
- `POST /api/v1/backouts/{backout_request_id}/submit`
- `POST /api/v1/backouts/{backout_request_id}/generate-revert-pr`
- `GET /api/v1/policies/templates`
- `GET /api/v1/repositories/{repository_id}/policy-status`
- `GET /api/v1/dashboards/organization-overview`
- `GET /api/v1/dashboards/conflicts`
- `GET /api/v1/dashboards/backouts`
- `GET /api/v1/jobs/{job_id}`

### 27.2 MVP 이후

- Commit 단위 batch backout 고도화
- release/backport 상세 워크플로우 API
- 정책 예외 승인 전체 흐름
- 리포트 생성/내보내기
- 학습 시뮬레이터 상태 저장

## 28. 구현 순서 권장안

1. 인증/권한 공통 미들웨어
2. 저장소/브랜치/PR 읽기 API
3. PR 위험도/영향 분석 API
4. 리뷰어 추천/CODEOWNERS API
5. 충돌 지원 API
6. Backout API
7. 정책 조회 API
8. 대시보드 집계 API
9. 관리자/운영 API

## 29. 프론트엔드 연동 팁

1. 홈 화면은 `home-summary` 하나로 초기 렌더를 빠르게 시작하고, 상세 위젯은 필요 시 추가 조회한다.
2. PR 상세는 탭별 lazy loading을 허용하되, 상단 요약 카드와 위험도는 첫 응답에 포함한다.
3. 충돌/Backout 화면은 쓰기 액션 전 confirmation step을 별도로 둔다.
4. 긴 작업은 Job polling 공통 훅으로 통합한다.

## 30. 다음 단계

이 문서 다음 단계는 아래 순서가 적절하다.

1. OpenAPI 3.1 YAML 초안 작성
2. 프론트엔드 타입 생성 규칙 확정
3. 에러 코드 enum 및 서버 표준 미들웨어 정의
4. API별 mock response 생성
5. MVP 우선 엔드포인트 상세 request/response JSON schema 확정

# GitHub Enterprise 전환 지원 도구 데이터 모델 및 DB 스키마 초안

## 1. 문서 개요

- 문서명: 데이터 모델 및 DB 스키마 초안
- 목적: GitHub Enterprise 전환 지원 도구의 MVP 및 2단계 기능 구현을 위한 공통 데이터 모델, 저장 전략, 테이블 구조, 인덱스 전략, 이벤트 처리 경계 정의
- 대상 독자: Backend, Frontend, Data/Analysis, DevOps, Product, QA
- 전제: PostgreSQL 기반 운영 DB + Redis 캐시 + 비동기 워커 구조
- 문서 범위: 운영 스키마 중심, 분석 웨어하우스는 최소 범위만 포함

---

## 2. 설계 목표

### 2.1 핵심 목표

1. GitHub App 웹훅 이벤트를 유실 없이 수집하고 재처리 가능하게 저장한다.
2. 저장소, 브랜치, PR, 리뷰, 정책, 충돌, Backout을 일관된 도메인 모델로 관리한다.
3. 제품 UI의 핵심 조회 패턴에 맞는 읽기 성능을 확보한다.
4. 운영 데이터와 분석 데이터의 경계를 분리하되, MVP에서는 하나의 PostgreSQL로 시작할 수 있게 한다.
5. 감사 추적과 변경 이력을 보존한다.

### 2.2 비목표

1. Git 전체 객체 데이터베이스를 복제하지 않는다.
2. GitHub API 응답 원문 전체를 장기 정규화하지 않는다.
3. 초기에 OLAP급 대규모 분석 스키마까지 한 번에 설계하지 않는다.

---

## 3. 아키텍처 가정

### 3.1 저장소 구성

- 운영 DB: PostgreSQL
- 캐시: Redis
- 비정형 원문 저장: Object Storage 또는 JSONB 컬럼
- 비동기 처리: 메시지 큐 또는 잡 테이블
- 검색: 초기에는 PostgreSQL FTS 또는 trigram, 이후 OpenSearch 확장 가능

### 3.2 스키마 원칙

1. 외부 식별자와 내부 식별자를 분리한다.
2. GitHub 원본 객체는 `github_*_id` 또는 `github_node_id`를 보존한다.
3. 상태성 엔티티는 현재 상태 테이블과 이력 테이블을 분리한다.
4. 웹훅 이벤트는 원문 payload 보존을 기본으로 한다.
5. 삭제 대신 soft delete 또는 상태 전이를 우선한다.

---

## 4. 도메인 모델 개요

핵심 도메인은 아래와 같다.

- 조직(Organization)
- 팀(Team)
- 사용자(User)
- 저장소(Repository)
- 브랜치(Branch)
- 커밋(Commit)
- Pull Request(PR)
- PR 리뷰(PR Review)
- PR 체크(PR Check / Gate)
- 정책(Policy)
- 예외(Policy Exception)
- 충돌 사례(Conflict Case)
- Backout 요청(Backout Request)
- Backout 실행(Backout Execution)
- 릴리스 브랜치(Release Branch)
- 동기화 작업(Sync Job)
- 웹훅 이벤트(Webhook Event)
- 알림(Notification)
- 감사 로그(Audit Log)

---

## 5. ERD 수준 관계 요약

```text
Organization
 ├─ Team
 │   └─ TeamMember
 ├─ User
 ├─ Repository
 │   ├─ Branch
 │   ├─ PullRequest
 │   │   ├─ PullRequestCommit
 │   │   ├─ PullRequestFile
 │   │   ├─ PullRequestReview
 │   │   ├─ PullRequestReviewer
 │   │   ├─ PullRequestCheck
 │   │   ├─ PullRequestRisk
 │   │   └─ PullRequestLabel
 │   ├─ Commit
 │   ├─ ConflictCase
 │   ├─ BackoutRequest
 │   ├─ ReleaseBranch
 │   └─ RepositoryPolicyBinding
 ├─ PolicyTemplate
 ├─ PolicyException
 ├─ WebhookEvent
 ├─ SyncJob
 ├─ Notification
 └─ AuditLog
```

---

## 6. 핵심 식별자 전략

### 6.1 내부 PK

모든 주요 테이블은 `bigserial` 또는 `uuid`를 내부 PK로 사용한다.
권장:
- 운영 테이블 PK: `bigserial`
- 외부 공개/클라이언트 참조용 ID: `uuid`

예시 컬럼:
- `id bigint primary key`
- `public_id uuid not null unique`

### 6.2 외부 식별자

GitHub 객체는 가능하면 아래를 함께 저장한다.

- `github_id bigint`
- `github_node_id text`
- `github_number integer` (PR number 등 사람 친화 ID)
- `full_name text` (`org/repo`)

이유:
- REST API와 GraphQL을 혼용할 때 유연함 확보
- 웹훅 payload 재처리 시 빠른 매핑 가능

---

## 7. 스키마 제안

권장 논리 스키마:

- `core`: 조직, 사용자, 저장소, 브랜치, PR 등 핵심 엔티티
- `integration`: 웹훅 이벤트, 동기화 작업, 외부 원문 데이터
- `policy`: 정책, 예외, 바인딩
- `ops`: 알림, 감사 로그, 운영성 데이터
- `analytics`: 사전 계산 지표, 읽기 최적화 테이블

MVP에서는 단일 스키마로 시작해도 되지만, 테이블 prefix는 유지하는 것이 좋다.

---

## 8. 테이블 상세 정의

## 8.1 조직 및 사용자 영역

### 8.1.1 `core_organizations`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| github_org_id | bigint unique | GitHub 조직 ID |
| github_node_id | text null | GraphQL node ID |
| login | text unique | 조직 slug |
| display_name | text | 표시명 |
| ghes_base_url | text | GitHub Enterprise base URL |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

인덱스:
- `ux_core_organizations_login`
- `ux_core_organizations_github_org_id`

### 8.1.2 `core_users`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| github_user_id | bigint unique null | GitHub 사용자 ID |
| github_node_id | text null | node ID |
| login | text unique | GitHub login |
| email | citext null | 이메일 |
| display_name | text null | 표시명 |
| avatar_url | text null | 아바타 |
| user_type | text | human/app/system |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

### 8.1.3 `core_teams`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| organization_id | bigint fk | 소속 조직 |
| github_team_id | bigint unique null | GitHub team ID |
| slug | text | 팀 slug |
| name | text | 팀명 |
| parent_team_id | bigint null fk self | 상위 팀 |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

유니크:
- `(organization_id, slug)`

### 8.1.4 `core_team_members`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| team_id | bigint fk | 팀 |
| user_id | bigint fk | 사용자 |
| role | text | member/maintainer |
| joined_at | timestamptz | 가입 시점 |
| left_at | timestamptz null | 탈퇴 시점 |
| is_active | boolean | 활성 여부 |

유니크:
- `(team_id, user_id, is_active)` partial unique on active

---

## 8.2 저장소 및 브랜치 영역

### 8.2.1 `core_repositories`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| organization_id | bigint fk | 소속 조직 |
| github_repo_id | bigint unique | GitHub 저장소 ID |
| github_node_id | text null | node ID |
| name | text | 저장소명 |
| full_name | text unique | org/repo |
| default_branch_name | text | 기본 브랜치 |
| visibility | text | private/internal/public |
| is_archived | boolean | 보관 여부 |
| is_disabled | boolean | 비활성 여부 |
| primary_language | text null | 주요 언어 |
| topics | text[] null | 토픽 |
| installed_app_id | bigint null | 설치 App ID 매핑 |
| last_synced_at | timestamptz null | 동기화 시각 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(organization_id, name)`
- `(organization_id, default_branch_name)`

### 8.2.2 `core_repository_team_bindings`

저장소와 소유 팀/운영 팀/리뷰 팀의 관계를 명시한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| team_id | bigint fk | 팀 |
| binding_type | text | owner/reviewer/release/quality |
| is_primary | boolean | 대표 여부 |
| created_at | timestamptz | 생성 |

### 8.2.3 `core_branches`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| repository_id | bigint fk | 저장소 |
| name | text | 브랜치명 |
| branch_type | text | main/release/develop/feature/hotfix/other |
| head_commit_sha | varchar(64) null | 현재 HEAD SHA |
| is_default | boolean | 기본 브랜치 여부 |
| is_protected | boolean | 보호 여부 |
| protection_snapshot | jsonb null | 보호 규칙 스냅샷 |
| ahead_count | integer default 0 | 기본 base 기준 ahead |
| behind_count | integer default 0 | 기본 base 기준 behind |
| compared_to_branch_id | bigint null fk self | 비교 기준 브랜치 |
| is_deleted | boolean | 삭제 여부 |
| last_commit_at | timestamptz null | 마지막 커밋 시각 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

유니크:
- `(repository_id, name)`

인덱스:
- `(repository_id, branch_type)`
- `(repository_id, is_protected)`
- `(repository_id, updated_at desc)`

### 8.2.4 `core_branch_comparisons`

브랜치 비교 결과를 캐시한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| source_branch_id | bigint fk | 기준 브랜치 |
| target_branch_id | bigint fk | 비교 대상 |
| ahead_count | integer | ahead |
| behind_count | integer | behind |
| diverged | boolean | 분기 여부 |
| comparison_status | text | synced/ahead/behind/diverged |
| compared_at | timestamptz | 계산 시각 |
| payload | jsonb null | 추가 결과 |

유니크:
- `(source_branch_id, target_branch_id)`

---

## 8.3 커밋 영역

### 8.3.1 `core_commits`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| sha | varchar(64) | 커밋 SHA |
| short_sha | varchar(16) | 축약 SHA |
| github_node_id | text null | node ID |
| author_user_id | bigint null fk | 작성자 사용자 |
| committer_user_id | bigint null fk | 커미터 사용자 |
| author_name | text | 작성자 이름 |
| author_email | text | 작성자 이메일 |
| committer_name | text | 커미터 이름 |
| committer_email | text | 커미터 이메일 |
| message_title | text | 제목 |
| message_body | text null | 본문 |
| committed_at | timestamptz | 커밋 시각 |
| parent_count | integer | 부모 수 |
| is_merge_commit | boolean | merge commit 여부 |
| stats_additions | integer null | 추가 라인 |
| stats_deletions | integer null | 삭제 라인 |
| stats_total | integer null | 총 변경 |
| raw_payload | jsonb null | 원본 일부 |
| created_at | timestamptz | 생성 |

유니크:
- `(repository_id, sha)`

인덱스:
- `(repository_id, committed_at desc)`
- `(repository_id, is_merge_commit)`

### 8.3.2 `core_commit_parents`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| commit_id | bigint fk | 자식 커밋 |
| parent_commit_id | bigint fk | 부모 커밋 |
| parent_order | integer | 부모 순서 |

PK:
- `(commit_id, parent_order)`

---

## 8.4 Pull Request 영역

### 8.4.1 `core_pull_requests`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| repository_id | bigint fk | 저장소 |
| github_pr_id | bigint unique | GitHub PR ID |
| github_node_id | text null | node ID |
| github_number | integer | PR 번호 |
| title | text | 제목 |
| body | text null | 본문 |
| state | text | open/closed/merged/draft |
| is_draft | boolean | 드래프트 여부 |
| author_user_id | bigint null fk | 작성자 |
| base_branch_id | bigint null fk | base 브랜치 |
| head_branch_id | bigint null fk | head 브랜치 |
| base_ref_name | text | base ref |
| head_ref_name | text | head ref |
| base_sha | varchar(64) | base sha |
| head_sha | varchar(64) | head sha |
| merge_commit_sha | varchar(64) null | merge commit sha |
| merged_by_user_id | bigint null fk | 병합자 |
| mergeable_state | text null | GitHub mergeable state |
| merge_queue_state | text null | queue 상태 |
| review_decision | text null | approved/changes_requested/review_required |
| additions | integer default 0 | 추가 |
| deletions | integer default 0 | 삭제 |
| changed_files_count | integer default 0 | 파일 수 |
| commits_count | integer default 0 | 커밋 수 |
| comments_count | integer default 0 | 댓글 수 |
| review_comments_count | integer default 0 | 리뷰 댓글 수 |
| merged_at | timestamptz null | 병합 시각 |
| closed_at | timestamptz null | 종료 시각 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |
| last_synced_at | timestamptz null | 동기화 시각 |

유니크:
- `(repository_id, github_number)`

인덱스:
- `(repository_id, state, updated_at desc)`
- `(repository_id, author_user_id, updated_at desc)`
- `(repository_id, base_ref_name, state)`
- `(repository_id, merged_at desc)`

### 8.4.2 `core_pull_request_commits`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint fk | PR |
| commit_id | bigint fk | 커밋 |
| commit_order | integer | 순서 |
| created_at | timestamptz | 생성 |

유니크:
- `(pull_request_id, commit_id)`
- `(pull_request_id, commit_order)`

### 8.4.3 `core_pull_request_files`

PR 파일 단위 분석, hotspot, 영향 분석의 기반 테이블.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint fk | PR |
| path | text | 파일 경로 |
| previous_path | text null | rename 이전 경로 |
| change_type | text | added/modified/removed/renamed/copied |
| additions | integer | 추가 |
| deletions | integer | 삭제 |
| changes | integer | 총 변경 |
| patch_excerpt | text null | 부분 patch |
| file_extension | text null | 확장자 |
| top_level_dir | text null | 최상위 디렉터리 |
| module_name | text null | 파생 모듈명 |
| is_generated | boolean default false | 생성 파일 여부 |
| is_binary | boolean default false | 바이너리 여부 |
| is_sensitive_path | boolean default false | 민감 경로 여부 |
| created_at | timestamptz | 생성 |

인덱스:
- `(pull_request_id)`
- `(top_level_dir)`
- `(module_name)`
- `(is_sensitive_path)`
- `gin(path gin_trgm_ops)` 권장

### 8.4.4 `core_pull_request_reviews`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint fk | PR |
| github_review_id | bigint unique | GitHub review ID |
| reviewer_user_id | bigint null fk | 리뷰어 |
| state | text | approved/changes_requested/commented/dismissed/pending |
| body | text null | 본문 |
| submitted_at | timestamptz null | 제출 시각 |
| dismissed_at | timestamptz null | dismiss 시각 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(pull_request_id, submitted_at desc)`
- `(reviewer_user_id, submitted_at desc)`

### 8.4.5 `core_pull_request_reviewers`

요청 리뷰어와 실승인 리뷰어를 별도 관리한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint fk | PR |
| reviewer_user_id | bigint null fk | 사용자 리뷰어 |
| reviewer_team_id | bigint null fk | 팀 리뷰어 |
| request_type | text | requested/codeowner/recommended/manual |
| status | text | pending/accepted/completed/removed |
| requested_at | timestamptz | 요청 시각 |
| completed_at | timestamptz null | 완료 시각 |

인덱스:
- `(pull_request_id, status)`
- `(reviewer_user_id, status)`
- `(reviewer_team_id, status)`

### 8.4.6 `core_pull_request_checks`

required checks 및 내부 품질 게이트의 공통 저장소.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint null fk | PR |
| repository_id | bigint fk | 저장소 |
| head_sha | varchar(64) | 체크 대상 SHA |
| github_check_run_id | bigint null | GitHub check_run ID |
| github_check_suite_id | bigint null | GitHub check_suite ID |
| check_name | text | 체크명 |
| provider | text | github_actions/jenkins/internal/manual |
| status | text | queued/in_progress/completed |
| conclusion | text null | success/failure/neutral/cancelled/skipped/timed_out/action_required |
| started_at | timestamptz null | 시작 |
| completed_at | timestamptz null | 완료 |
| details_url | text null | 상세 URL |
| is_required | boolean | 필수 여부 |
| gate_type | text | build/test/lint/security/codeowners/custom |
| raw_payload | jsonb null | 원본 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(pull_request_id, status)`
- `(repository_id, head_sha)`
- `(repository_id, check_name, head_sha)`

### 8.4.7 `core_pull_request_risks`

가장 최근 분석 결과 1건을 current row로 유지.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint unique fk | PR |
| risk_score | numeric(5,2) | 0~100 |
| risk_level | text | low/medium/high/blocking |
| signals | jsonb | 계산 시그널 |
| summary | text | 해석 요약 |
| recommended_actions | jsonb | 권장 액션 |
| analyzed_at | timestamptz | 분석 시각 |
| analyzer_version | text | 엔진 버전 |

### 8.4.8 `core_pull_request_risk_history`

분석 이력 보관용.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| pull_request_id | bigint fk | PR |
| risk_score | numeric(5,2) | 점수 |
| risk_level | text | 등급 |
| signals | jsonb | 시그널 |
| analyzed_at | timestamptz | 시각 |
| analyzer_version | text | 버전 |

---

## 8.5 정책 영역

### 8.5.1 `policy_templates`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| organization_id | bigint fk | 조직 |
| name | text | 템플릿명 |
| version | integer | 버전 |
| policy_type | text | branch/review/quality/path/release |
| scope_type | text | org/repository/team/branch_pattern |
| rules_json | jsonb | 규칙 본문 |
| is_active | boolean | 활성 여부 |
| created_by_user_id | bigint null fk | 작성자 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

유니크:
- `(organization_id, name, version)`

### 8.5.2 `policy_bindings`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| policy_template_id | bigint fk | 정책 |
| organization_id | bigint fk | 조직 |
| repository_id | bigint null fk | 저장소 |
| team_id | bigint null fk | 팀 |
| branch_pattern | text null | 브랜치 패턴 |
| applies_to_release | boolean | 릴리스 적용 여부 |
| is_active | boolean | 활성 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

### 8.5.3 `policy_exceptions`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| organization_id | bigint fk | 조직 |
| repository_id | bigint null fk | 저장소 |
| policy_binding_id | bigint null fk | 정책 바인딩 |
| target_type | text | pr/branch/repository/backout/release |
| target_ref | text | 대상 식별자 |
| reason | text | 예외 사유 |
| approved_by_user_id | bigint null fk | 승인자 |
| requested_by_user_id | bigint null fk | 요청자 |
| starts_at | timestamptz | 시작 |
| expires_at | timestamptz | 만료 |
| status | text | pending/approved/rejected/expired |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(organization_id, status, expires_at)`

---

## 8.6 충돌 지원 영역

### 8.6.1 `core_conflict_cases`

merge/rebase/cherry-pick 충돌 사례를 도메인 객체로 저장한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| repository_id | bigint fk | 저장소 |
| pull_request_id | bigint null fk | 관련 PR |
| branch_id | bigint null fk | 관련 브랜치 |
| conflict_type | text | merge/rebase/cherry_pick/unknown |
| state | text | detected/in_progress/resolved/aborted/escalated |
| source_ref | text | source ref |
| target_ref | text | target ref |
| head_sha | varchar(64) null | 현재 HEAD SHA |
| special_head_type | text null | merge_head/rebase_head/cherry_pick_head |
| special_head_sha | varchar(64) null | 관련 특수 HEAD SHA |
| files_count | integer | 충돌 파일 수 |
| detected_at | timestamptz | 감지 시각 |
| resolved_at | timestamptz null | 해결 시각 |
| owner_team_id | bigint null fk | 담당 팀 |
| severity | text | low/medium/high |
| summary | text null | 요약 |
| raw_context | jsonb null | 원문 컨텍스트 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(repository_id, conflict_type, state)`
- `(pull_request_id)`
- `(detected_at desc)`

### 8.6.2 `core_conflict_files`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| conflict_case_id | bigint fk | 충돌 사례 |
| path | text | 파일 경로 |
| conflict_reason | text null | modify/modify 등 |
| ours_sha | varchar(64) null | ours 기준 |
| theirs_sha | varchar(64) null | theirs 기준 |
| is_generated | boolean | 생성 파일 여부 |
| module_name | text null | 모듈 |
| owner_team_id | bigint null fk | 담당 팀 |
| hotspot_score | numeric(5,2) null | hotspot |
| resolution_notes | text null | 메모 |
| created_at | timestamptz | 생성 |

인덱스:
- `(conflict_case_id)`
- `gin(path gin_trgm_ops)`

---

## 8.7 Backout / Revert 영역

### 8.7.1 `core_backout_requests`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| repository_id | bigint fk | 저장소 |
| source_pull_request_id | bigint null fk | 원본 PR |
| request_type | text | pr_revert/commit_revert/release_backout |
| target_branch_id | bigint null fk | 대상 브랜치 |
| requested_by_user_id | bigint null fk | 요청자 |
| approved_by_user_id | bigint null fk | 승인자 |
| urgency | text | normal/high/critical |
| reason | text | 사유 |
| incident_ticket_key | text null | 장애 티켓 |
| status | text | draft/pending/approved/rejected/executing/completed/failed/cancelled |
| requires_release_approval | boolean | 릴리스 승인 필요 여부 |
| risk_summary | text null | 위험 요약 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |
| completed_at | timestamptz null | 완료 |

인덱스:
- `(repository_id, status, created_at desc)`
- `(source_pull_request_id)`
- `(target_branch_id, status)`

### 8.7.2 `core_backout_request_items`

되돌릴 개별 커밋/PR 항목을 보관한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| backout_request_id | bigint fk | backout 요청 |
| item_type | text | pull_request/commit |
| pull_request_id | bigint null fk | PR |
| commit_id | bigint null fk | 커밋 |
| execution_order | integer | 실행 순서 |
| dependency_note | text null | 의존성 메모 |
| created_at | timestamptz | 생성 |

### 8.7.3 `core_backout_executions`

실제 revert PR 생성 및 진행 상태.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| backout_request_id | bigint fk | 요청 |
| generated_pull_request_id | bigint null fk | 생성된 revert PR |
| execution_status | text | queued/in_progress/conflicted/waiting_review/merged/failed/aborted |
| revert_head_sha | varchar(64) null | revert 작업 SHA |
| conflict_predicted | boolean | 사전 충돌 예측 |
| conflict_actual | boolean | 실제 충돌 |
| validation_required | jsonb null | 검증 항목 |
| started_at | timestamptz null | 시작 |
| finished_at | timestamptz null | 종료 |
| raw_payload | jsonb null | 추가 정보 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

### 8.7.4 `core_backout_branch_syncs`

main/release 간 정합성 추적.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| backout_request_id | bigint fk | 요청 |
| source_branch_id | bigint fk | 원본 브랜치 |
| target_branch_id | bigint fk | 비교 브랜치 |
| sync_state | text | aligned/missing/pending/manual_required |
| note | text null | 메모 |
| checked_at | timestamptz | 확인 시각 |

---

## 8.8 릴리스 운영 영역

### 8.8.1 `core_release_branches`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| branch_id | bigint fk | 브랜치 |
| release_name | text | 릴리스명 |
| status | text | active/maintenance/closed |
| start_date | date null | 시작일 |
| end_date | date null | 종료일 |
| owner_team_id | bigint null fk | 담당 팀 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

### 8.8.2 `core_backports`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| repository_id | bigint fk | 저장소 |
| source_pull_request_id | bigint null fk | 원본 PR |
| source_commit_id | bigint null fk | 원본 커밋 |
| target_release_branch_id | bigint fk | 대상 릴리스 브랜치 |
| requested_by_user_id | bigint null fk | 요청자 |
| status | text | candidate/pending/in_progress/completed/failed/skipped |
| dependency_summary | text null | 의존성 요약 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

---

## 8.9 연동 및 이벤트 영역

### 8.9.1 `integration_webhook_events`

가장 중요한 원본 이벤트 보존 테이블.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| delivery_id | text unique | GitHub delivery ID |
| organization_id | bigint null fk | 조직 |
| repository_id | bigint null fk | 저장소 |
| installation_id | bigint null | GitHub App 설치 ID |
| event_name | text | pull_request/check_run 등 |
| action | text null | opened/synchronize 등 |
| sender_github_user_id | bigint null | sender |
| resource_github_id | bigint null | 주 객체 ID |
| resource_number | integer null | PR number 등 |
| payload | jsonb | 원문 payload |
| signature_valid | boolean | 서명 검증 결과 |
| received_at | timestamptz | 수신 시각 |
| processed_at | timestamptz null | 처리 완료 |
| process_status | text | received/processing/processed/failed/dead_letter |
| error_message | text null | 실패 메시지 |
| retry_count | integer default 0 | 재시도 횟수 |
| next_retry_at | timestamptz null | 다음 재시도 |
| created_at | timestamptz | 생성 |

인덱스:
- `(event_name, action, received_at desc)`
- `(process_status, next_retry_at)`
- `(repository_id, received_at desc)`
- `gin(payload jsonb_path_ops)` 제한적 사용 권장

### 8.9.2 `integration_sync_jobs`

정기/수동 동기화 작업 상태.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| organization_id | bigint null fk | 조직 |
| repository_id | bigint null fk | 저장소 |
| job_type | text | repo_sync/pr_sync/branch_sync/check_sync/backfill |
| trigger_type | text | webhook/scheduler/manual/retry |
| status | text | queued/running/succeeded/failed/cancelled |
| priority | integer default 100 | 우선순위 |
| requested_by_user_id | bigint null fk | 요청자 |
| scheduled_at | timestamptz | 예정 시각 |
| started_at | timestamptz null | 시작 |
| finished_at | timestamptz null | 종료 |
| cursor | text null | pagination cursor |
| parameters | jsonb null | 파라미터 |
| result_summary | jsonb null | 결과 요약 |
| error_message | text null | 실패 메시지 |
| created_at | timestamptz | 생성 |
| updated_at | timestamptz | 수정 |

인덱스:
- `(status, priority, scheduled_at)`
- `(repository_id, job_type, created_at desc)`

### 8.9.3 `integration_external_snapshots`

GitHub 원본 응답의 특정 시점 스냅샷 보관.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| snapshot_type | text | repository/pr/check/policy |
| organization_id | bigint null fk | 조직 |
| repository_id | bigint null fk | 저장소 |
| external_id | text | 외부 객체 ID |
| version_key | text null | ETag/updated_at/head_sha |
| payload | jsonb | 원문 |
| fetched_at | timestamptz | 수집 시각 |

---

## 8.10 알림 및 감사 영역

### 8.10.1 `ops_notifications`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| public_id | uuid unique | 외부 참조용 ID |
| organization_id | bigint fk | 조직 |
| user_id | bigint null fk | 수신자 |
| team_id | bigint null fk | 수신 팀 |
| channel | text | in_app/email/slack/teams/github_comment |
| category | text | risk/conflict/backout/policy/review |
| title | text | 제목 |
| body | text | 내용 |
| target_type | text | pr/conflict/backout/policy |
| target_id | bigint null | 대상 내부 ID |
| status | text | queued/sent/failed/read/dismissed |
| sent_at | timestamptz null | 발송 시각 |
| read_at | timestamptz null | 읽음 시각 |
| created_at | timestamptz | 생성 |

### 8.10.2 `ops_audit_logs`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint pk | 내부 PK |
| organization_id | bigint fk | 조직 |
| actor_user_id | bigint null fk | 행위자 |
| actor_type | text | user/system/app |
| action_type | text | policy_updated/backout_approved/pr_comment_added 등 |
| target_type | text | repository/pr/backout/policy |
| target_id | bigint null | 대상 ID |
| request_id | text null | 추적용 요청 ID |
| metadata | jsonb null | 추가 메타데이터 |
| created_at | timestamptz | 생성 |

인덱스:
- `(organization_id, created_at desc)`
- `(target_type, target_id, created_at desc)`
- `(actor_user_id, created_at desc)`

---

## 9. 읽기 최적화 테이블 / Materialized View

MVP에서도 아래 읽기 모델은 가치가 높다.

### 9.1 `analytics_repository_health_daily`

저장소별 일간 스냅샷.

주요 컬럼:
- repository_id
- snapshot_date
- open_pr_count
- risky_pr_count
- stale_branch_count
- merge_conflict_count
- backout_count
- failed_required_checks_count
- avg_pr_lead_time_hours

### 9.2 `analytics_team_flow_daily`

팀별 PR 흐름 지표.

### 9.3 `analytics_hotspot_files`

충돌, Backout, 고위험 PR에 자주 등장하는 파일.

주요 컬럼:
- repository_id
- file_path
- module_name
- recent_pr_count
- recent_conflict_count
- recent_backout_count
- hotspot_score
- recalculated_at

### 9.4 `analytics_pr_summary_view`

PR 목록 화면 응답 최적화용 뷰.

주요 필드:
- PR 기본 메타
- risk_score
- required_check_rollup
- review_rollup
- conflict_flag
- backout_flag

---

## 10. 인덱스 전략

### 10.1 공통 원칙

1. 목록 화면의 정렬/필터 기준으로 인덱스를 설계한다.
2. JSONB는 원문 보존용이지 주 조회 경로가 아니므로 과도한 GIN 인덱스를 피한다.
3. 대량 이벤트 테이블은 시계열 인덱스와 상태 기반 인덱스를 조합한다.
4. path 검색은 trigram을 우선 검토한다.

### 10.2 우선 인덱스 대상

- PR 목록: `(repository_id, state, updated_at desc)`
- 위험 PR: `(risk_level, analyzed_at desc)` 또는 summary view 인덱스
- 충돌 목록: `(repository_id, state, detected_at desc)`
- Backout 목록: `(repository_id, status, created_at desc)`
- 웹훅 재처리: `(process_status, next_retry_at)`
- 알림 센터: `(user_id, status, created_at desc)`

---

## 11. 파티셔닝 및 보관 전략

### 11.1 파티셔닝 권장 테이블

초기에는 단일 테이블로 시작하되, 아래는 월 단위 파티셔닝 후보로 본다.

1. `integration_webhook_events`
2. `ops_audit_logs`
3. `ops_notifications`
4. `integration_external_snapshots`

### 11.2 보관 전략

- 웹훅 원문: 최소 180일
- 감사 로그: 최소 1년
- 알림: 90일 이후 요약 보관 가능
- 외부 snapshot: 최근 30~90일 중심 보관
- PR 위험도 이력: 장기 보관 권장

---

## 12. 무결성 및 동시성 전략

### 12.1 upsert 규칙

GitHub 객체 동기화는 대부분 upsert로 처리한다.

예시:
- `core_repositories` by `github_repo_id`
- `core_pull_requests` by `github_pr_id`
- `core_pull_request_reviews` by `github_review_id`
- `integration_webhook_events` by `delivery_id`

### 12.2 낙관적 업데이트

다음 엔티티는 `updated_at` 또는 별도 `version` 컬럼을 둬 동시 수정 보호 권장:
- 정책 템플릿
- 정책 예외
- Backout 요청

### 12.3 멱등성

웹훅은 중복 전달될 수 있으므로 다음 원칙을 따른다.

1. `delivery_id`로 멱등 처리
2. 엔티티 동기화는 외부 ID 기반 upsert
3. 후속 작업 생성은 deduplication key 사용

---

## 13. 권장 enum 목록

초기에는 PostgreSQL native enum보다 text + check constraint 또는 app enum을 권장한다.

예시 값:

- PR state: `open`, `closed`, `merged`, `draft`
- Conflict type: `merge`, `rebase`, `cherry_pick`, `unknown`
- Backout status: `draft`, `pending`, `approved`, `rejected`, `executing`, `completed`, `failed`, `cancelled`
- Check conclusion: `success`, `failure`, `neutral`, `cancelled`, `skipped`, `timed_out`, `action_required`

이유:
- enum 변경 배포 리스크 완화
- MVP에서 상태 값 조정이 잦을 가능성 높음

---

## 14. API 응답용 조인 모델 권장

프론트엔드 성능을 위해 아래 조인 응답은 BFF 또는 view 기반으로 제공한다.

### 14.1 PR 상세 응답 모델

- PR 기본 정보
- 작성자/리뷰어 요약
- 위험도 요약
- 체크 요약
- 변경 파일 통계
- 영향 모듈 요약
- 관련 충돌/Backout 여부
- 권장 액션

### 14.2 브랜치 상세 응답 모델

- 브랜치 기본 정보
- 기본 브랜치 대비 ahead/behind
- 연결 PR
- stale 여부
- 권장 작업
- 최근 커밋 10건

### 14.3 Backout 상세 응답 모델

- 원본 PR/commit
- 대상 브랜치
- 영향 분석
- 승인 상태
- revert PR 상태
- 후속 정합성 체크

---

## 15. 샘플 PostgreSQL DDL 패턴

```sql
create table core_pull_requests (
  id bigserial primary key,
  public_id uuid not null unique,
  repository_id bigint not null references core_repositories(id),
  github_pr_id bigint not null unique,
  github_number integer not null,
  title text not null,
  body text null,
  state text not null,
  is_draft boolean not null default false,
  author_user_id bigint null references core_users(id),
  base_branch_id bigint null references core_branches(id),
  head_branch_id bigint null references core_branches(id),
  base_ref_name text not null,
  head_ref_name text not null,
  base_sha varchar(64) not null,
  head_sha varchar(64) not null,
  merge_commit_sha varchar(64) null,
  mergeable_state text null,
  review_decision text null,
  additions integer not null default 0,
  deletions integer not null default 0,
  changed_files_count integer not null default 0,
  commits_count integer not null default 0,
  merged_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz null,
  unique (repository_id, github_number)
);

create index ix_core_pull_requests_repo_state_updated
  on core_pull_requests (repository_id, state, updated_at desc);
```

---

## 16. 이벤트 처리 흐름과 테이블 사용

### 16.1 예시: PR opened 이벤트

1. `integration_webhook_events`에 원문 저장
2. 이벤트 라우터가 `pull_request/opened` 판별
3. `core_pull_requests` upsert
4. 필요 시 `integration_sync_jobs`에 파일/리뷰/체크 동기화 작업 생성
5. 위험도 분석 완료 후 `core_pull_request_risks` 갱신
6. 사용자 알림이 필요하면 `ops_notifications` 생성
7. 전 과정을 `ops_audit_logs`에 핵심 이벤트로 기록

### 16.2 예시: check_run completed 이벤트

1. `integration_webhook_events` 저장
2. `core_pull_request_checks` upsert
3. PR head SHA와 연결
4. required checks rollup 재계산
5. 실패 시 알림/대시보드 집계 반영

### 16.3 예시: Backout 요청 생성

1. `core_backout_requests` 생성
2. 항목별 `core_backout_request_items` 생성
3. 영향 분석/의존 분석 워커 실행
4. revert PR 생성 시 `core_backout_executions` 생성
5. 정합성 체크는 `core_backout_branch_syncs`로 기록

---

## 17. 성능 리스크와 대응

### 17.1 예상 리스크

1. 대형 PR의 파일 수가 많아 `core_pull_request_files`가 빠르게 커질 수 있음
2. 웹훅 이벤트 적재량 증가
3. 위험도/영향 분석이 동기식이면 응답 지연 발생
4. PR 상세 조회 시 join 폭발 가능성

### 17.2 대응

1. PR 상세는 summary view + 지연 로딩 탭 구조 사용
2. 파일 목록은 페이지네이션 및 모듈 단위 집계 병행
3. 웹훅 적재와 분석을 분리
4. 오래된 원문 이벤트는 파티셔닝/아카이빙
5. hotspot 계산은 배치화

---

## 18. 마이그레이션 우선순위

### Phase 1

- organizations
- users
- teams
- repositories
- branches
- pull_requests
- pull_request_reviews
- pull_request_checks
- webhook_events
- sync_jobs
- notifications
- audit_logs

### Phase 2

- pull_request_files
- pull_request_risks
- policy_templates
- policy_bindings
- policy_exceptions
- conflict_cases
- conflict_files

### Phase 3

- backout_requests
- backout_request_items
- backout_executions
- backout_branch_syncs
- release_branches
- backports
- analytics_* summary tables

---

## 19. 구현 권장사항

1. ORM 모델만 믿지 말고 핵심 조회는 SQL 기준으로 먼저 설계한다.
2. `updated_at` 자동 갱신 트리거나 애플리케이션 공통 처리 규약을 정한다.
3. 모든 비동기 작업은 request_id / correlation_id를 남긴다.
4. JSONB 원문은 압축 또는 외부 저장소 이전 전략을 미리 준비한다.
5. 파일 경로, 브랜치명, PR 번호, SHA는 사람이 자주 찾는 값이므로 검색 최적화를 고려한다.

---

## 20. 오픈 이슈

1. 내부 PK를 bigint로 통일할지, 외부 노출까지 UUID 우선으로 갈지 최종 결정 필요
2. GitHub GraphQL 의존도를 어디까지 허용할지 결정 필요
3. 정책 엔진의 rules_json 스키마를 JSON Schema로 공식화할지 결정 필요
4. 릴리스 브랜치/백포트 관계를 별도 서비스로 분리할지 검토 필요
5. 분석 집계를 PostgreSQL materialized view로 시작할지, 별도 OLAP 저장소를 조기 도입할지 판단 필요

---

## 21. 다음 단계

이 문서 다음 단계로 권장되는 산출물은 아래와 같다.

1. 내부 API 명세 초안(OpenAPI 또는 endpoint spec)
2. GitHub App 이벤트별 처리 시퀀스 다이어그램
3. 정책 rules_json 스키마 정의
4. PR 위험도 산식 상세 정의
5. 운영 대시보드용 지표 계산 정의서

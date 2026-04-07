# GitHub Enterprise 전환 지원 도구
# GitHub App 연동 및 서비스 구현 설계서

문서 버전: v0.1  
문서 목적: 기존 PRD와 분리된 구현 설계 문서로서, GitHub Enterprise 연동을 위한 GitHub App 권한, webhook 이벤트, 동기화 경계, 내부 서비스 책임, 내부 API 초안, 배포 단계까지 정의한다.  
대상 독자: 플랫폼 팀, 백엔드 팀, 프론트엔드 팀, DevOps 팀, 보안 검토자

---

## 1. 이 문서의 위치

이 문서는 제품 요구사항 문서(PRD)의 후속 설계 문서다.  
PRD가 “무엇을 만들 것인가”를 정의했다면, 이 문서는 “GitHub Enterprise와 어떻게 연결하고 어떤 경계로 구현할 것인가”를 정의한다.

이 문서의 범위는 다음과 같다.

- GitHub App 기반 연동 전략
- 최소 권한 원칙에 따른 권한 설계
- webhook 이벤트 구독 전략
- 데이터 동기화 및 캐시 전략
- 백엔드 서비스 분리 기준
- 내부 API 초안
- 운영, 보안, 장애 대응 기준
- MVP 구현 순서

이 문서는 화면 상세 설계, DB ERD, API 정식 스키마 정의 전 단계의 아키텍처 초안이다.

---

## 2. 설계 목표

### 2.1 핵심 목표

1. GitHub Enterprise의 native 기능을 최대한 활용하면서 사내 웹 도구가 해석, 분석, 정책 가시화, 운영 자동화 역할을 담당하도록 한다.
2. GitHub App은 최소 권한으로 동작해야 한다.
3. PR 품질 분석, 충돌 지원, Backout/Revert, 정책 대시보드를 구현할 수 있을 정도의 이벤트와 API만 먼저 연동한다.
4. 400명 규모 조직과 수백 개 저장소를 감당할 수 있도록 이벤트 기반 비동기 구조를 채택한다.
5. GitHub API 장애나 rate limit 상황에서도 기본 조회와 최근 데이터 기반 화면은 degrade 동작이 가능해야 한다.

### 2.2 비목표

1. GitHub 자체 UI를 대체하는 전체 SCM 솔루션을 만들지 않는다.
2. 사용자의 로컬 Git 작업 디렉터리를 실시간 원격 제어하지 않는다.
3. 처음부터 모든 GitHub webhook을 구독하지 않는다.
4. 첫 단계에서 GraphQL과 REST를 모두 과도하게 사용하지 않는다. MVP는 REST 중심으로 시작하고 필요한 조회만 GraphQL로 보완한다.

---

## 3. 상위 아키텍처

```text
[User Browser]
      |
      v
[Frontend Web App]
      |
      v
[API Gateway / BFF]
      |
      +-----------------------------+
      |                             |
      v                             v
[Domain API Service]          [Search / Analytics API]
      |                             |
      +-------------+---------------+
                    |
                    v
            [Message Queue / Event Bus]
                    |
    +---------------+----------------+----------------+
    |               |                |                |
    v               v                v                v
[Webhook Worker] [Sync Worker] [Risk Engine] [Policy Engine]
    |               |                |                |
    +---------------+----------------+----------------+
                    |
                    v
                [PostgreSQL]
                    |
                    +--------> [Redis Cache]
                    |
                    +--------> [Object Storage / Logs]
                    |
                    +--------> [Observability Stack]

[GitHub Enterprise]
    ^
    |
[GitHub App + Webhooks + REST/GraphQL + Checks API]
```

### 3.1 구성 원칙

- GitHub App은 외부 시스템 접점이다.
- Webhook Worker는 이벤트 수신과 검증만 담당하고, 무거운 분석은 큐 뒤로 넘긴다.
- Domain API Service는 저장소, 브랜치, PR, Backout, 정책, 충돌 사례 같은 핵심 도메인을 제공한다.
- Risk Engine은 PR 위험도, 영향 범위, 테스트 추천을 계산한다.
- Policy Engine은 조직 표준 규칙과 예외를 해석해 현재 상태를 계산한다.
- Search/Analytics API는 대시보드, 필터, drill-down, 통계 조회를 담당한다.

---

## 4. GitHub App 전략

### 4.1 왜 GitHub App인가

이 도구는 사용자 개인 토큰 기반이 아니라 조직 단위 연동과 webhook 자동화를 중심으로 설계해야 한다. 따라서 GitHub App이 가장 적합하다.

GitHub 문서 기준으로 GitHub App은 권한 집합을 기반으로 동작하며, 앱이 선택한 권한이 API 접근 범위와 구독 가능한 webhook 이벤트를 결정한다. GitHub는 최소 권한 원칙을 권장한다.

### 4.2 설치 단위

- 설치 대상: GitHub Enterprise 조직 단위
- 접근 범위: 선택된 저장소만 우선 허용
- 확장 방식: 파일럿 저장소 → 핵심 저장소군 → 조직 전체 확대

### 4.3 사용자 인증 방식

- 조직 사용자는 사내 SSO로 웹 도구에 로그인
- 웹 도구는 GitHub App installation token으로 조직 데이터에 접근
- 사용자 대신 작업이 필요한 경우는 최소화
- “누가 버튼을 눌렀는가”는 내부 감사 로그 기준으로 기록

---

## 5. GitHub App 권한 설계

### 5.1 권한 설계 원칙

1. 최소 권한으로 시작한다.
2. 조회 기능과 쓰기 기능을 분리해서 본다.
3. Backout/Revert PR 생성, PR 코멘트, Check Run 발행이 필요한 경우에만 write 권한을 연다.
4. 권한 상승이 필요한 기능은 Phase 2 이후로 분리할 수 있다.

### 5.2 MVP 권한 권장안

| 범주 | 권한 수준 | 사용 목적 |
|---|---|---|
| Repository metadata | Read-only | 저장소 기본 정보, 기본 브랜치, 공개/비공개, 권한 범위 확인 |
| Pull requests | Read & write | PR 조회, 리뷰 상태 분석, 필요 시 코멘트 또는 PR 생성 보조 |
| Contents | Read-only | 브랜치/커밋 기반 파일 목록 조회, CODEOWNERS 및 정책 파일 파싱 |
| Commit statuses | Read & write | 외부 분석 결과를 status/check 형태로 반영할 때 사용 |
| Checks | Read & write | Risk/Policy/Backout 결과를 Check Run으로 표시할 때 사용 |
| Issues | Read & write | PR 코멘트, 라벨, 운영 알림을 PR/Issue 인터페이스에 남길 때 사용 |
| Members | Read-only | 조직/팀 기반 reviewer 추천, 팀 매핑 확인이 필요할 때 선택적으로 사용 |
| Administration | Read-only 또는 미부여 | 보호 브랜치/규칙셋 조회가 꼭 필요할 때만 검토 |
| Actions / Workflows | Read-only optional | GitHub Actions 상태 연계가 꼭 필요할 때만 사용 |

### 5.3 초기 버전에서 보수적으로 제외할 권한

- Contents write
- Administration write
- Secrets write
- Webhooks write
- Packages write

### 5.4 권한 단계별 전략

#### Phase A: 조회 중심
- Metadata read
- Pull requests read
- Contents read
- Members read optional

#### Phase B: 품질 상태 반영
- Checks write
- Commit statuses write
- Issues write

#### Phase C: 자동화 강화
- Pull requests write 확대
- Backout/Revert PR 생성 자동화
- 정책 코멘트 자동화

---

## 6. 구독할 webhook 이벤트 설계

### 6.1 이벤트 구독 원칙

1. 서버 부하와 처리 복잡도를 줄이기 위해 필요한 이벤트만 구독한다.
2. 모든 이벤트는 원본 payload를 감사 목적으로 저장하되, 장기 보관 정책은 축약 저장으로 전환한다.
3. 이벤트 처리 실패는 재시도 큐로 보낸다.
4. UI 실시간성이 필요한 이벤트와 배치 동기화로 충분한 이벤트를 구분한다.

### 6.2 MVP 필수 이벤트

| 이벤트 | 목적 | 주요 후속 처리 |
|---|---|---|
| installation | 앱 설치/삭제/권한 변경 감지 | 설치 상태 갱신, 초기 동기화 큐 등록 |
| installation_repositories | 설치 저장소 추가/제거 감지 | 저장소 동기화 범위 갱신 |
| repository | 저장소 이름/기본 브랜치 등 메타 변경 감지 | 저장소 캐시 갱신 |
| push | 브랜치 최신 SHA 갱신, 브랜치 상태 계산 | ahead/behind 계산, PR 연결 상태 갱신 |
| pull_request | PR 생성/수정/닫힘/병합 감지 | PR 재분석, 리뷰어 추천, 위험도 재계산 |
| pull_request_review | 승인/반려 상태 갱신 | 리뷰 상태 갱신, 정책 평가 |
| pull_request_review_thread | 리뷰 대화 분석이 필요할 경우 | 리뷰 병목/논쟁 구간 표시 |
| check_suite | 기존 CI 상태 수집 | 품질 게이트 상태 갱신 |
| check_run | 개별 check 결과 수집 | PR 품질 상태 갱신 |
| status | commit status 기반 CI 수집 시 | 대체 품질 상태 갱신 |
| merge_group | merge queue 대응 | merge queue용 재검증 상태 생성 |

### 6.3 선택 이벤트

| 이벤트 | 도입 시점 | 사용 목적 |
|---|---|---|
| issues | Phase 2 | 운영성 코멘트/라벨 추적 |
| workflow_run | Phase 2 | GitHub Actions 세부 상태 연동 |
| branch_protection_rule 또는 ruleset 관련 조회 | Phase 2 | 정책 동기화 고도화 |
| team | 필요 시 | 조직 팀 변경 실시간 반영 |

### 6.4 merge queue 대응 방침

merge queue를 사용하는 브랜치는 merge_group 이벤트를 반드시 처리 대상으로 넣는다.  
merge queue에 들어간 변경은 PR head SHA가 아니라 merge group head SHA 기준으로 필요한 검사를 수행하고 상태를 다시 보고해야 한다.

---

## 7. 이벤트 처리 모델

### 7.1 처리 단계

```text
GitHub Webhook 수신
  -> 서명 검증
  -> idempotency key 생성
  -> 원본 payload 저장
  -> lightweight parsing
  -> event queue 적재
  -> domain worker 처리
  -> 파생 계산 수행
  -> DB 반영
  -> 알림/Check Run/코멘트 발행
```

### 7.2 Idempotency 설계

중복 webhook 수신에 대비해 다음 키를 기준으로 중복 처리 방지한다.

- delivery id
- installation id
- event type
- payload action
- entity id
- entity updated timestamp

### 7.3 재시도 규칙

- 네트워크 오류: exponential backoff 재시도
- GitHub rate limit: delayed retry queue 이동
- 영구 오류: dead letter queue 이동 후 운영 알림

---

## 8. 동기화 전략

### 8.1 실시간 + 지연 동기화 혼합 전략

모든 정보를 webhook만으로 유지하지 않는다. 다음 전략을 사용한다.

1. webhook는 즉시성 확보용
2. 주기 동기화는 누락 보정용
3. 사용자 요청 시 on-demand refresh는 정합성 보강용

### 8.2 동기화 대상

| 도메인 | 소스 | 방식 |
|---|---|---|
| 저장소 메타데이터 | GitHub API | 설치 시 full sync + 일일 보정 |
| 브랜치 최신 SHA | push/repository API | push 이벤트 + 시간 기반 보정 |
| PR 상태 | pull_request API | 이벤트 기반 + 화면 진입 시 refresh |
| 리뷰 상태 | review events + API | 이벤트 기반 |
| CI 상태 | check_suite/check_run/status | 이벤트 기반 |
| CODEOWNERS/정책 파일 | contents API | PR 분석 시 또는 브랜치 변경 시 |
| merge queue 상태 | merge_group + PR 조회 | 이벤트 기반 |
| 팀/멤버십 | members/team API | 일일 보정 또는 필요 시 |

### 8.3 캐시 정책

- 저장소 메타: 10분 캐시
- 브랜치 요약: 1~5분 캐시
- PR 상세: 이벤트 발생 시 무효화
- 위험도 분석 결과: PR head SHA 기준 캐시
- 정책 평가 결과: 브랜치와 ruleset 버전 기준 캐시

---

## 9. 핵심 도메인 서비스 책임 분리

### 9.1 Repository Service

책임:
- 저장소 목록/상세 조회
- 저장소 설치 상태
- 기본 브랜치와 정책 적용 상태 요약
- 브랜치 목록과 stale 브랜치 계산

### 9.2 Branch Intelligence Service

책임:
- 브랜치 그래프용 기초 데이터 생성
- ahead/behind 계산
- base branch 비교
- 브랜치 권장 액션 생성

### 9.3 Pull Request Service

책임:
- PR 목록/상세 조회
- 리뷰 상태 집계
- CODEOWNERS 충족 여부 계산
- PR 생성 보조 정보 제공

### 9.4 Risk Engine

책임:
- 변경량, 민감 경로, 테스트 누락, 다중 subsystem 변경 등 계산
- 위험도 점수와 이유 생성
- target 영향 후보 계산

### 9.5 Conflict Support Service

책임:
- Merge/Rebase/Cherry-pick 시나리오별 가이드 생성
- 충돌 유형 분류
- hotspot 파일 통계 제공
- 복구/중단 경로 안내

### 9.6 Backout Service

책임:
- Backout 요청 생성
- 원본 PR/commit 추적
- revert PR 생성 준비
- 영향 분석, 승인 규칙, 후속 정합성 추적

### 9.7 Policy Engine

책임:
- 조직 정책 템플릿 적용
- ruleset/branch protection 가시화
- 위반/예외 상태 계산
- 화면 표시용 정책 메시지 생성

### 9.8 Notification Service

책임:
- 이메일/Slack/Teams/GitHub comment/check 결과 발행
- 이벤트별 템플릿 관리
- 발송 이력 및 재시도

---

## 10. 데이터 모델 초안

### 10.1 핵심 엔터티

- github_installations
- repositories
- branches
- pull_requests
- pull_request_reviews
- pull_request_checks
- repository_rules_snapshot
- risk_analysis_results
- conflict_cases
- backout_requests
- backout_execution_records
- policy_templates
- policy_evaluations
- webhook_events
- sync_jobs
- notification_logs
- audit_logs

### 10.2 설계 포인트

- GitHub 원본 ID와 내부 ID를 분리한다.
- PR, branch, commit의 최신 상태와 이력 테이블을 분리한다.
- webhook payload 원본은 별도 저장소에 보관하고, 도메인 DB에는 필요한 필드만 정규화한다.
- 분석 결과는 입력 SHA와 ruleset 버전을 함께 저장해 캐시 일관성을 확보한다.

---

## 11. 내부 API 초안

아래 API는 BFF 또는 Domain API 형태로 노출하는 초안이다.

### 11.1 저장소 관련 API

- `GET /api/repositories`
- `GET /api/repositories/{repoId}`
- `GET /api/repositories/{repoId}/summary`
- `GET /api/repositories/{repoId}/branches`
- `GET /api/repositories/{repoId}/events`

### 11.2 브랜치 관련 API

- `GET /api/repositories/{repoId}/branches/{branchName}`
- `GET /api/repositories/{repoId}/branches/{branchName}/graph`
- `GET /api/repositories/{repoId}/branches/{branchName}/comparison?base=main`
- `GET /api/repositories/{repoId}/branches/{branchName}/recommendations`

### 11.3 PR 관련 API

- `GET /api/pull-requests`
- `GET /api/pull-requests/{prId}`
- `GET /api/pull-requests/{prId}/risk`
- `GET /api/pull-requests/{prId}/impact`
- `GET /api/pull-requests/{prId}/quality-gates`
- `GET /api/pull-requests/{prId}/reviewers/recommendations`
- `POST /api/pull-requests/assist/create`

### 11.4 충돌 지원 API

- `POST /api/conflicts/analyze`
- `GET /api/conflicts/cases`
- `GET /api/conflicts/cases/{caseId}`
- `GET /api/conflicts/cases/{caseId}/guide`
- `GET /api/conflicts/hotspots`

### 11.5 Backout API

- `POST /api/backouts`
- `GET /api/backouts`
- `GET /api/backouts/{backoutId}`
- `POST /api/backouts/{backoutId}/analyze`
- `POST /api/backouts/{backoutId}/generate-revert-pr`
- `POST /api/backouts/{backoutId}/approve`
- `GET /api/backouts/{backoutId}/consistency`

### 11.6 정책 관련 API

- `GET /api/policies/templates`
- `POST /api/policies/templates`
- `PUT /api/policies/templates/{templateId}`
- `POST /api/policies/apply`
- `GET /api/policies/evaluations?repoId=...`
- `GET /api/policies/exceptions`

### 11.7 운영 대시보드 API

- `GET /api/metrics/overview`
- `GET /api/metrics/teams`
- `GET /api/metrics/repositories`
- `GET /api/metrics/conflicts`
- `GET /api/metrics/backouts`
- `GET /api/metrics/policy-violations`
- `GET /api/metrics/review-sla`

### 11.8 관리 API

- `GET /api/admin/installations`
- `GET /api/admin/sync-jobs`
- `GET /api/admin/webhook-events`
- `POST /api/admin/re-sync`
- `GET /api/admin/audit-logs`

---

## 12. GitHub App 기능별 연계 표

| 기능 | GitHub 입력 | 내부 처리 | GitHub 출력 |
|---|---|---|---|
| 저장소 홈 | repository, installation, push | 저장소/브랜치 요약 갱신 | 없음 |
| PR 위험도 | pull_request, push, check_run | Risk Engine 실행 | Check Run 또는 PR comment |
| 리뷰어 추천 | pull_request, contents | CODEOWNERS/팀 분석 | UI 표시 또는 comment |
| 충돌 지원 | PR 비교 정보, 브랜치 상태 | 가이드 생성 | UI 중심 |
| Backout 요청 | merged PR/commit 조회 | Backout 분석 | revert PR 생성 또는 comment |
| 운영 대시보드 | webhook 전체 + 배치 sync | 통계 집계 | UI 표시 |
| merge queue 대응 | merge_group | queue 전용 재검증 | status/check 반영 |

---

## 13. Checks API / Status 반영 전략

### 13.1 왜 필요한가

사용자는 GitHub PR 화면 안에서도 결과를 보길 원한다.  
따라서 사내 웹 도구의 분석 결과 일부는 GitHub Checks 또는 Commit Status로 다시 반영하는 것이 좋다.

### 13.2 MVP 반영 항목

- Risk Analysis
- Policy Summary
- Backout Advisory optional

### 13.3 표시 예시

- `risk-analysis / success | neutral | action_required`
- `policy-gate / success | failure`
- `release-backport-advice / neutral`

### 13.4 주의점

- 차단성 판단은 조직 정책과 합의된 항목만 사용한다.
- 초반에는 대부분 advisory 성격으로 시작하고, 실제 merge blocking은 GitHub native required checks와 ruleset으로 통제한다.

---

## 14. Backout / Revert 구현 경계

### 14.1 지원 범위

- merged PR 단위 Backout 요청 생성
- 단일 또는 다중 commit revert 준비
- release branch 대상 승인 워크플로우
- revert PR 생성용 초안 데이터 생성

### 14.2 자동화 수준

#### MVP
- 사용자가 Backout 요청 생성
- 시스템이 영향 분석 수행
- 시스템이 revert PR 제목/본문 초안 생성
- 필요 시 GitHub에 새 PR 생성

#### 후속 단계
- 의존 commit 자동 탐지 강화
- backout 후 main/release 정합성 자동 추적
- 반복 backout hotspot 자동 경고

### 14.3 중요한 경계

- protected branch 직접 force-push는 지원하지 않는다.
- reset 기반 이력 제거는 운영 기능에서 제공하지 않는다.
- 감사 가능한 revert PR 방식만 허용한다.

---

## 15. 보안 설계

### 15.1 인증 및 인가

- 사용자 인증: SSO/SAML/OIDC
- 세션: short-lived token + server-side session 또는 secure cookie
- 권한: RBAC + 저장소 접근 범위 매핑

### 15.2 webhook 보안

- GitHub webhook secret 검증 필수
- 원본 body 기준 HMAC 검증
- 재전송 공격 방지를 위한 delivery id 기록

### 15.3 데이터 보호

- 최소 수집 원칙
- PR 본문/코멘트/로그의 민감 정보 마스킹 규칙 검토
- 감사 로그는 append-only 성격 유지
- 운영자 권한의 조회 범위도 팀/조직 단위로 제한

### 15.4 비밀정보 관리

- App private key는 전용 secret manager 저장
- rotation 절차 문서화
- 운영 환경과 테스트 환경 키 분리

---

## 16. 성능 및 확장성

### 16.1 예상 부하

- 400명 조직
- 수백 저장소
- 근무시간대 PR 이벤트, push 이벤트 집중
- 릴리스 시기 merge_group, backout, hotfix 이벤트 급증

### 16.2 대응 전략

- webhook 수신 서비스는 stateless로 구성
- 분석 작업은 비동기 큐 처리
- PR head SHA 기준으로 중복 분석 방지
- 대시보드용 집계는 사전 계산 materialized view 또는 별도 집계 테이블 사용
- 무거운 그래프 계산은 요청 시 즉시 계산하지 않고 캐시 우선

---

## 17. 관측성 및 운영

### 17.1 필수 메트릭

- webhook 수신량
- 이벤트 처리 성공/실패율
- 큐 지연 시간
- GitHub API 호출량 및 rate limit 잔량
- PR 분석 처리 시간
- Backout 생성 성공률
- Check Run 발행 성공률

### 17.2 로그

- audit log
- domain event log
- integration log
- error log

### 17.3 운영 대시보드용 운영 메트릭

- 저장소별 stale sync 여부
- last successful sync timestamp
- installation health score
- dead letter queue size

---

## 18. 장애 시나리오 및 대응

### 18.1 GitHub API rate limit 초과

대응:
- 우선순위가 낮은 동기화 작업 지연
- UI에는 “최근 캐시 기준” 배지 표시
- 운영자에게 rate limit 경고 발송

### 18.2 webhook 일시 유실 또는 지연

대응:
- 주기 보정 sync 수행
- 특정 엔터티 조회 시 on-demand refresh 허용
- 이벤트 gap 탐지 시 재동기화 job 생성

### 18.3 분석 워커 장애

대응:
- 큐 적체 모니터링
- 핵심 기능과 부가 기능 우선순위 분리
- 위험도 분석이 실패해도 PR 기본 조회는 가능해야 함

### 18.4 App 권한 부족

대응:
- 기능별 권한 의존성 명시
- 관리자 화면에서 부족 권한과 영향 기능 표시
- 설치 재승인 가이드 제공

---

## 19. MVP 구현 순서 제안

### 19.1 Sprint 1~2

- GitHub App 등록
- 설치/저장소 목록 동기화
- webhook 수신기 및 서명 검증
- Repository / Pull Request 기본 조회 API
- 공통 UI 프레임

### 19.2 Sprint 3~4

- PR 상세 동기화
- check_run/check_suite/status 수집
- Risk Engine 1차
- CODEOWNERS 파싱
- PR 상세 UI 1차

### 19.3 Sprint 5~6

- Branch Intelligence 1차
- 정책 템플릿/평가 기본판
- 운영 대시보드 기본 지표
- Check Run 발행 연동

### 19.4 Sprint 7~8

- 충돌 지원 화면 1차
- Backout 요청/상세/분석 1차
- revert PR 생성 보조
- pilot rollout

---

## 20. 권장 기술 선택 초안

### 20.1 백엔드

- 언어: Python 또는 TypeScript 중 조직 표준에 따름
- API: FastAPI / NestJS 계열 검토
- 큐: RabbitMQ, SQS, Kafka 중 기존 사내 표준 우선
- DB: PostgreSQL
- 캐시: Redis

### 20.2 프론트엔드

- React + TypeScript
- 상태 관리: React Query 계열 권장
- 그래프 렌더링: DAG/commit graph 대응 가능한 시각화 라이브러리 필요

### 20.3 인프라

- Kubernetes 또는 사내 표준 PaaS
- Secret Manager 연동
- OpenTelemetry 기반 관측성 권장

---

## 21. 팀 간 인터페이스 정의

### 21.1 플랫폼 팀

- GitHub App 생성/권한 관리
- webhook 인프라
- 배포 및 운영 기반 제공
- 보안 검토 대응

### 21.2 백엔드 팀

- Domain API
- webhook processing
- sync jobs
- policy/risk/backout core logic

### 21.3 프론트엔드 팀

- IA 기반 화면 구현
- 브랜치/PR/Backout UI
- 대시보드와 상세 분석 화면

### 21.4 DevOps / 품질 팀

- required checks 기준 정리
- merge queue 대응 CI 구성
- release branch 정책 정의

---

## 22. 구현 시 주의할 의사결정 포인트

1. monorepo인지 multi-repo인지에 따라 브랜치 그래프와 영향 분석 비용이 크게 달라진다.
2. CODEOWNERS가 저장소마다 들쭉날쭉하면 reviewer 추천 정확도가 급격히 떨어진다.
3. merge queue를 실제로 사용할 팀과 저장소를 초반에 명확히 정해야 merge_group 처리 복잡도를 통제할 수 있다.
4. Backout PR 자동 생성은 편리하지만 승인 체계를 잘못 설계하면 운영 사고를 키울 수 있다.
5. ruleset/branch protection을 GitHub native로 둘지 내부 정책 엔진을 소스 오브 트루스로 둘지 초기에 결정해야 한다.

---

## 23. MVP 완료 정의

아래 조건을 만족하면 GitHub App 연동 MVP는 완료로 본다.

1. 조직 1개, 저장소 10개 이상에 GitHub App을 설치할 수 있다.
2. 저장소, 브랜치, PR, 리뷰, check 상태가 기본적으로 동기화된다.
3. PR 위험도 결과를 웹 UI에서 볼 수 있다.
4. 정책 상태를 PR 또는 저장소 단위로 볼 수 있다.
5. merge_group 이벤트를 받는 저장소는 별도 처리 루틴이 동작한다.
6. Backout 요청을 생성하고 revert PR 초안 생성까지 가능하다.
7. 운영자는 설치 상태, 동기화 상태, 이벤트 실패 상태를 관리자 화면에서 확인할 수 있다.

---

## 24. 다음 문서로 이어질 항목

이 문서 다음 단계로 아래 문서를 별도로 작성하는 것이 적절하다.

1. DB 스키마 초안
2. GitHub App 권한/이벤트 매핑 상세표
3. 내부 API OpenAPI 초안
4. 화면별 상세 와이어프레임
5. Risk Engine 규칙 정의서
6. Backout 승인 워크플로우 정의서
7. 운영 Runbook

---

## 25. 참고 구현 메모

- 처음부터 모든 결과를 GitHub에 다시 써 넣으려 하지 말고, UI 중심으로 시작한 뒤 핵심 결과만 Check Run으로 반영하는 것이 안전하다.
- merge queue를 사용하는 브랜치는 merge_group 이벤트 대응을 빼면 운영 중 장애가 난다.
- Backout은 reset이 아니라 revert PR 중심으로 설계해야 감사와 운영 추적이 가능하다.
- 초반 파일럿은 저장소 수보다 정책 일관성이 높은 팀을 선택하는 것이 성공 확률이 높다.


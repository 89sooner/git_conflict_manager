# OpenAPI 3.1 초안

다음은 GitHub Enterprise 전환 지원 웹 도구의 내부 API를 기준으로 정리한 OpenAPI 3.1 명세 초안이다. 이 문서는 실제 `openapi.yaml` 생성 전의 검토용 문서이며, 핵심 엔드포인트와 공통 스키마를 중심으로 정의한다.

## 1. 문서 목적

이 문서는 프론트엔드, 백엔드, 분석 워커가 공통 계약을 합의하기 위한 API 명세 초안이다.

목표는 다음과 같다.

1. 리소스 구조를 표준화한다.
2. 요청/응답 스키마를 고정한다.
3. 에러 모델을 일관화한다.
4. 추후 OpenAPI YAML, 서버 스텁, 타입 생성의 기준 문서로 사용한다.

## 2. 설계 원칙

1. 모든 API는 `/api/v1` 하위에 둔다.
2. 조회 API와 실행 API를 명확히 분리한다.
3. 비동기 분석 작업은 Job 리소스로 추적한다.
4. 권한 부족, 정책 위반, 분석 지연 상태를 명시적 에러 코드로 반환한다.
5. GitHub 원본 리소스와 내부 분석 리소스를 구분한다.

## 3. OpenAPI 3.1 YAML 초안

```yaml
openapi: 3.1.0
info:
  title: Git Migration Support Platform API
  version: 0.1.0
  summary: Internal API for GitHub Enterprise migration support and quality operations
  description: >-
    Internal API for repository state visualization, PR risk analysis,
    conflict assistance, backout workflows, policy management, and dashboards.
servers:
  - url: https://git-support.internal.example.com
    description: Production
  - url: https://git-support.staging.internal.example.com
    description: Staging
jsonSchemaDialect: https://json-schema.org/draft/2020-12/schema
security:
  - bearerAuth: []
tags:
  - name: Auth
  - name: Organizations
  - name: Repositories
  - name: Branches
  - name: PullRequests
  - name: Conflicts
  - name: Backouts
  - name: Policies
  - name: Dashboards
  - name: Jobs
paths:
  /api/v1/me:
    get:
      tags: [Auth]
      summary: Get current user profile and effective permissions
      operationId: getMe
      responses:
        '200':
          description: Current user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfileResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/v1/organizations:
    get:
      tags: [Organizations]
      summary: List organizations visible to the current user
      operationId: listOrganizations
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Organization list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationListResponse'

  /api/v1/repositories:
    get:
      tags: [Repositories]
      summary: List repositories with filters
      operationId: listRepositories
      parameters:
        - in: query
          name: orgId
          required: false
          schema:
            type: string
            format: uuid
        - in: query
          name: search
          required: false
          schema:
            type: string
        - in: query
          name: riskLevel
          required: false
          schema:
            $ref: '#/components/schemas/RiskLevel'
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Repository list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RepositoryListResponse'

  /api/v1/repositories/{repositoryId}:
    get:
      tags: [Repositories]
      summary: Get repository summary
      operationId: getRepository
      parameters:
        - $ref: '#/components/parameters/RepositoryId'
      responses:
        '200':
          description: Repository summary
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RepositorySummaryResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/repositories/{repositoryId}/overview:
    get:
      tags: [Repositories]
      summary: Get repository overview including quality and policy status
      operationId: getRepositoryOverview
      parameters:
        - $ref: '#/components/parameters/RepositoryId'
      responses:
        '200':
          description: Repository overview
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RepositoryOverviewResponse'

  /api/v1/repositories/{repositoryId}/branches:
    get:
      tags: [Branches]
      summary: List branches for a repository
      operationId: listBranches
      parameters:
        - $ref: '#/components/parameters/RepositoryId'
        - in: query
          name: kind
          required: false
          schema:
            type: string
            enum: [default, release, feature, hotfix, other]
        - in: query
          name: stale
          required: false
          schema:
            type: boolean
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Branch list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BranchListResponse'

  /api/v1/repositories/{repositoryId}/branches/{branchName}:
    get:
      tags: [Branches]
      summary: Get branch detail and interpreted status
      operationId: getBranchDetail
      parameters:
        - $ref: '#/components/parameters/RepositoryId'
        - $ref: '#/components/parameters/BranchName'
      responses:
        '200':
          description: Branch detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BranchDetailResponse'

  /api/v1/repositories/{repositoryId}/history-graph:
    get:
      tags: [Branches]
      summary: Get commit graph for a branch compared to a base branch
      operationId: getHistoryGraph
      parameters:
        - $ref: '#/components/parameters/RepositoryId'
        - in: query
          name: branch
          required: true
          schema:
            type: string
        - in: query
          name: baseBranch
          required: false
          schema:
            type: string
        - in: query
          name: limit
          required: false
          schema:
            type: integer
            minimum: 10
            maximum: 500
            default: 100
      responses:
        '200':
          description: Commit graph
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HistoryGraphResponse'

  /api/v1/pull-requests:
    get:
      tags: [PullRequests]
      summary: List pull requests with filters
      operationId: listPullRequests
      parameters:
        - in: query
          name: repositoryId
          schema:
            type: string
            format: uuid
        - in: query
          name: state
          schema:
            type: string
            enum: [open, closed, merged, draft, all]
        - in: query
          name: assignee
          schema:
            type: string
        - in: query
          name: riskLevel
          schema:
            $ref: '#/components/schemas/RiskLevel'
        - in: query
          name: requiresReview
          schema:
            type: boolean
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Pull request list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PullRequestListResponse'

  /api/v1/pull-requests/{pullRequestId}:
    get:
      tags: [PullRequests]
      summary: Get pull request detail
      operationId: getPullRequestDetail
      parameters:
        - $ref: '#/components/parameters/PullRequestId'
      responses:
        '200':
          description: Pull request detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PullRequestDetailResponse'

  /api/v1/pull-requests/{pullRequestId}/risk-analysis:
    get:
      tags: [PullRequests]
      summary: Get PR risk analysis
      operationId: getPullRequestRiskAnalysis
      parameters:
        - $ref: '#/components/parameters/PullRequestId'
      responses:
        '200':
          description: Risk analysis
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PullRequestRiskAnalysisResponse'
        '202':
          description: Analysis in progress
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AsyncPendingResponse'

  /api/v1/pull-requests/{pullRequestId}/review-recommendations:
    get:
      tags: [PullRequests]
      summary: Get recommended reviewers and CODEOWNERS coverage
      operationId: getReviewRecommendations
      parameters:
        - $ref: '#/components/parameters/PullRequestId'
      responses:
        '200':
          description: Review recommendations
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewRecommendationsResponse'

  /api/v1/pull-requests/assist:
    post:
      tags: [PullRequests]
      summary: Prepare PR creation assistance for a source/base branch pair
      operationId: preparePullRequestAssist
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PullRequestAssistRequest'
      responses:
        '200':
          description: PR assistance result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PullRequestAssistResponse'

  /api/v1/conflicts:
    get:
      tags: [Conflicts]
      summary: List detected or user-submitted conflict cases
      operationId: listConflicts
      parameters:
        - in: query
          name: repositoryId
          schema:
            type: string
            format: uuid
        - in: query
          name: type
          schema:
            type: string
            enum: [merge, rebase, cherry-pick, modify-delete, rename]
        - in: query
          name: status
          schema:
            type: string
            enum: [open, resolved, aborted]
      responses:
        '200':
          description: Conflict case list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConflictCaseListResponse'

  /api/v1/conflicts/{conflictCaseId}:
    get:
      tags: [Conflicts]
      summary: Get conflict case detail and guidance
      operationId: getConflictCaseDetail
      parameters:
        - $ref: '#/components/parameters/ConflictCaseId'
      responses:
        '200':
          description: Conflict case detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConflictCaseDetailResponse'

  /api/v1/backouts:
    get:
      tags: [Backouts]
      summary: List backout requests and backout history
      operationId: listBackouts
      parameters:
        - in: query
          name: repositoryId
          schema:
            type: string
            format: uuid
        - in: query
          name: branchKind
          schema:
            type: string
            enum: [default, release, feature, hotfix, other]
        - in: query
          name: status
          schema:
            type: string
            enum: [draft, pending-approval, ready, merged, failed, cancelled]
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/PageSize'
      responses:
        '200':
          description: Backout list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BackoutListResponse'

  /api/v1/backouts:
    post:
      tags: [Backouts]
      summary: Create a backout request from a PR or commits
      operationId: createBackout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBackoutRequest'
      responses:
        '201':
          description: Backout created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BackoutDetailResponse'
        '409':
          $ref: '#/components/responses/Conflict'
        '422':
          $ref: '#/components/responses/ValidationError'

  /api/v1/backouts/{backoutId}:
    get:
      tags: [Backouts]
      summary: Get backout detail
      operationId: getBackoutDetail
      parameters:
        - $ref: '#/components/parameters/BackoutId'
      responses:
        '200':
          description: Backout detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BackoutDetailResponse'

  /api/v1/backouts/{backoutId}/generate-revert-pr:
    post:
      tags: [Backouts]
      summary: Generate or refresh a revert PR for a backout request
      operationId: generateRevertPullRequest
      parameters:
        - $ref: '#/components/parameters/BackoutId'
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                dryRun:
                  type: boolean
                  default: false
      responses:
        '200':
          description: Revert PR generated or previewed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateRevertPullRequestResponse'

  /api/v1/policies/templates:
    get:
      tags: [Policies]
      summary: List policy templates
      operationId: listPolicyTemplates
      responses:
        '200':
          description: Policy template list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyTemplateListResponse'

  /api/v1/policies/templates:
    post:
      tags: [Policies]
      summary: Create a policy template
      operationId: createPolicyTemplate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePolicyTemplateRequest'
      responses:
        '201':
          description: Policy template created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyTemplateResponse'

  /api/v1/policies/templates/{policyTemplateId}:
    get:
      tags: [Policies]
      summary: Get policy template detail
      operationId: getPolicyTemplate
      parameters:
        - $ref: '#/components/parameters/PolicyTemplateId'
      responses:
        '200':
          description: Policy template detail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyTemplateResponse'

    patch:
      tags: [Policies]
      summary: Update a policy template
      operationId: updatePolicyTemplate
      parameters:
        - $ref: '#/components/parameters/PolicyTemplateId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePolicyTemplateRequest'
      responses:
        '200':
          description: Policy template updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PolicyTemplateResponse'

  /api/v1/dashboards/overview:
    get:
      tags: [Dashboards]
      summary: Get organization-level dashboard summary
      operationId: getDashboardOverview
      parameters:
        - in: query
          name: orgId
          schema:
            type: string
            format: uuid
        - in: query
          name: from
          schema:
            type: string
            format: date-time
        - in: query
          name: to
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Dashboard summary
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardOverviewResponse'

  /api/v1/jobs/{jobId}:
    get:
      tags: [Jobs]
      summary: Get async job status
      operationId: getJobStatus
      parameters:
        - $ref: '#/components/parameters/JobId'
      responses:
        '200':
          description: Job status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatusResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    Page:
      in: query
      name: page
      required: false
      schema:
        type: integer
        minimum: 1
        default: 1
    PageSize:
      in: query
      name: pageSize
      required: false
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    RepositoryId:
      in: path
      name: repositoryId
      required: true
      schema:
        type: string
        format: uuid
    BranchName:
      in: path
      name: branchName
      required: true
      schema:
        type: string
    PullRequestId:
      in: path
      name: pullRequestId
      required: true
      schema:
        type: string
        format: uuid
    ConflictCaseId:
      in: path
      name: conflictCaseId
      required: true
      schema:
        type: string
        format: uuid
    BackoutId:
      in: path
      name: backoutId
      required: true
      schema:
        type: string
        format: uuid
    PolicyTemplateId:
      in: path
      name: policyTemplateId
      required: true
      schema:
        type: string
        format: uuid
    JobId:
      in: path
      name: jobId
      required: true
      schema:
        type: string
        format: uuid

  responses:
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Conflict:
      description: Conflict with current resource state
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationErrorResponse'

  schemas:
    RiskLevel:
      type: string
      enum: [low, medium, high, critical]

    ApiMeta:
      type: object
      additionalProperties: false
      properties:
        requestId:
          type: string
        page:
          type: integer
        pageSize:
          type: integer
        total:
          type: integer

    ErrorResponse:
      type: object
      additionalProperties: false
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
              additionalProperties: true
        meta:
          $ref: '#/components/schemas/ApiMeta'

    ValidationErrorResponse:
      allOf:
        - $ref: '#/components/schemas/ErrorResponse'
        - type: object
          properties:
            error:
              type: object
              properties:
                fieldErrors:
                  type: array
                  items:
                    type: object
                    properties:
                      field:
                        type: string
                      message:
                        type: string

    UserSummary:
      type: object
      additionalProperties: false
      required: [id, login, displayName]
      properties:
        id:
          type: string
          format: uuid
        login:
          type: string
        displayName:
          type: string
        email:
          type: string
          format: email
          nullable: true

    UserProfileResponse:
      type: object
      required: [data]
      properties:
        data:
          type: object
          properties:
            user:
              $ref: '#/components/schemas/UserSummary'
            permissions:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    OrganizationSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        slug:
          type: string
        name:
          type: string

    OrganizationListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/OrganizationSummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    RepositorySummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        githubNodeId:
          type: string
        name:
          type: string
        fullName:
          type: string
        defaultBranch:
          type: string
        visibility:
          type: string
          enum: [private, internal, public]
        teamName:
          type: string
          nullable: true
        riskLevel:
          $ref: '#/components/schemas/RiskLevel'
        openPullRequestCount:
          type: integer
        staleBranchCount:
          type: integer

    RepositoryListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/RepositorySummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    RepositorySummaryResponse:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/RepositorySummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    RepositoryOverviewResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            repository:
              $ref: '#/components/schemas/RepositorySummary'
            quality:
              type: object
              properties:
                buildSuccessRate7d:
                  type: number
                failingRequiredChecksCount:
                  type: integer
                codeOwnerMissingCount:
                  type: integer
            policy:
              type: object
              properties:
                rulesetEnabled:
                  type: boolean
                mergeQueueEnabled:
                  type: boolean
                exceptionCount:
                  type: integer
            recentEvents:
              type: array
              items:
                $ref: '#/components/schemas/TimelineEvent'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    BranchSummary:
      type: object
      properties:
        name:
          type: string
        kind:
          type: string
          enum: [default, release, feature, hotfix, other]
        isProtected:
          type: boolean
        isStale:
          type: boolean
        aheadBy:
          type: integer
        behindBy:
          type: integer
        latestCommitSha:
          type: string

    BranchListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/BranchSummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    BranchDetailResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            branch:
              $ref: '#/components/schemas/BranchSummary'
            interpretedStatus:
              type: string
            recommendedActions:
              type: array
              items:
                type: string
            linkedPullRequest:
              $ref: '#/components/schemas/PullRequestSummary'
              nullable: true
            riskSignals:
              type: array
              items:
                $ref: '#/components/schemas/RiskSignal'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    CommitNode:
      type: object
      properties:
        sha:
          type: string
        shortSha:
          type: string
        message:
          type: string
        author:
          $ref: '#/components/schemas/UserSummary'
        committedAt:
          type: string
          format: date-time
        parents:
          type: array
          items:
            type: string
        refs:
          type: array
          items:
            type: string

    HistoryGraphResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            branch:
              type: string
            baseBranch:
              type: string
              nullable: true
            nodes:
              type: array
              items:
                $ref: '#/components/schemas/CommitNode'
            interpretedStatus:
              type: string
            simulation:
              type: object
              properties:
                mergePreview:
                  type: string
                  nullable: true
                rebasePreview:
                  type: string
                  nullable: true
                cherryPickPreview:
                  type: string
                  nullable: true
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PullRequestSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        number:
          type: integer
        title:
          type: string
        state:
          type: string
          enum: [open, closed, merged, draft]
        author:
          $ref: '#/components/schemas/UserSummary'
        baseBranch:
          type: string
        headBranch:
          type: string
        riskLevel:
          $ref: '#/components/schemas/RiskLevel'
        hasConflicts:
          type: boolean
        waitingForReview:
          type: boolean
        updatedAt:
          type: string
          format: date-time

    PullRequestListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/PullRequestSummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PullRequestDetailResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            pullRequest:
              $ref: '#/components/schemas/PullRequestSummary'
            changedFiles:
              type: integer
            commits:
              type: integer
            labels:
              type: array
              items:
                type: string
            linkedBuilds:
              type: array
              items:
                $ref: '#/components/schemas/BuildSummary'
            relatedIssues:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PullRequestRiskAnalysisResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            riskLevel:
              $ref: '#/components/schemas/RiskLevel'
            score:
              type: integer
              minimum: 0
              maximum: 100
            summary:
              type: string
            signals:
              type: array
              items:
                $ref: '#/components/schemas/RiskSignal'
            recommendedTests:
              type: array
              items:
                type: string
            impactedModules:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    ReviewRecommendationsResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            requiredCodeOwners:
              type: array
              items:
                type: string
            missingCodeOwners:
              type: array
              items:
                type: string
            recommendedReviewers:
              type: array
              items:
                $ref: '#/components/schemas/UserSummary'
            rationale:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PullRequestAssistRequest:
      type: object
      required: [repositoryId, sourceBranch, baseBranch]
      properties:
        repositoryId:
          type: string
          format: uuid
        sourceBranch:
          type: string
        baseBranch:
          type: string
        draft:
          type: boolean
          default: false

    PullRequestAssistResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            proposedTitle:
              type: string
            proposedBody:
              type: string
            recommendedReviewers:
              type: array
              items:
                $ref: '#/components/schemas/UserSummary'
            checklist:
              type: array
              items:
                type: string
            riskSummary:
              type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    ConflictCaseSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [merge, rebase, cherry-pick, modify-delete, rename]
        status:
          type: string
          enum: [open, resolved, aborted]
        repositoryId:
          type: string
          format: uuid
        branchName:
          type: string
        conflictingFileCount:
          type: integer
        createdAt:
          type: string
          format: date-time

    ConflictCaseListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/ConflictCaseSummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    ConflictFile:
      type: object
      properties:
        path:
          type: string
        fileType:
          type: string
        ownerTeam:
          type: string
          nullable: true
        hotspotScore:
          type: integer
          nullable: true
        generated:
          type: boolean

    ConflictCaseDetailResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            conflict:
              $ref: '#/components/schemas/ConflictCaseSummary'
            interpretedStatus:
              type: string
            gitConceptHint:
              type: string
            conflictingFiles:
              type: array
              items:
                $ref: '#/components/schemas/ConflictFile'
            guidance:
              type: array
              items:
                type: string
            recoveryActions:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    BackoutTarget:
      type: object
      properties:
        sourceType:
          type: string
          enum: [pull_request, commit_list]
        pullRequestId:
          type: string
          format: uuid
          nullable: true
        commitShas:
          type: array
          items:
            type: string

    CreateBackoutRequest:
      type: object
      required: [repositoryId, targetBranch, reason, target]
      properties:
        repositoryId:
          type: string
          format: uuid
        targetBranch:
          type: string
        reason:
          type: string
        incidentTicket:
          type: string
          nullable: true
        urgency:
          type: string
          enum: [normal, high, emergency]
          default: normal
        approverIds:
          type: array
          items:
            type: string
            format: uuid
        target:
          $ref: '#/components/schemas/BackoutTarget'

    BackoutSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        repositoryId:
          type: string
          format: uuid
        targetBranch:
          type: string
        status:
          type: string
          enum: [draft, pending-approval, ready, merged, failed, cancelled]
        urgency:
          type: string
          enum: [normal, high, emergency]
        createdBy:
          $ref: '#/components/schemas/UserSummary'
        createdAt:
          type: string
          format: date-time

    BackoutListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/BackoutSummary'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    BackoutDetailResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            backout:
              $ref: '#/components/schemas/BackoutSummary'
            target:
              $ref: '#/components/schemas/BackoutTarget'
            impactSummary:
              type: string
            impactedModules:
              type: array
              items:
                type: string
            recommendedValidations:
              type: array
              items:
                type: string
            revertPullRequest:
              $ref: '#/components/schemas/PullRequestSummary'
              nullable: true
        meta:
          $ref: '#/components/schemas/ApiMeta'

    GenerateRevertPullRequestResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            dryRun:
              type: boolean
            canGenerate:
              type: boolean
            pullRequest:
              $ref: '#/components/schemas/PullRequestSummary'
              nullable: true
            warnings:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PolicyTemplateRule:
      type: object
      properties:
        type:
          type: string
        config:
          type: object
          additionalProperties: true

    CreatePolicyTemplateRequest:
      type: object
      required: [name, category, rules]
      properties:
        name:
          type: string
        category:
          type: string
          enum: [branch, review, quality, path, exception]
        description:
          type: string
        rules:
          type: array
          items:
            $ref: '#/components/schemas/PolicyTemplateRule'

    UpdatePolicyTemplateRequest:
      allOf:
        - $ref: '#/components/schemas/CreatePolicyTemplateRequest'

    PolicyTemplate:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        category:
          type: string
        description:
          type: string
        version:
          type: integer
        rules:
          type: array
          items:
            $ref: '#/components/schemas/PolicyTemplateRule'

    PolicyTemplateResponse:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/PolicyTemplate'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    PolicyTemplateListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/PolicyTemplate'
        meta:
          $ref: '#/components/schemas/ApiMeta'

    DashboardOverviewResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            pullRequestLeadTimeHours:
              type: number
            reviewSlaBreachCount:
              type: integer
            conflictRate:
              type: number
            backoutCount:
              type: integer
            highRiskPullRequestCount:
              type: integer
            hotspotModules:
              type: array
              items:
                type: string
        meta:
          $ref: '#/components/schemas/ApiMeta'

    JobStatusResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            id:
              type: string
              format: uuid
            status:
              type: string
              enum: [queued, running, succeeded, failed, cancelled]
            progress:
              type: integer
              minimum: 0
              maximum: 100
            resultUrl:
              type: string
              nullable: true
        meta:
          $ref: '#/components/schemas/ApiMeta'

    AsyncPendingResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            status:
              type: string
              enum: [queued, running]
            jobId:
              type: string
              format: uuid
        meta:
          $ref: '#/components/schemas/ApiMeta'

    BuildSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        provider:
          type: string
        status:
          type: string
          enum: [queued, running, success, failed, cancelled]
        targetName:
          type: string
        url:
          type: string
          format: uri

    TimelineEvent:
      type: object
      properties:
        type:
          type: string
        occurredAt:
          type: string
          format: date-time
        summary:
          type: string

    RiskSignal:
      type: object
      properties:
        type:
          type: string
        severity:
          $ref: '#/components/schemas/RiskLevel'
        summary:
          type: string
        scoreContribution:
          type: integer
```

## 4. MVP에서 꼭 구현할 엔드포인트

다음 엔드포인트는 1차 구현 범위에 반드시 포함하는 것을 권장한다.

1. `GET /api/v1/me`
2. `GET /api/v1/repositories`
3. `GET /api/v1/repositories/{repositoryId}/overview`
4. `GET /api/v1/repositories/{repositoryId}/branches/{branchName}`
5. `GET /api/v1/repositories/{repositoryId}/history-graph`
6. `GET /api/v1/pull-requests`
7. `GET /api/v1/pull-requests/{pullRequestId}`
8. `GET /api/v1/pull-requests/{pullRequestId}/risk-analysis`
9. `GET /api/v1/pull-requests/{pullRequestId}/review-recommendations`
10. `POST /api/v1/pull-requests/assist`
11. `GET /api/v1/conflicts/{conflictCaseId}`
12. `GET /api/v1/backouts`
13. `POST /api/v1/backouts`
14. `GET /api/v1/backouts/{backoutId}`
15. `POST /api/v1/backouts/{backoutId}/generate-revert-pr`
16. `GET /api/v1/policies/templates`
17. `POST /api/v1/policies/templates`
18. `GET /api/v1/dashboards/overview`
19. `GET /api/v1/jobs/{jobId}`

## 5. 구현 시 주의사항

1. PR 위험도, 리뷰 추천, 충돌 분석은 비동기 분석 결과를 포함할 수 있으므로 `202 Accepted`와 Job 추적 구조를 반드시 고려해야 한다.
2. Backout 생성은 멱등성 키를 요구하는 것이 안전하다. 같은 사고 티켓으로 중복 요청이 들어오는 상황을 방지해야 한다.
3. branchName은 path 파라미터에서 slash를 포함할 수 있으므로 라우팅 규칙을 명확히 정의해야 한다.
4. PR 상세와 위험도 분석은 분리 API로 두되, 프론트 성능을 위해 BFF 집계 엔드포인트를 추가할 수 있다.
5. 향후 GraphQL 도입 가능성은 열어두되, 초기 구현은 REST로 고정하는 편이 안정적이다.

## 6. 다음 산출물 권장 순서

이 문서 다음 단계로는 아래 순서를 권장한다.

1. 실제 `openapi.yaml` 파일 생성
2. 에러 코드 표준 문서 생성
3. 프론트엔드 타입 생성 규칙 정의
4. 백엔드 핸들러/서비스 인터페이스 초안 작성
5. Mock 서버 또는 계약 테스트 파이프라인 추가

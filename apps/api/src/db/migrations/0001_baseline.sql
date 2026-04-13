-- =====================================================================
-- 0001_baseline.sql
-- Baseline schema for the git migration support platform.
-- Source of truth: docs/02-architecture/data_model_and_db_schema.md
-- State enums mirror docs/03-api/state_transition_spec.md.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- 1. core_organizations
-- ---------------------------------------------------------------------
create table if not exists core_organizations (
  id              bigserial primary key,
  public_id       uuid        not null default uuid_generate_v4(),
  github_org_id   bigint      not null,
  github_node_id  text        null,
  login           text        not null,
  display_name    text        not null,
  ghes_base_url   text        null,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ux_core_organizations_public_id     unique (public_id),
  constraint ux_core_organizations_github_org_id unique (github_org_id),
  constraint ux_core_organizations_login         unique (login)
);

-- ---------------------------------------------------------------------
-- 2. core_users
-- ---------------------------------------------------------------------
create table if not exists core_users (
  id              bigserial primary key,
  public_id       uuid        not null default uuid_generate_v4(),
  github_user_id  bigint      null,
  github_node_id  text        null,
  login           text        not null,
  email           citext      null,
  display_name    text        null,
  avatar_url      text        null,
  user_type       text        not null default 'human'
                   check (user_type in ('human', 'app', 'system')),
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ux_core_users_public_id      unique (public_id),
  constraint ux_core_users_github_user_id unique (github_user_id),
  constraint ux_core_users_login          unique (login)
);

-- ---------------------------------------------------------------------
-- 3. core_repositories
-- ---------------------------------------------------------------------
create table if not exists core_repositories (
  id                   bigserial primary key,
  public_id            uuid        not null default uuid_generate_v4(),
  organization_id      bigint      not null references core_organizations(id) on delete restrict,
  github_repo_id       bigint      not null,
  github_node_id       text        null,
  name                 text        not null,
  full_name            text        not null,
  default_branch_name  text        not null default 'main',
  visibility           text        not null default 'private'
                        check (visibility in ('private', 'internal', 'public')),
  is_archived          boolean     not null default false,
  is_disabled          boolean     not null default false,
  primary_language     text        null,
  topics               text[]      null,
  installed_app_id     bigint      null,
  last_synced_at       timestamptz null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint ux_core_repositories_public_id      unique (public_id),
  constraint ux_core_repositories_github_repo_id unique (github_repo_id),
  constraint ux_core_repositories_full_name      unique (full_name)
);

create index if not exists ix_core_repositories_org_name
  on core_repositories (organization_id, name);

-- ---------------------------------------------------------------------
-- 4. core_pull_requests
-- State enum mirrors docs/03-api/state_transition_spec.md section 4.1.
-- `github_state` captures GitHub-native lifecycle (open/closed/merged/draft);
-- `state` captures the derived business state machine.
-- ---------------------------------------------------------------------
create table if not exists core_pull_requests (
  id                    bigserial primary key,
  public_id             uuid        not null default uuid_generate_v4(),
  repository_id         bigint      not null references core_repositories(id) on delete cascade,
  github_pr_id          bigint      not null,
  github_node_id        text        null,
  github_number         integer     not null,
  title                 text        not null,
  body                  text        null,
  github_state          text        not null
                         check (github_state in ('open', 'closed', 'merged', 'draft')),
  state                 text        not null default 'draft'
                         check (state in (
                           'draft',
                           'open',
                           'under-review',
                           'changes-requested',
                           'approved',
                           'merge-blocked',
                           'ready-to-merge',
                           'queued-for-merge',
                           'merged',
                           'closed',
                           'reverted'
                         )),
  is_draft              boolean     not null default false,
  author_user_id        bigint      null references core_users(id),
  base_ref_name         text        not null,
  head_ref_name         text        not null,
  base_sha              varchar(64) not null,
  head_sha              varchar(64) not null,
  merge_commit_sha      varchar(64) null,
  merged_by_user_id     bigint      null references core_users(id),
  mergeable_state       text        null,
  merge_queue_state     text        null,
  review_decision       text        null
                         check (review_decision is null or review_decision in (
                           'approved', 'changes_requested', 'review_required'
                         )),
  additions             integer     not null default 0,
  deletions             integer     not null default 0,
  changed_files_count   integer     not null default 0,
  commits_count         integer     not null default 0,
  comments_count        integer     not null default 0,
  review_comments_count integer     not null default 0,
  merged_at             timestamptz null,
  closed_at             timestamptz null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  last_synced_at        timestamptz null,
  constraint ux_core_pull_requests_public_id    unique (public_id),
  constraint ux_core_pull_requests_github_pr_id unique (github_pr_id),
  constraint ux_core_pull_requests_repo_number  unique (repository_id, github_number)
);

create index if not exists ix_core_pull_requests_repo_state_updated
  on core_pull_requests (repository_id, state, updated_at desc);

create index if not exists ix_core_pull_requests_repo_author_updated
  on core_pull_requests (repository_id, author_user_id, updated_at desc);

create index if not exists ix_core_pull_requests_repo_base_state
  on core_pull_requests (repository_id, base_ref_name, state);

-- ---------------------------------------------------------------------
-- 5. integration_webhook_events
-- ---------------------------------------------------------------------
create table if not exists integration_webhook_events (
  id                      bigserial primary key,
  delivery_id             text        not null,
  organization_id         bigint      null references core_organizations(id) on delete set null,
  repository_id           bigint      null references core_repositories(id)  on delete set null,
  installation_id         bigint      null,
  event_name              text        not null,
  action                  text        null,
  sender_github_user_id   bigint      null,
  resource_github_id      bigint      null,
  resource_number         integer     null,
  payload                 jsonb       not null,
  signature_valid         boolean     not null,
  received_at             timestamptz not null default now(),
  processed_at            timestamptz null,
  process_status          text        not null default 'received'
                           check (process_status in (
                             'received', 'processing', 'processed', 'failed', 'dead_letter'
                           )),
  error_message           text        null,
  retry_count             integer     not null default 0,
  next_retry_at           timestamptz null,
  created_at              timestamptz not null default now(),
  constraint ux_integration_webhook_events_delivery_id unique (delivery_id)
);

create index if not exists ix_integration_webhook_events_event_action_received
  on integration_webhook_events (event_name, action, received_at desc);

create index if not exists ix_integration_webhook_events_status_retry
  on integration_webhook_events (process_status, next_retry_at);

create index if not exists ix_integration_webhook_events_repo_received
  on integration_webhook_events (repository_id, received_at desc);

-- ---------------------------------------------------------------------
-- 6. integration_sync_jobs
-- Status enum mirrors docs/03-api/state_transition_spec.md section 10.1
-- (jobs intentionally omit 'expired' from the baseline; add in a later
-- migration when job TTL handling is introduced).
-- ---------------------------------------------------------------------
create table if not exists integration_sync_jobs (
  id                     bigserial primary key,
  organization_id        bigint      null references core_organizations(id) on delete set null,
  repository_id          bigint      null references core_repositories(id)  on delete set null,
  job_type               text        not null
                          check (job_type in (
                            'repo_sync', 'pr_sync', 'branch_sync', 'check_sync', 'backfill'
                          )),
  trigger_type           text        not null
                          check (trigger_type in ('webhook', 'scheduler', 'manual', 'retry')),
  status                 text        not null default 'queued'
                          check (status in (
                            'queued', 'running', 'succeeded', 'failed', 'cancelled'
                          )),
  priority               integer     not null default 100,
  requested_by_user_id   bigint      null references core_users(id) on delete set null,
  scheduled_at           timestamptz not null default now(),
  started_at             timestamptz null,
  finished_at            timestamptz null,
  cursor                 text        null,
  parameters             jsonb       null,
  result_summary         jsonb       null,
  error_message          text        null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists ix_integration_sync_jobs_status_priority_scheduled
  on integration_sync_jobs (status, priority, scheduled_at);

create index if not exists ix_integration_sync_jobs_repo_type_created
  on integration_sync_jobs (repository_id, job_type, created_at desc);

commit;

-- Phase 6 PR analysis read models

create table if not exists core_pull_request_risks (
  id bigserial primary key,
  pull_request_id bigint not null,
  risk_score numeric(5,2) not null,
  risk_level text not null
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  analysis_status text not null
    check (analysis_status in ('queued', 'running', 'succeeded', 'failed', 'stale')),
  summary text not null,
  signals jsonb not null default '[]'::jsonb,
  recommended_tests jsonb not null default '[]'::jsonb,
  impacted_modules jsonb not null default '[]'::jsonb,
  last_job_public_id uuid null,
  analyzed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ux_core_pull_request_risks_pr unique (pull_request_id)
);

create index if not exists ix_core_pull_request_risks_status
  on core_pull_request_risks (analysis_status, updated_at desc);

create index if not exists ix_core_pull_request_risks_level
  on core_pull_request_risks (risk_level, analyzed_at desc);

create table if not exists core_pull_request_review_recommendations (
  id bigserial primary key,
  pull_request_id bigint not null,
  recommendation_status text not null
    check (recommendation_status in ('queued', 'running', 'succeeded', 'failed', 'stale')),
  required_codeowners jsonb not null default '[]'::jsonb,
  missing_codeowners jsonb not null default '[]'::jsonb,
  recommended_reviewers jsonb not null default '[]'::jsonb,
  rationale jsonb not null default '[]'::jsonb,
  last_job_public_id uuid null,
  computed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ux_core_pr_review_recommendations_pr unique (pull_request_id)
);

create index if not exists ix_core_pr_review_recommendations_status
  on core_pull_request_review_recommendations (recommendation_status, updated_at desc);

-- Migration: 0003_conflict_support
-- Phase 7 — Conflict Support persistence
-- Applied when transitioning from runtime-store to PostgreSQL (ADR-0003 trigger)

-- Conflict cases: merge/rebase/cherry-pick conflict domain objects
CREATE TABLE IF NOT EXISTS core_conflict_cases (
  id            bigserial PRIMARY KEY,
  public_id     uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  repository_id bigint NOT NULL REFERENCES core_repositories(id),
  pull_request_id bigint NULL REFERENCES core_pull_requests(id),
  branch_id     bigint NULL REFERENCES core_branches(id),
  conflict_type text NOT NULL CHECK (conflict_type IN ('merge', 'rebase', 'cherry-pick', 'modify-delete', 'rename')),
  status        text NOT NULL DEFAULT 'detected'
                CHECK (status IN ('detected', 'analyzing', 'guided', 'user-working', 'resolved', 'aborted', 'stale')),
  source_ref    text NOT NULL,
  target_ref    text NOT NULL,
  head_sha      varchar(64) NULL,
  special_head_type text NULL CHECK (special_head_type IN ('merge_head', 'rebase_head', 'cherry_pick_head')),
  special_head_sha  varchar(64) NULL,
  files_count   integer NOT NULL DEFAULT 0,
  detected_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz NULL,
  owner_team_id bigint NULL REFERENCES core_teams(id),
  severity      text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  summary       text NULL,
  interpreted_status text NULL,
  git_concept_hint   text NULL,
  guidance      jsonb NULL DEFAULT '[]'::jsonb,
  recovery_actions   jsonb NULL DEFAULT '[]'::jsonb,
  escalation_info    jsonb NULL,
  raw_context   jsonb NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflict_cases_repo_type_status ON core_conflict_cases (repository_id, conflict_type, status);
CREATE INDEX idx_conflict_cases_pr ON core_conflict_cases (pull_request_id) WHERE pull_request_id IS NOT NULL;
CREATE INDEX idx_conflict_cases_detected ON core_conflict_cases (detected_at DESC);

-- Conflict files: per-file conflict context
CREATE TABLE IF NOT EXISTS core_conflict_files (
  id               bigserial PRIMARY KEY,
  conflict_case_id bigint NOT NULL REFERENCES core_conflict_cases(id) ON DELETE CASCADE,
  path             text NOT NULL,
  file_type        text NULL,
  conflict_reason  text NULL,
  ours_sha         varchar(64) NULL,
  theirs_sha       varchar(64) NULL,
  is_generated     boolean NOT NULL DEFAULT false,
  module_name      text NULL,
  owner_team_id    bigint NULL REFERENCES core_teams(id),
  hotspot_score    numeric(5,2) NULL,
  resolution_notes text NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflict_files_case ON core_conflict_files (conflict_case_id);

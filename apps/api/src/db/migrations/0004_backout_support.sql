-- Migration: 0004_backout_support
-- Phase 8 — Backout / Revert Center persistence layer
-- Status enum mirrors docs/03-api/state_transition_spec.md §7 (12-state)

CREATE TABLE IF NOT EXISTS core_backout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES core_repositories(id),
  target_branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'validating',
    'pending-approval',
    'approved',
    'blocked',
    'ready',
    'pr-generating',
    'pr-open',
    'queued-for-merge',
    'merged',
    'failed',
    'cancelled'
  )),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN (
    'normal',
    'high',
    'emergency'
  )),
  reason TEXT NOT NULL,
  incident_ticket TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core_backout_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backout_id UUID NOT NULL REFERENCES core_backout_requests(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pull_request', 'commit_list')),
  pull_request_id UUID REFERENCES core_pull_requests(id),
  commit_shas TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_backout_requests_repository ON core_backout_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_backout_requests_status ON core_backout_requests(status);
CREATE INDEX IF NOT EXISTS idx_backout_targets_backout ON core_backout_targets(backout_id);

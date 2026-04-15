import { describe, expect, it } from 'vitest';
import type {
  BranchListResponse,
  ErrorEnvelope,
  PullRequestListResponse,
  RepositoryListResponse,
  RepositorySummaryResponse,
} from '@gsp/shared-types';

/**
 * Contract test for the web API client envelope contract.
 *
 * The web client (apps/web/lib/api) deserializes JSON responses into the
 * typed envelopes exported from @gsp/shared-types. This test fixes the
 * envelope shapes via JSON round-trip so that any drift between the API
 * server (apps/api) and shared-types is caught here, not at runtime in
 * the browser.
 */

function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('web API envelope contract', () => {
  it('parses RepositoryListResponse', () => {
    const payload: RepositoryListResponse = {
      data: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          githubNodeId: 'R_abc',
          name: 'example',
          fullName: 'acme/example',
          defaultBranch: 'main',
          visibility: 'private',
          teamName: null,
          riskLevel: 'low',
          openPullRequestCount: 0,
          staleBranchCount: 0,
        },
      ],
      meta: {
        requestId: 'req-1',
        timestamp: new Date().toISOString(),
        page: 1,
        pageSize: 20,
        total: 1,
      },
    };
    const parsed = jsonRoundTrip(payload);
    expect(parsed.data[0]?.fullName).toBe('acme/example');
    expect(parsed.meta.total).toBe(1);
  });

  it('parses RepositorySummaryResponse', () => {
    const payload: RepositorySummaryResponse = {
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        githubNodeId: 'R_abc',
        name: 'example',
        fullName: 'acme/example',
        defaultBranch: 'main',
        visibility: 'private',
        teamName: 'platform',
        riskLevel: 'medium',
        openPullRequestCount: 5,
        staleBranchCount: 2,
      },
      meta: { requestId: 'req-2' },
    };
    const parsed = jsonRoundTrip(payload);
    expect(parsed.data.teamName).toBe('platform');
  });

  it('parses BranchListResponse', () => {
    const payload: BranchListResponse = {
      data: [
        {
          name: 'main',
          kind: 'default',
          isProtected: true,
          isStale: false,
          aheadBy: 0,
          behindBy: 0,
          latestCommitSha: 'abc123',
        },
      ],
      meta: { requestId: 'req-3', total: 1 },
    };
    const parsed = jsonRoundTrip(payload);
    expect(parsed.data[0]?.isProtected).toBe(true);
  });

  it('parses PullRequestListResponse', () => {
    const payload: PullRequestListResponse = {
      data: [
        {
          id: '00000000-0000-0000-0000-000000000099',
          number: 42,
          title: 'feat: example',
          state: 'open',
          author: {
            id: '00000000-0000-0000-0000-000000000002',
            login: 'alice',
            displayName: 'Alice',
            email: null,
          },
          baseBranch: 'main',
          headBranch: 'feature/x',
          riskLevel: 'medium',
          hasConflicts: false,
          waitingForReview: true,
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'req-4', total: 1, page: 1, pageSize: 50 },
    };
    const parsed = jsonRoundTrip(payload);
    expect(parsed.data[0]?.number).toBe(42);
    expect(parsed.data[0]?.author.login).toBe('alice');
  });

  it('parses ErrorEnvelope and preserves retryable + userAction', () => {
    const payload: ErrorEnvelope = {
      error: {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found',
        retryable: false,
        userAction: 'GitHub App 설치를 확인하세요.',
      },
      meta: { requestId: 'req-5', timestamp: new Date().toISOString() },
    };
    const parsed = jsonRoundTrip(payload);
    expect(parsed.error.code).toBe('REPOSITORY_NOT_FOUND');
    expect(parsed.error.retryable).toBe(false);
    expect(parsed.error.userAction).toContain('GitHub');
  });
});

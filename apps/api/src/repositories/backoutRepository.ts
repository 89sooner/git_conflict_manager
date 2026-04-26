import type { BackoutSummary, BackoutDetail, BackoutState } from '@gsp/shared-types';
import { readRuntimeStore, updateRuntimeStore } from '@gsp/runtime-store';
import { BaseRepository } from './baseRepository.js';

export interface ListBackoutsFilter {
  repositoryId?: string;
  status?: string;
  branchKind?: string;
}

export class BackoutRepository extends BaseRepository {
  async list(filter: ListBackoutsFilter): Promise<BackoutSummary[]> {
    let items = [...readRuntimeStore().backoutRequests];

    if (filter.repositoryId) {
      items = items.filter((b) => b.repositoryId === filter.repositoryId);
    }

    if (filter.status) {
      items = items.filter((b) => b.status === filter.status);
    }

    // branchKind filter — match branch naming patterns
    if (filter.branchKind) {
      items = items.filter((b) => {
        const kind = filter.branchKind!;
        if (kind === 'release') return b.targetBranch.startsWith('release/');
        if (kind === 'hotfix') return b.targetBranch.startsWith('hotfix/');
        if (kind === 'feature') return b.targetBranch.startsWith('feature/');
        if (kind === 'default') return b.targetBranch === 'main' || b.targetBranch === 'master';
        return true;
      });
    }

    return items;
  }

  async findById(id: string): Promise<BackoutDetail | null> {
    const store = readRuntimeStore();
    return store.backoutDetails[id] ?? null;
  }

  async findSummaryById(id: string): Promise<BackoutSummary | null> {
    const store = readRuntimeStore();
    return store.backoutRequests.find((b) => b.id === id) ?? null;
  }

  async findByRepositoryAndTarget(
    repositoryId: string,
    pullRequestId: string | null,
    commitShas: string[],
  ): Promise<BackoutSummary | null> {
    const store = readRuntimeStore();
    const activeStatuses: BackoutState[] = [
      'draft', 'validating', 'pending-approval', 'approved',
      'blocked', 'ready', 'pr-generating', 'pr-open', 'queued-for-merge',
    ];

    for (const req of store.backoutRequests) {
      if (req.repositoryId !== repositoryId) continue;
      if (!activeStatuses.includes(req.status)) continue;

      const detail = store.backoutDetails[req.id];
      if (!detail) continue;

      if (pullRequestId && detail.target.pullRequestId === pullRequestId) {
        return req;
      }
      if (commitShas.length > 0) {
        const overlap = commitShas.some((sha) => detail.target.commitShas.includes(sha));
        if (overlap) return req;
      }
    }

    return null;
  }

  async create(summary: BackoutSummary, detail: BackoutDetail): Promise<void> {
    updateRuntimeStore((snapshot) => {
      snapshot.backoutRequests.push(summary);
      snapshot.backoutDetails[summary.id] = detail;
    });
  }

  async updateStatus(id: string, status: BackoutState): Promise<void> {
    updateRuntimeStore((snapshot) => {
      const req = snapshot.backoutRequests.find((b) => b.id === id);
      if (req) req.status = status;
      const detail = snapshot.backoutDetails[id];
      if (detail) detail.backout.status = status;
    });
  }
}

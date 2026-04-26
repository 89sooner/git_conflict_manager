import type { ConflictCaseSummary, ConflictCaseDetail, ConflictCaseStatus, ConflictType } from '@gsp/shared-types';
import { readRuntimeStore } from '@gsp/runtime-store';
import { BaseRepository } from './baseRepository.js';

export interface ListConflictsFilter {
  repositoryId?: string;
  type?: string;
  status?: string;
}

export class ConflictRepository extends BaseRepository {
  async list(filter: ListConflictsFilter): Promise<ConflictCaseSummary[]> {
    let items = [...readRuntimeStore().conflictCases];

    if (filter.repositoryId) {
      items = items.filter((c) => c.repositoryId === filter.repositoryId);
    }

    if (filter.type) {
      items = items.filter((c) => c.type === filter.type);
    }

    if (filter.status) {
      items = items.filter((c) => c.status === filter.status);
    }

    return items;
  }

  async findById(id: string): Promise<ConflictCaseDetail | null> {
    const store = readRuntimeStore();
    return store.conflictCaseDetails[id] ?? null;
  }

  async findSummaryById(id: string): Promise<ConflictCaseSummary | null> {
    const store = readRuntimeStore();
    return store.conflictCases.find((c) => c.id === id) ?? null;
  }
}

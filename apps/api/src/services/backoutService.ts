import type {
  BackoutSummary,
  BackoutDetail,
  CreateBackoutRequest,
  GenerateRevertPullRequestResult,
  BackoutState,
  UserSummary,
} from '@gsp/shared-types';
import { BOOTSTRAP_DEV_USER } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import { BackoutRepository, type ListBackoutsFilter } from '../repositories/backoutRepository.js';
import { ApiError } from '../lib/errors.js';

/** Allowed state transitions — mirrors state_transition_spec.md §7.3 */
const BACKOUT_TRANSITIONS: Record<BackoutState, BackoutState[]> = {
  'draft': ['validating', 'cancelled'],
  'validating': ['pending-approval', 'ready', 'blocked'],
  'pending-approval': ['approved', 'blocked', 'cancelled'],
  'approved': ['ready', 'cancelled'],
  'blocked': ['ready', 'pending-approval', 'cancelled'],
  'ready': ['pr-generating', 'cancelled'],
  'pr-generating': ['pr-open', 'failed'],
  'pr-open': ['queued-for-merge', 'merged'],
  'queued-for-merge': ['merged'],
  'merged': [],
  'failed': ['cancelled'],
  'cancelled': [],
};

export function isValidBackoutTransition(current: BackoutState, next: BackoutState): boolean {
  return BACKOUT_TRANSITIONS[current]?.includes(next) ?? false;
}

function isReleaseBranch(branch: string): boolean {
  return branch.startsWith('release/');
}

export class BackoutService extends BaseService {
  private readonly repo: BackoutRepository;

  constructor(ctx: ConstructorParameters<typeof BaseService>[0]) {
    super(ctx);
    this.repo = new BackoutRepository(ctx);
  }

  async list(filter: ListBackoutsFilter): Promise<BackoutSummary[]> {
    return this.repo.list(filter);
  }

  async get(id: string): Promise<BackoutDetail> {
    const result = await this.repo.findById(id);
    if (!result) {
      throw new ApiError({
        code: 'BACKOUT_NOT_FOUND',
        message: `Backout request ${id} not found`,
        statusCode: 404,
        retryable: false,
      });
    }
    return result;
  }

  async create(body: CreateBackoutRequest, user: UserSummary): Promise<BackoutDetail> {
    // Validate reason
    if (!body.reason || body.reason.trim().length === 0) {
      throw new ApiError({
        code: 'BACKOUT_REASON_REQUIRED',
        message: 'Backout reason is required',
        statusCode: 422,
        retryable: false,
        userAction: 'Please provide a reason for the backout request.',
      });
    }

    // Validate target
    if (!body.target || (!body.target.pullRequestId && body.target.commitShas.length === 0)) {
      throw new ApiError({
        code: 'BACKOUT_TARGET_REQUIRED',
        message: 'Backout target (pull request or commit list) is required',
        statusCode: 422,
        retryable: false,
        userAction: 'Please specify a pull request or commit list to revert.',
      });
    }

    // Release branch requires approvers
    if (isReleaseBranch(body.targetBranch) && (!body.approverIds || body.approverIds.length === 0)) {
      throw new ApiError({
        code: 'BACKOUT_APPROVER_REQUIRED',
        message: 'Release branch backout requires at least one approver',
        statusCode: 422,
        retryable: false,
        userAction: 'Please specify approvers for release branch backout.',
      });
    }

    // Check for duplicate active backout
    const existing = await this.repo.findByRepositoryAndTarget(
      body.repositoryId,
      body.target.pullRequestId,
      body.target.commitShas,
    );
    if (existing) {
      throw new ApiError({
        code: 'BACKOUT_ALREADY_EXISTS',
        message: `An active backout request already exists for this target (${existing.id})`,
        statusCode: 409,
        retryable: false,
        details: { existingBackoutId: existing.id },
      });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const summary: BackoutSummary = {
      id,
      repositoryId: body.repositoryId,
      targetBranch: body.targetBranch,
      status: 'draft',
      urgency: body.urgency ?? 'normal',
      createdBy: user,
      createdAt: now,
    };

    const detail: BackoutDetail = {
      backout: summary,
      target: body.target,
      impactSummary: 'Impact analysis pending — validation job will compute details.',
      impactedModules: [],
      recommendedValidations: [],
      revertPullRequest: null,
    };

    await this.repo.create(summary, detail);
    return detail;
  }

  async generateRevertPr(
    backoutId: string,
    dryRun: boolean,
  ): Promise<GenerateRevertPullRequestResult> {
    const detail = await this.get(backoutId);
    const { backout } = detail;

    // Release policy check
    if (isReleaseBranch(backout.targetBranch) && backout.status === 'draft') {
      throw new ApiError({
        code: 'BACKOUT_RELEASE_POLICY_BLOCKED',
        message: 'Release branch backout must be approved before generating a revert PR',
        statusCode: 409,
        retryable: false,
        userAction: 'Please wait for approval before generating a revert PR.',
      });
    }

    const warnings: string[] = [];

    // Conflict prediction placeholder
    if (detail.target.commitShas.length > 1) {
      warnings.push(
        'Multiple commits selected — revert order may matter. Review the generated diff carefully.',
      );
    }

    if (dryRun) {
      return {
        dryRun: true,
        canGenerate: true,
        pullRequest: null,
        warnings,
      };
    }

    // In Phase 8 we return a placeholder revert PR rather than calling GitHub API
    const revertPr = {
      id: crypto.randomUUID(),
      number: 999,
      title: `Revert: backout request ${backoutId}`,
      state: 'open' as const,
      author: backout.createdBy,
      baseBranch: backout.targetBranch,
      headBranch: `revert/backout-${backoutId.slice(0, 8)}`,
      riskLevel: 'high' as const,
      hasConflicts: false,
      waitingForReview: true,
      updatedAt: new Date().toISOString(),
    };

    return {
      dryRun: false,
      canGenerate: true,
      pullRequest: revertPr,
      warnings,
    };
  }
}

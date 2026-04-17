import type { FastifyBaseLogger } from 'fastify';
import { enqueueSyncJob } from '@gsp/runtime-store';
import type { SyncJobRequest } from '../github/types.js';

export class SyncJobQueue {
  private readonly logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
  }

  enqueue(job: SyncJobRequest): void {
    const queued = enqueueSyncJob({
      jobType: job.jobType,
      triggerType: job.triggerType,
      orgGithubId: job.orgGithubId,
      repoGithubId: job.repoGithubId,
      parameters: job.parameters,
      correlationId: job.correlationId,
    });

    this.logger.info(
      {
        component: 'sync-queue',
        jobId: queued.id,
        jobType: job.jobType,
        triggerType: job.triggerType,
        repoGithubId: job.repoGithubId ?? null,
        orgGithubId: job.orgGithubId ?? null,
        correlationId: job.correlationId,
        parameters: job.parameters ?? null,
      },
      `sync job enqueued: ${job.jobType}`,
    );
  }

  enqueueAll(jobs: SyncJobRequest[]): void {
    for (const job of jobs) {
      this.enqueue(job);
    }
  }
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ErrorState } from '../../../components/states';
import {
  PullRequestDetailView,
  type PullRequestRiskAnalysisState,
  type PullRequestReviewRecommendationsState,
} from '../../../components/pulls/PullRequestDetailView';
import {
  getPullRequest,
  getPullRequestRiskAnalysis,
  getPullRequestReviewRecommendations,
} from '../../../lib/api';
import { ApiClientError } from '../../../lib/api/errors';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PullRequestDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [detailResult, riskResult, reviewResult] = await Promise.allSettled([
    getPullRequest(id),
    getPullRequestRiskAnalysis(id),
    getPullRequestReviewRecommendations(id),
  ]);

  if (detailResult.status === 'rejected') {
    return (
      <section className="flex flex-col gap-4">
        <BackLink />
        <ErrorState
          error={
            detailResult.reason instanceof Error
              ? detailResult.reason
              : new ApiClientError(
                  {
                    code: 'PR_NOT_FOUND',
                    message: 'PR 상세를 불러오지 못했습니다.',
                    retryable: false,
                  },
                  404,
                )
          }
        />
      </section>
    );
  }

  const riskAnalysis: PullRequestRiskAnalysisState =
    riskResult.status === 'fulfilled'
      ? 'status' in riskResult.value.data
        ? { kind: 'pending', data: riskResult.value.data }
        : { kind: 'ready', data: riskResult.value.data }
      : { kind: 'failed', error: riskResult.reason };

  const reviewRecommendations: PullRequestReviewRecommendationsState =
    reviewResult.status === 'fulfilled'
      ? { kind: 'ready', data: reviewResult.value.data }
      : { kind: 'failed', error: reviewResult.reason };

  return (
    <section className="flex flex-col gap-6">
      <BackLink />
      <PullRequestDetailView
        detail={detailResult.value.data}
        riskAnalysis={riskAnalysis}
        reviewRecommendations={reviewRecommendations}
      />
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/pulls"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3 w-3" /> PR 목록
    </Link>
  );
}

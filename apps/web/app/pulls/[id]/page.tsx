import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '../../../components/states';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PullRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <section className="flex flex-col gap-4">
      <Link
        href="/pulls"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3 w-3" /> PR 목록
      </Link>
      <header className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">PR 상세</h1>
        <p className="text-sm text-slate-500 mt-1">ID: {id}</p>
      </header>
      <EmptyState
        title="PR 상세 화면은 Phase 6에서 구현됩니다"
        description="현재는 라우트 placeholder입니다. 위험도 분석, 리뷰 추천, 액션 패널이 추가될 예정입니다."
      />
    </section>
  );
}

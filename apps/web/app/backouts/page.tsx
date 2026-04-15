import { EmptyState } from '../../components/states';

export const dynamic = 'force-dynamic';

export default function BackoutsPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Backout Center</h1>
        <p className="text-sm text-slate-500 mt-1">revert PR 요청과 진행 상태를 확인합니다.</p>
      </header>
      <EmptyState
        title="최근 Backout 요청이 없습니다"
        description="Phase 8에서 backout 요청 생성, 검증, revert PR 자동화가 추가됩니다."
      />
    </section>
  );
}

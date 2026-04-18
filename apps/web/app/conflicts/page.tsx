import { EmptyState } from '../../components/states';

export const dynamic = 'force-dynamic';

export default function ConflictsPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Conflict Cases</h1>
        <p className="text-sm text-muted-foreground mt-1">충돌 사례와 해결 가이드 목록입니다.</p>
      </header>
      <EmptyState
        title="현재 열린 충돌 사례가 없습니다"
        description="Phase 7에서 conflict case 모델, 가이드 생성 잡, 상세 화면이 추가됩니다."
      />
    </section>
  );
}

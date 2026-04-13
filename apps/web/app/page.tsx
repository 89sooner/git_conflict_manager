import {
  pullRequestBadge,
  riskBadge,
  type PullRequestState,
  type RiskLevel,
} from '@gsp/shared-types';
import { StatusBadge } from '../components/StatusBadge';

const PR_DEMO_STATES: PullRequestState[] = [
  'draft',
  'open',
  'under-review',
  'changes-requested',
  'approved',
  'merge-blocked',
  'ready-to-merge',
  'queued-for-merge',
  'merged',
  'closed',
  'reverted',
];

const RISK_DEMO_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

export default function HomePage() {
  return (
    <section style={{ display: 'grid', gap: 24, maxWidth: 960 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 22 }}>Developer Portal</h1>
        <p style={{ margin: '8px 0 0', color: '#475569' }}>
          상태 배지와 액션 패널의 단일 출처는 <code>packages/shared-types</code>입니다.
        </p>
      </header>

      <article style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Pull Request 상태 배지</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PR_DEMO_STATES.map((state) => (
            <StatusBadge key={state} descriptor={pullRequestBadge(state)} />
          ))}
        </div>
      </article>

      <article style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>위험도 배지</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {RISK_DEMO_LEVELS.map((level) => (
            <StatusBadge key={level} descriptor={riskBadge(level)} />
          ))}
        </div>
      </article>
    </section>
  );
}

import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { Dashboard } from '@/components/dashboard';

export default function Index() {
  return <Dashboard summary={MOCK_COST_AUDIT_SUMMARY} />;
}

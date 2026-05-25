
import rules from '@/data/rules-output.json';
import backtest from '@/data/backtest.json';
import weekly from '@/data/weekly-review.json';
import performance from '@/data/weekly-performance.json';

export type DashboardData = {
  rules: any;
  backtest: any;
  weekly: any;
  performanceMd: string;
  generatedAt: string;
};

export function getDashboardData(): DashboardData {
  return {
    rules,
    backtest,
    weekly,
    performanceMd: (performance as any).content,
    generatedAt: new Date().toISOString(),
  };
}

export function formatPkr(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  return `PKR ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatPct(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'n/a';
  return `${n.toFixed(2)}%`;
}

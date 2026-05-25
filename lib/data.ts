
import fallbackRules from '@/data/rules-output.json';
import fallbackBacktest from '@/data/backtest.json';
import fallbackWeekly from '@/data/weekly-review.json';
import fallbackPerformance from '@/data/weekly-performance.json';

export type DashboardData = {
  rules: any;
  backtest: any;
  weekly: any;
  performanceMd: string;
  generatedAt: string;
  dataSource: 'github-live' | 'static-fallback';
  publishedAt?: string | null;
  liveError?: string | null;
};

const OWNER_REPO = process.env.PSX_DASHBOARD_REPO || 'hmseeb/nix-psx-dashboard';
const LIVE_PATH = process.env.PSX_DASHBOARD_DATA_PATH || 'data/live-dashboard.json';

function fallbackData(error?: string): DashboardData {
  return {
    rules: fallbackRules,
    backtest: fallbackBacktest,
    weekly: fallbackWeekly,
    performanceMd: (fallbackPerformance as any).content,
    generatedAt: new Date().toISOString(),
    dataSource: 'static-fallback',
    publishedAt: null,
    liveError: error || null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const url = `https://raw.githubusercontent.com/${OWNER_REPO}/main/${LIVE_PATH}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallbackData(`GitHub live data fetch failed: ${res.status}`);
    const live = await res.json();
    return {
      rules: live.rules || fallbackRules,
      backtest: live.backtest || fallbackBacktest,
      weekly: live.weekly || fallbackWeekly,
      performanceMd: live.performanceMd || (fallbackPerformance as any).content,
      generatedAt: new Date().toISOString(),
      dataSource: 'github-live',
      publishedAt: live.published_at || null,
      liveError: null,
    };
  } catch (err: any) {
    return fallbackData(err?.message || String(err));
  }
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

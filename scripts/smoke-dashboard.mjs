#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8');
const route = readFileSync(join(root, 'app/api/dashboard/route.ts'), 'utf8');
const live = JSON.parse(readFileSync(join(root, 'data/live-dashboard.json'), 'utf8'));
const fallbackRules = JSON.parse(readFileSync(join(root, 'data/rules-output.json'), 'utf8'));

const expectedActive = ['EFERT', 'ENGROH', 'FFC', 'HUBC', 'LUCK', 'MARI', 'MEBL', 'MLCF', 'OGDC', 'PPL', 'SEARL', 'SYS'];
const expectedShares = {
  EFERT: 200,
  ENGROH: 255,
  FFC: 338,
  HUBC: 310,
  LUCK: 236,
  MARI: 96,
  MEBL: 217,
  MLCF: 597,
  OGDC: 266,
  PPL: 160,
  SEARL: 1325,
  SYS: 817,
};
const expectedCostBasis = {
  EFERT: 40004.68,
  ENGROH: 72321.33,
  FFC: 192915.66,
  HUBC: 72991.05,
  LUCK: 110585.50,
  MARI: 64877.51,
  MEBL: 111908.48,
  MLCF: 65032.57,
  OGDC: 90059.78,
  PPL: 39994.65,
  SEARL: 124894.78,
  SYS: 124314.74,
};
const expectedCash = 439.52;

function activeHoldings(rules) {
  return (rules?.portfolio?.holdings || []).filter((h) => (h.status || 'active') === 'active');
}

function activeTickers(rules) {
  return activeHoldings(rules).map((h) => h.ticker).filter(Boolean).sort();
}

function near(actual, expected, cents = 0.05) {
  return Math.abs(Number(actual) - expected) <= cents;
}

function assertActiveSet(label, rules) {
  const tickers = activeTickers(rules);
  assert.deepEqual(tickers, [...expectedActive].sort(), `${label} active tickers must match current portfolio YAML`);
  assert.ok(!tickers.includes('PTC'), `${label} must not include sold PTC as active`);
  const byTicker = Object.fromEntries(activeHoldings(rules).map((h) => [h.ticker, h]));
  for (const ticker of expectedActive) {
    assert.equal(Number(byTicker[ticker]?.shares), expectedShares[ticker], `${label} ${ticker} shares mismatch`);
    if (byTicker[ticker]?.cost_basis_pkr != null) {
      assert.ok(near(byTicker[ticker].cost_basis_pkr, expectedCostBasis[ticker]), `${label} ${ticker} cost basis mismatch`);
    }
  }
  if (rules?.portfolio?.cash_pkr != null) {
    assert.ok(near(rules.portfolio.cash_pkr, expectedCash), `${label} cash mismatch`);
  }
}

assert.match(page, /getDashboardData/, 'dashboard page must load live dashboard data');
assert.match(page, /NIX_PSX_V2_UNIFIED_UX/, 'dashboard page must carry the unified UX marker');
assert.match(page, /sourceHoldings = liveHoldings\.length \? liveHoldings : FALLBACK_HOLDINGS/, 'dashboard page must render dynamic live holdings before fallback rows');
assert.doesNotMatch(page, /const PDF_HOLDINGS|all 8 positions|8 positions|All 8 PDF holdings/, 'dashboard page must not hardcode the old 8-position cashbook snapshot');
assert.match(page, /Total account value/, 'dashboard page must anchor on total account value');
assert.match(page, /Allocation/, 'dashboard page must include the allocation breakdown');
assert.match(page, /positions\.map/, 'dashboard page must render every holdings row from the live portfolio positions');
assert.match(page, /holdingPnl|Unrealized P&amp;L/, 'dashboard page must show per-position unrealized P&L without relying on horizontal scrolling');
assert.doesNotMatch(page, /tableScroll|<table className="tbl"/, 'dashboard holdings must not require horizontal table scrolling');
assert.doesNotMatch(page, /taken down|system offline|automation: paused/i, 'dashboard page must not render takedown copy');
assert.match(route, /getDashboardData/, 'api route must use getDashboardData');
assert.match(route, /NextResponse\.json\(data/, 'api route must return dashboard data');
assert.doesNotMatch(route, /status:\s*410|ok:\s*false|offline/i, 'api route must not return offline 410 payload');

for (const key of ['rules', 'backtest', 'weekly', 'performanceMd', 'published_at']) {
  assert.ok(Object.prototype.hasOwnProperty.call(live, key), `live-dashboard.json missing ${key}`);
}

assertActiveSet('live-dashboard fallback', live.rules);
assertActiveSet('rules fallback', fallbackRules);
assert.notEqual(String(fallbackRules.generated_at || '').slice(0, 10), '2026-05-25', 'rules fallback must not be stale May data');

console.log('PSX_DASHBOARD_SMOKE: ok');

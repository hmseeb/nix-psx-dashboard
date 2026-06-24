#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8');
const route = readFileSync(join(root, 'app/api/dashboard/route.ts'), 'utf8');
const live = JSON.parse(readFileSync(join(root, 'data/live-dashboard.json'), 'utf8'));
const fallbackRules = JSON.parse(readFileSync(join(root, 'data/rules-output.json'), 'utf8'));
const expectedActive = ['ENGROH', 'FFC', 'HUBC', 'LUCK', 'MEBL', 'PPL', 'SEARL', 'SYS'];
const expectedShares = { ENGROH: 255, FFC: 199, HUBC: 310, LUCK: 236, MEBL: 217, PPL: 160, SEARL: 1325, SYS: 817 };
const expectedCostBasis = { ENGROH: 72321.33, FFC: 112773.42, HUBC: 72991.05, LUCK: 110585.50, MEBL: 111908.48, PPL: 39994.65, SEARL: 124894.78, SYS: 124314.74 };
const expectedCash = 50567.31;

function activeHoldings(rules) {
  return rules?.portfolio?.holdings || [];
}

function activeTickers(rules) {
  return activeHoldings(rules).map((h) => h.ticker).filter(Boolean).sort();
}

function near(actual, expected, cents = 0.05) {
  return Math.abs(Number(actual) - expected) <= cents;
}

function assertActiveSet(label, rules) {
  const tickers = activeTickers(rules);
  assert.deepEqual(tickers, [...expectedActive].sort(), `${label} active tickers must match FINQALAB cashbook`);
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
assert.match(page, /PDF_HOLDINGS/, 'dashboard page must include the FINQALAB PDF reconciliation ledger');
assert.match(page, /Total account value/, 'dashboard page must anchor on total account value');
assert.match(page, /Allocation/, 'dashboard page must include the allocation breakdown');
assert.match(page, /rows\.map/, 'dashboard page must render every holdings row');
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

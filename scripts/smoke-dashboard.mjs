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

function activeTickers(rules) {
  return (rules?.portfolio?.holdings || []).map((h) => h.ticker).filter(Boolean).sort();
}

function assertActiveSet(label, tickers) {
  assert.deepEqual(tickers, [...expectedActive].sort(), `${label} active tickers must match canonical portfolio`);
  assert.ok(!tickers.includes('PTC'), `${label} must not include sold PTC as active`);
}

assert.match(page, /getDashboardData/, 'dashboard page must load live dashboard data');
assert.doesNotMatch(page, /taken down|system offline|automation: paused/i, 'dashboard page must not render takedown copy');
assert.match(page, /holdings\.map/, 'dashboard page must render every active holding, not only holdings[0]');
assert.match(route, /getDashboardData/, 'api route must use getDashboardData');
assert.match(route, /NextResponse\.json\(data/, 'api route must return dashboard data');
assert.doesNotMatch(route, /status:\s*410|ok:\s*false|offline/i, 'api route must not return offline 410 payload');

for (const key of ['rules', 'backtest', 'weekly', 'performanceMd', 'published_at']) {
  assert.ok(Object.prototype.hasOwnProperty.call(live, key), `live-dashboard.json missing ${key}`);
}

assertActiveSet('live-dashboard fallback', activeTickers(live.rules));
assertActiveSet('rules fallback', activeTickers(fallbackRules));
assert.notEqual(String(fallbackRules.generated_at || '').slice(0, 10), '2026-05-25', 'rules fallback must not be stale May data');

console.log('PSX_DASHBOARD_SMOKE: ok');

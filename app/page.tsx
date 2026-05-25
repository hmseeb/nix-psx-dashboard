
import { Activity, AlertTriangle, BarChart3, Database, ShieldCheck, Target, TrendingUp, WalletCards } from 'lucide-react';
import { formatPct, formatPkr, getDashboardData } from '@/lib/data';

function tone(value: any) {
  const v = String(value ?? '').toLowerCase();
  if (['buy', 'safe', 'ok', 'risk_on', 'high'].some((k) => v.includes(k))) return 'good';
  if (['watch', 'neutral', 'medium', 'limited', 'low'].some((k) => v.includes(k))) return 'warn';
  if (['avoid', 'trim', 'exit', 'crisis', 'risk_off'].some((k) => v.includes(k))) return 'bad';
  return '';
}

function Pill({ children, value }: { children: React.ReactNode; value?: any }) {
  return <span className={`pill ${tone(value ?? children)}`}>{children}</span>;
}

function Metric({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return <article className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub && <div className="metricSub">{sub}</div>}</article>;
}

export default async function Page() {
  const { rules, backtest, weekly, performanceMd, dataSource, publishedAt, liveError } = await getDashboardData();
  const market = rules.market_regime || {};
  const dq = rules.data_quality || {};
  const portfolio = rules.portfolio || {};
  const holdings = portfolio.holdings || [];
  const opportunities = (rules.opportunities || []).slice(0, 8);
  const monthly = (backtest.monthly_returns || []).slice(-12);
  const maxAbs = Math.max(1, ...monthly.map((m: any) => Math.abs(Number(m.strategy_return_pct || 0))));
  const generated = rules.generated_at_pkt || rules.generated_at || 'n/a';

  return <main className="shell">
    <nav className="nav">
      <div className="brand"><div className="logo">N</div><div>NIX PSX COMMAND</div></div>
      <div className="navMeta">snapshot {generated} · {dataSource}</div>
    </nav>

    <section className="hero">
      <div className="card heroMain">
        <div className="eyebrow">rules-based advisory web app</div>
        <h1>PSX signal stack, not vibes.</h1>
        <p className="lead">A hosted Next.js dashboard for deterministic PSX scores, execution guards, stops, targets, audit ledger status, benchmark caveats, and portfolio risk.</p>
        <div className="statusRow">
          <Pill value={market.regime}><Activity size={14}/> market {market.score}/100 · {market.regime}</Pill>
          <Pill value={dq.score_confidence}><ShieldCheck size={14}/> confidence {dq.score_confidence}</Pill>
          <Pill value="low"><Database size={14}/> history {dq.history_coverage_pct}%</Pill>
          <Pill value={dataSource}><Database size={14}/> {dataSource}{publishedAt ? ` · ${publishedAt}` : ""}</Pill>
        </div>
      </div>
      <div className="panel command">
        <div className="panelHead"><h2>system command</h2><span className="caption">live snapshot</span></div>
        <Metric label="portfolio value" value={formatPkr(portfolio.estimated_value_pkr)} sub="source: psx-rules-engine.py" />
        <Metric label="recommendations" value={<>{weekly?.recommendations_last_7d?.count ?? 0}<span> / 7d</span></>} sub={`executions: ${weekly?.executions_last_7d?.count ?? 0}`} />
      </div>
    </section>

    <section className="metricGrid">
      <Metric label="backtest return" value={formatPct(backtest.total_return)} sub={backtest.backtest_mode} />
      <Metric label="win rate" value={formatPct(backtest.win_rate)} sub="matured outcomes pending" />
      <Metric label="max drawdown" value={formatPct(backtest.max_drawdown)} sub="limited history" />
      <Metric label="trades" value={backtest.number_of_trades ?? 'n/a'} sub="monthly skeleton" />
    </section>

    <section className="grid2">
      <div className="panel">
        <div className="panelHead"><h2>active holdings risk</h2><span className="caption">portfolio officer</span></div>
        <div className="metricGrid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', margin: 0}}>
          {holdings.map((h: any) => <Metric key={h.ticker} label={h.ticker} value={<>{h.risk_score}<span>/100</span></>} sub={<><Pill value={h.risk_action}>{h.risk_action}</Pill> {formatPkr(h.market_value_pkr)}</>} />)}
        </div>
      </div>
      <div className="panel">
        <div className="panelHead"><h2>backtest monthly bars</h2><span className="caption">limited mode</span></div>
        <div className="bars">
          {monthly.map((m: any) => <div className="barWrap" key={m.month}><div className="barTrack"><div className="bar" style={{height: `${Math.max(4, Math.abs(Number(m.strategy_return_pct || 0))/maxAbs*100)}%`}} /></div><div className="barLabel">{m.month}</div><div className="barVal">{formatPct(m.strategy_return_pct)}</div></div>)}
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panelHead"><h2>top opportunities</h2><span className="caption">execution-guard aware</span></div>
      <div className="opps">
        {opportunities.map((o: any) => <article className="opp" key={o.ticker}>
          <div className="oppHead"><div><span className="ticker">{o.ticker}</span><span className="sector">{o.sector}</span></div><span className="score">{o.score}</span></div>
          <div className="row"><span>action</span><b><Pill value={o.action}>{o.action}</Pill></b></div>
          <div className="row"><span>price</span><b>{formatPkr(o.price)}</b></div>
          <div className="levels"><div><small>stop</small><strong>{formatPkr(o.stop_pkr)}</strong></div><div><small>target 1</small><strong>{formatPkr(o.target_1_pkr)}</strong></div><div><small>target 2</small><strong>{formatPkr(o.target_2_pkr)}</strong></div></div>
          <p className="note">{o.execution_guard?.notes?.[0] || o.setup || 'no execution guard notes'}</p>
        </article>)}
      </div>
    </section>

    <section className="grid2">
      <div className="panel"><div className="panelHead"><h2>weekly performance notes</h2><span className="caption">no fake conclusions</span></div><div className="monoBox">{performanceMd}</div></div>
      <div className="panel"><div className="panelHead"><h2>data quality caveats</h2><span className="caption">truth layer</span></div><div className="monoBox">{JSON.stringify(backtest.data_quality || {}, null, 2)}</div></div>
    </section>

    <footer className="footer">Next.js + Vercel. Data source: {dataSource}. {liveError ? `Live data warning: ${liveError}` : "Morning cron publishes fresh JSON without redeploy."}</footer>
  </main>;
}

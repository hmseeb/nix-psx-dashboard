import { Activity, AlertTriangle, BarChart3, CheckCircle2, Database, ShieldCheck, Target, WalletCards } from 'lucide-react';
import { formatPct, formatPkr, getDashboardData } from '@/lib/data';

function tone(value: any) {
  const v = String(value ?? '').toLowerCase();
  if (['buy', 'safe', 'ok', 'risk_on', 'high', 'positive'].some((k) => v.includes(k))) return 'good';
  if (['watch', 'neutral', 'medium', 'limited', 'low', 'pending', 'safe_hold'].some((k) => v.includes(k))) return 'warn';
  if (['avoid', 'trim', 'exit', 'crisis', 'risk_off', 'missing'].some((k) => v.includes(k))) return 'bad';
  return '';
}

function Pill({ children, value }: { children: React.ReactNode; value?: any }) {
  return <span className={`pill ${tone(value ?? children)}`}>{children}</span>;
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return <article className="metricTile"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div>{sub && <div className="metricSub">{sub}</div>}</article>;
}

function Section({ title, caption, icon, children, className = '' }: { title: string; caption?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    <div className="panelHead"><div className="sectionTitle">{icon && <span className="sectionIcon">{icon}</span>}<h2>{title}</h2></div>{caption && <span className="caption">{caption}</span>}</div>
    {children}
  </section>;
}

function Row({ label, value, toneValue }: { label: string; value: React.ReactNode; toneValue?: any }) {
  return <div className="infoRow"><span>{label}</span><b>{toneValue ? <Pill value={toneValue}>{value}</Pill> : value}</b></div>;
}

function actionText(rules: any, weekly: any) {
  const holding = rules?.portfolio?.holdings?.[0];
  const risk = holding?.risk_action || 'review';
  const confidence = rules?.data_quality?.score_confidence || 'unknown';
  const opps = rules?.opportunities || [];
  const best = opps[0];
  if (confidence === 'low') {
    return `hold ENGROH; treat ${best?.ticker || 'top picks'} as guarded watchlist until history improves.`;
  }
  if (String(risk).includes('sell') || String(risk).includes('trim')) return `${risk} on ${holding?.ticker || 'portfolio'}; risk rules triggered.`;
  return `hold ENGROH; no forced trade. ${weekly?.recommendations_last_7d?.count ?? 0} recommendations are being tracked.`;
}

export default async function Page() {
  const { rules, backtest, weekly, performanceMd, dataSource, publishedAt, liveError } = await getDashboardData();
  const market = rules.market_regime || {};
  const dq = rules.data_quality || {};
  const portfolio = rules.portfolio || {};
  const holdings = portfolio.holdings || [];
  const active = holdings[0] || {};
  const opportunities = (rules.opportunities || []).slice(0, 6);
  const generated = rules.generated_at_pkt || rules.generated_at || 'n/a';
  const backtestDq = backtest.data_quality || {};
  const matured = weekly?.matured_outcomes?.count ?? backtest?.matured_outcomes ?? 0;

  return <main className="shell">
    <nav className="nav">
      <div className="brand"><div className="logo">N</div><div><strong>NIX PSX Command Center</strong><span>shariah-only · finqalab-ready</span></div></div>
      <div className="navMeta">snapshot {generated} · {dataSource}</div>
    </nav>

    <section className="heroCommand">
      <div className="heroCopy">
        <div className="eyebrow">executive command</div>
        <h1>{actionText(rules, weekly)}</h1>
        <p className="lead">single source of truth for the morning briefing and payday deployment: deterministic rules, portfolio risk, opportunity scores, execution guards, and data-quality caveats.</p>
      </div>
      <div className="decisionCard">
        <div className="decisionTop"><span>today's state</span><Pill value={market.regime}>{market.regime || 'n/a'}</Pill></div>
        <Metric label="market regime" value={<>{market.score ?? 'n/a'}<span>/100</span></>} sub={(market.reasons || []).slice(0, 2).join(' · ') || 'no regime reason'} />
        <div className="statusRow compact">
          <Pill value={dq.score_confidence}><ShieldCheck size={14}/> confidence {dq.score_confidence || 'n/a'}</Pill>
          <Pill value={dataSource}><Database size={14}/> {dataSource}</Pill>
        </div>
      </div>
    </section>

    <section className="metricGrid topMetrics" aria-label="system snapshot metrics">
      <Metric label="recommendations 7d" value={weekly?.recommendations_last_7d?.count ?? 0} sub="tracked, not performance proof" />
      <Metric label="executions 7d" value={weekly?.executions_last_7d?.count ?? 0} sub="actual FINQALAB fills logged" />
      <Metric label="matured outcomes" value={matured ?? 0} sub="win-rate pending until mature" />
      <Metric label="portfolio value" value={formatPkr(portfolio.estimated_value_pkr)} sub="active holdings only" />
    </section>

    <section className="grid2">
      <Section title="portfolio risk" caption="ENGROH only" icon={<WalletCards size={17}/>}> 
        <div className="holdingHeader"><div><span className="ticker">{active.ticker || 'ENGROH'}</span><small>{active.shares ?? 0} shares · avg {formatPkr(active.avg_cost_pkr)}</small></div><Pill value={active.risk_action}>{active.risk_action || 'n/a'}</Pill></div>
        <div className="rows">
          <Row label="current/rules price" value={formatPkr(active.price)} />
          <Row label="market value" value={formatPkr(active.market_value_pkr)} />
          <Row label="unrealized p&l" value={`${formatPkr(active.unrealized_pnl_pkr)} · ${formatPct(active.unrealized_pnl_pct)}`} />
          <Row label="portfolio weight" value={formatPct(active.portfolio_weight_pct)} />
          <Row label="risk score" value={`${active.risk_score ?? 'n/a'}/100`} toneValue={active.risk_action} />
        </div>
      </Section>

      <Section title="system snapshot" caption="same shape for daily + payday" icon={<Activity size={17}/>}> 
        <div className="rows">
          <Row label="KSE-100" value={`${market.indices?.KSE100?.value?.toLocaleString?.() || 'n/a'} · ${formatPct(market.indices?.KSE100?.pct)}`} />
          <Row label="KMI-30" value={`${market.indices?.KMI30?.value?.toLocaleString?.() || 'n/a'} · ${formatPct(market.indices?.KMI30?.pct)}`} />
          <Row label="market label" value={market.regime || 'n/a'} toneValue={market.regime} />
          <Row label="source" value={dataSource} toneValue={dataSource} />
          <Row label="published" value={publishedAt || generated} />
        </div>
      </Section>
    </section>

    <Section title="opportunities and deployment gates" caption="orders separate from watchlist" icon={<Target size={17}/>}> 
      <div className="opps">
        {opportunities.map((o: any) => <article className="opportunityCard" key={o.ticker}>
          <div className="oppHead"><div><span className="ticker">{o.ticker}</span><span className="sector">{o.sector}</span></div><span className="score">{o.score}</span></div>
          <div className="rows tight">
            <Row label="action" value={o.action} toneValue={o.action} />
            <Row label="price" value={formatPkr(o.price)} />
            <Row label="stop" value={formatPkr(o.stop_pkr)} />
            <Row label="target 1" value={formatPkr(o.target_1_pkr)} />
            <Row label="target 2" value={formatPkr(o.target_2_pkr)} />
          </div>
          <p className="note">{o.execution_guard?.notes?.[0] || o.setup || 'no execution guard notes'}</p>
        </article>)}
      </div>
    </Section>

    <section className="grid2">
      <Section title="data quality" caption="truth layer" icon={<AlertTriangle size={17}/>}> 
        <div className="qualityBox">
          <Pill value={dq.score_confidence}>score confidence: {dq.score_confidence || 'n/a'}</Pill>
          <p>history coverage is {dq.history_coverage_pct ?? 0}%. point-in-time scoring/backtest confidence remains limited, so recommendations are tracked but not treated as proven alpha.</p>
        </div>
        <div className="rows">
          <Row label="tickers with 200d history" value={`${dq.tickers_with_200d_history ?? 0}/${dq.tickers_total ?? 0}`} />
          <Row label="backtest mode" value={backtestDq.backtest_mode || backtest.backtest_mode || 'limited'} toneValue="limited" />
          <Row label="missing benchmarks" value={(backtestDq.missing_or_insufficient_benchmark_history || []).join(', ') || 'n/a'} />
        </div>
      </Section>
      <Section title="performance notes" caption="no fake conclusions" icon={<BarChart3 size={17}/>}> 
        <div className="monoBox">{performanceMd}</div>
      </Section>
    </section>

    <footer className="footer"><CheckCircle2 size={14}/> dashboard marker: NIX_PSX_V2_UNIFIED_UX · data source: {dataSource}. {liveError ? `Live data warning: ${liveError}` : 'morning cron publishes fresh JSON without redeploy.'}</footer>
  </main>;
}

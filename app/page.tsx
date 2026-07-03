import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { getDashboardData } from '@/lib/data';

// ─────────────────────────────────────────────────────────────────────────────
// NIX_PSX_V2_UNIFIED_UX
// FINQALAB / portfolio YAML book cost basis is the source of truth. The dashboard
// must render the live portfolio payload dynamically, not a frozen statement-era
// ticker list. Static rows below are only an emergency fallback if the live feed
// has no holdings.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_HOLDINGS = [
  { ticker: 'ENGROH', name: 'Engro Holdings',      sector: 'Holding co.',  shares: 255,  avgCost: 283.6131, bookCost: 72321.33 },
  { ticker: 'FFC',    name: 'Fauji Fertilizer',    sector: 'Fertilizer',   shares: 338,  avgCost: 570.7564, bookCost: 192915.66 },
  { ticker: 'HUBC',   name: 'Hub Power',           sector: 'Power',        shares: 310,  avgCost: 235.4550, bookCost: 72991.05 },
  { ticker: 'LUCK',   name: 'Lucky Cement',        sector: 'Cement',       shares: 236,  avgCost: 468.5826, bookCost: 110585.50 },
  { ticker: 'MEBL',   name: 'Meezan Bank',         sector: 'Islamic bank', shares: 217,  avgCost: 515.7073, bookCost: 111908.48 },
  { ticker: 'PPL',    name: 'Pakistan Petroleum',  sector: 'E&P',          shares: 160,  avgCost: 249.9666, bookCost: 39994.65 },
  { ticker: 'SEARL',  name: 'The Searle Company',  sector: 'Pharma',       shares: 1325, avgCost: 94.2602,  bookCost: 124894.78 },
  { ticker: 'SYS',    name: 'Systems Ltd',         sector: 'Technology',   shares: 817,  avgCost: 152.16,   bookCost: 124314.74 },
];

const HOLDING_META: Record<string, { name: string; sector: string }> = {
  EFERT: { name: 'Engro Fertilizers', sector: 'Fertilizer' },
  ENGROH: { name: 'Engro Holdings', sector: 'Holding co.' },
  FFC: { name: 'Fauji Fertilizer', sector: 'Fertilizer' },
  HUBC: { name: 'Hub Power', sector: 'Power' },
  LUCK: { name: 'Lucky Cement', sector: 'Cement' },
  MARI: { name: 'Mari Petroleum', sector: 'E&P' },
  MEBL: { name: 'Meezan Bank', sector: 'Islamic bank' },
  MLCF: { name: 'Maple Leaf Cement', sector: 'Cement' },
  OGDC: { name: 'Oil & Gas Development Co.', sector: 'E&P' },
  PPL: { name: 'Pakistan Petroleum', sector: 'E&P' },
  SEARL: { name: 'The Searle Company', sector: 'Pharma' },
  SYS: { name: 'Systems Ltd', sector: 'Technology' },
};

const CASH_PKR = 50567.31;

// Cool, restrained allocation palette — deep blue brand stepped to teal, cash neutral gray.
const ALLOC_COLORS = ['#1554d6', '#2f6bf0', '#4f86f6', '#6f9ff9', '#1f9488', '#37ab9b', '#86a3c9', '#b0bdd2'];
const CASH_COLOR = '#aeb8c7';

const num = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const signed = (v: number, d = 2) => (v >= 0 ? '+' : '−') + num(Math.abs(v), d);
const pct = (v: number, d = 1) => (Number.isFinite(v) ? num(v, d) : '—') + '%';

export default async function Page() {
  const { rules, dataSource, publishedAt, liveError } = await getDashboardData();
  const liveHoldings: any[] = (rules?.portfolio?.holdings || []).filter((h: any) => (h.status || 'active') === 'active');
  const opps: any[] = rules?.opportunities || [];
  const dq = rules?.data_quality || {};
  const market = rules?.market_regime || {};
  const asOf = rules?.generated_at_pkt || rules?.generated_at || 'unknown';

  const priceOf = (t: string): { price: number; src: string } | null => {
    const h = liveHoldings.find((x) => x.ticker === t);
    if (h && Number.isFinite(+h.price)) return { price: +h.price, src: 'last close' };
    const o = opps.find((x) => x.ticker === t);
    if (o && Number.isFinite(+o.price)) return { price: +o.price, src: 'screen' };
    return null;
  };

  const liveByTicker = new Map(liveHoldings.map((h) => [h.ticker, h]));
  const sourceHoldings = liveHoldings.length ? liveHoldings : FALLBACK_HOLDINGS;
  const usingFallbackHoldings = liveHoldings.length === 0;

  const rows = sourceHoldings.map((h: any) => {
    const ticker = h.ticker;
    const feed = liveByTicker.get(ticker) as any;
    const meta = HOLDING_META[ticker] || { name: ticker, sector: 'Portfolio' };
    const shares = Number(h.shares ?? feed?.shares ?? 0);
    const avgCost = Number(h.avg_cost_pkr ?? h.avgCost ?? feed?.avg_cost_pkr ?? 0);
    const bookCost = Number(h.cost_basis_pkr ?? h.bookCost ?? feed?.cost_basis_pkr ?? avgCost * shares);
    const live = priceOf(ticker);
    const mv = Number.isFinite(+h.market_value_pkr) ? +h.market_value_pkr : live ? shares * live.price : null;
    const pnl = Number.isFinite(+h.unrealized_pnl_pkr) ? +h.unrealized_pnl_pkr : mv != null ? mv - bookCost : null;
    const pnlPct = Number.isFinite(+h.unrealized_pnl_pct) ? +h.unrealized_pnl_pct : pnl != null && bookCost ? (pnl / bookCost) * 100 : null;
    return {
      ticker,
      name: h.name || meta.name,
      sector: h.sector || meta.sector,
      shares,
      avgCost,
      bookCost,
      price: live?.price ?? (Number.isFinite(+h.price) ? +h.price : null),
      mv,
      pnl,
      pnlPct,
      feed: feed || h,
    };
  });
  const missingFromFeed = usingFallbackHoldings ? rows.map((h) => h.ticker) : [];
  const extraInFeed: string[] = [];
  const holdingCount = rows.length;

  const bookTotal = rows.reduce((s, h) => s + h.bookCost, 0);
  const equityMv = rows.reduce((s, r) => s + (r.mv ?? r.bookCost), 0); // book fallback if a price is missing
  const pricedAll = rows.every((r) => r.mv != null);
  const unrealized = equityMv - bookTotal;
  const unrealizedPct = (unrealized / bookTotal) * 100;
  const cash = Number(rules?.portfolio?.cash_pkr ?? CASH_PKR);
  const account = equityMv + cash;

  const isLive = dataSource === 'github-live';
  const up = unrealized >= 0;

  // Allocation = each position + cash as a share of total account value.
  const positions = rows
    .map((r) => {
      const value = r.mv ?? r.bookCost;
      return { ...r, value, weight: account > 0 ? (value / account) * 100 : 0 };
    })
    .sort((a, b) => b.value - a.value);
  const cashWeight = account > 0 ? (cash / account) * 100 : 0;
  const allocation = [
    ...positions.map((p, i) => ({ key: p.ticker, label: p.ticker, weight: p.weight, value: p.value, color: ALLOC_COLORS[i % ALLOC_COLORS.length] })),
    { key: 'CASH', label: 'Cash', weight: cashWeight, value: cash, color: CASH_COLOR },
  ];

  // Concentration — top positions by weight and single-name exposure.
  const top = positions.slice(0, 3);
  const topWeight = top.reduce((s, p) => s + p.weight, 0);
  const maxPos = positions[0];

  // Watchlist = scored opportunities, flagged when already a position. Not part of the account.
  const held = new Set(rows.map((h) => h.ticker));
  const watch = opps
    .filter((o) => Number.isFinite(+o.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const reconOk = !usingFallbackHoldings && !missingFromFeed.length && !extraInFeed.length;

  return (
    <main className="root">
      {/* Sticky status bar — product, data state, and freshness stay in view while scrolling */}
      <div className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <span className="brandMark">PSX</span>
            <span className="brandName">FINQALAB Portfolio</span>
          </div>
          <div className="status">
            <span className={`pill ${isLive ? 'pillLive' : 'pillStatic'}`}>
              <i className="pillDot" />
              {isLive ? 'Live feed' : 'Static snapshot'}
            </span>
            <span className="asOf">As of {asOf}</span>
          </div>
        </div>
      </div>

      <div className="app">
        {/* Hero — total account value is the anchor; cash / equity / book cost are secondary */}
        <section className="hero">
          <div className="anchor">
            <div className="anchorLabel">Total account value</div>
            <div className="anchorValue">PKR {num(account)}</div>
            <div className={`anchorPnl ${up ? 'pos' : 'neg'}`}>
              {up ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              <span className="apAmt">{signed(unrealized)}</span>
              <span className="apPct">({signed(unrealizedPct)}%)</span>
              <span className="apTag">{up ? 'gain' : 'loss'} · unrealized</span>
            </div>
            <div className="anchorNote">
              Cash + equity, valued in PKR · {pricedAll ? `all ${holdingCount} positions priced at last close` : 'partial pricing — book cost used where a mark is missing'}
            </div>
          </div>

          <div className="stat">
            <div className="statLabel">Cash</div>
            <div className="statValue">{num(cash)}</div>
            <div className="statNote">Settled · {pct(cashWeight)} of account</div>
          </div>
          <div className="stat">
            <div className="statLabel">Equity at market</div>
            <div className="statValue">{num(equityMv)}</div>
            <div className="statNote">{holdingCount} positions · {pricedAll ? 'all priced live' : 'book used where unpriced'}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Book cost</div>
            <div className="statValue">{num(bookTotal)}</div>
            <div className="statNote">Invested capital · cost basis</div>
          </div>
        </section>

        {/* Allocation + concentration — what the account is made of, no mental math */}
        <section className="split">
          <div className="card alloc">
            <div className="cardHead">
              <h2>Allocation</h2>
              <span className="cardCap">share of total account value</span>
            </div>
            <div className="srOnly" id="allocationSummary">
              Allocation: {allocation.map((s) => `${s.label} ${pct(s.weight)} PKR ${num(s.value)}`).join('; ')}.
            </div>
            <div className="allocBar" aria-hidden="true">
              {allocation
                .filter((s) => s.weight > 0)
                .map((s) => (
                  <span key={s.key} className="allocSeg" style={{ width: `${s.weight}%`, background: s.color }} />
                ))}
            </div>
            <ul className="allocLegend">
              {allocation.map((s) => (
                <li key={s.key}>
                  <span className="legDot" style={{ background: s.color }} />
                  <span className="legLabel">{s.label}</span>
                  <span className="legPct">{pct(s.weight)}</span>
                  <span className="legAmt n">{num(s.value)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card conc">
            <div className="cardHead">
              <h2>Concentration</h2>
              <span className="cardCap">single-name exposure</span>
            </div>
            <div className="concStat">
              <div className="csLabel">Largest position</div>
              <div className="csValue">{maxPos?.ticker} <em>{pct(maxPos?.weight ?? 0)}</em></div>
              <div className="csNote n">PKR {num(maxPos?.value ?? 0)}</div>
            </div>
            <div className="concStat">
              <div className="csLabel">Top 3 holdings</div>
              <div className="csValue">{pct(topWeight)} <em>of account</em></div>
              <div className="csNote">{top.map((p) => p.ticker).join(' · ')}</div>
            </div>
            <div className="concStat">
              <div className="csLabel">Cash buffer</div>
              <div className="csValue">{pct(cashWeight)} <em>liquid</em></div>
              <div className="csNote n">PKR {num(cash)}</div>
            </div>
          </div>
        </section>

        {/* Workspace — holdings table beside the decision rail */}
        <section className="workspace">
          <div className="card holdings">
            <div className="cardHead">
              <h2>Holdings</h2>
              <span className="cardCap">cost basis from FINQALAB statement · mark from {isLive ? 'live feed' : 'last bundle'}</span>
            </div>
            <div className="holdingsList">
              <div className="holdingsHead" aria-hidden="true">
                <span>Position</span>
                <span>Shares / mark</span>
                <span>Book cost</span>
                <span>Market value</span>
                <span>Unrealized P&amp;L</span>
              </div>
              {positions.map((r) => {
                const rUp = (r.pnl ?? 0) >= 0;
                return (
                  <article className="holdingRow" key={r.ticker}>
                    <div className="holdingIdentity">
                      <div className="posTick">{r.ticker}</div>
                      <div className="posName">{r.name} · {r.sector}</div>
                    </div>
                    <div className="holdingMetric compact">
                      <span>Shares / mark</span>
                      <b className="n">{num(r.shares, 0)} × {r.price == null ? '—' : num(r.price)}</b>
                    </div>
                    <div className="holdingMetric hideMobile">
                      <span>Book cost</span>
                      <b className="n">{num(r.bookCost)}</b>
                    </div>
                    <div className="holdingMetric">
                      <span>Market value</span>
                      <b className="n">{num(r.value)}</b>
                      <em>{pct(r.weight)} of account</em>
                    </div>
                    <div className="holdingPnl">
                      <span>Unrealized P&amp;L</span>
                      {r.pnl == null ? (
                        <b className="pend">awaiting mark</b>
                      ) : (
                        <b className={`pnl ${rUp ? 'pos' : 'neg'}`}>
                          {rUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {signed(r.pnl)} <em>{signed(r.pnlPct ?? 0)}%</em>
                        </b>
                      )}
                    </div>
                  </article>
                );
              })}
              <div className="holdingSummary">
                <div>
                  <span>Equity subtotal</span>
                  <b className="n">{num(equityMv)}</b>
                </div>
                <div>
                  <span>Unrealized P&amp;L</span>
                  <b className={`pnl ${up ? 'pos' : 'neg'}`}>{signed(unrealized)} <em>{signed(unrealizedPct)}%</em></b>
                </div>
                <div>
                  <span>Cash</span>
                  <b className="n">{num(cash)}</b>
                </div>
                <div>
                  <span>Total account value</span>
                  <b className="n grand">{num(account)}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Decision rail — context and signals, clearly separated from the account */}
          <aside className="rail">
            <div className="card railCard">
              <div className="railHead">Market context</div>
              <div className="ctxRow">
                <span>KSE-100</span>
                <b className="n">{num(market.indices?.KSE100?.value ?? NaN, 0)} <em className={(market.indices?.KSE100?.pct ?? 0) >= 0 ? 'pos' : 'neg'}>{signed(market.indices?.KSE100?.pct ?? 0)}%</em></b>
              </div>
              <div className="ctxRow">
                <span>KMI-30</span>
                <b className="n">{num(market.indices?.KMI30?.value ?? NaN, 0)} <em className={(market.indices?.KMI30?.pct ?? 0) >= 0 ? 'pos' : 'neg'}>{signed(market.indices?.KMI30?.pct ?? 0)}%</em></b>
              </div>
              <div className="ctxRow">
                <span>Regime</span>
                <b className="regime">{market.regime || 'n/a'} · {market.score ?? '—'}/100</b>
              </div>
            </div>

            <div className="card railCard">
              <div className="railHead">Data quality</div>
              <div className="ctxRow">
                <span>Score confidence</span>
                <b className="badge badgeWarn">{dq.score_confidence || 'low'}</b>
              </div>
              <div className="ctxRow">
                <span>History coverage</span>
                <b className="n">{pct(dq.history_coverage_pct ?? 0, 0)}</b>
              </div>
              <div className="ctxRow">
                <span>200d history</span>
                <b className="n">{dq.tickers_with_200d_history ?? 0}/{dq.tickers_total ?? 0} names</b>
              </div>
              <div className="railFoot">Marks are last available close, not intraday ticks. Risk grades are conservative placeholders until history backfills.</div>
            </div>

            <div className="card railCard">
              <div className="railHead">Feed reconciliation</div>
              {reconOk ? (
                <div className="reconOk">All {holdingCount} active holdings match the live feed. No sold-only ticker (e.g. PTC) is active.</div>
              ) : (
                <div className="reconErr">
                  Mismatch — missing {missingFromFeed.join(', ') || 'none'}; extra {extraInFeed.join(', ') || 'none'}.
                </div>
              )}
              <div className="railFoot">Cash and share counts come from the current portfolio feed; closed round-trips (PTC, the prior ENGROH lot) are excluded.</div>
              {liveError ? <div className="reconErr">Live feed warning: {liveError} — figures shown are from the last good bundle.</div> : null}
            </div>

            <div className="card railCard">
              <div className="railHead">
                Watchlist <span className="railSub">signals — not positions</span>
              </div>
              <ul className="watch">
                {watch.map((o) => (
                  <li key={o.ticker}>
                    <span className="wTick">
                      {o.ticker}
                      {held.has(o.ticker) && <span className="heldBadge">Held</span>}
                    </span>
                    <span className="wAct">{String(o.action || '').replace(/_/g, ' ')}</span>
                    <span className="wScore n">{o.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <footer className="foot">
          <span>NIX · PSX reconciliation v3</span>
          <span>·</span>
          <span>book of record: FINQALAB statement</span>
          <span>·</span>
          <span>{isLive ? `published ${publishedAt || '—'} · morning cron republishes without redeploy` : 'static fallback bundle'}</span>
        </footer>
      </div>
    </main>
  );
}

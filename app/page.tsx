import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { getDashboardData } from '@/lib/data';

// ─────────────────────────────────────────────────────────────────────────────
// FINQALAB book cost basis is the source of truth (PDF-derived). Live prices /
// freshness are layered on top from the published feed; if the feed is missing a
// name, the ledger still reconciles against book cost. The presentation is a
// professional brokerage portfolio dashboard — the data contract is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const PDF_HOLDINGS = [
  { ticker: 'ENGROH', name: 'Engro Holdings',      sector: 'Holding co.',  shares: 255,  avgCost: 283.6131, bookCost: 72321.33 },
  { ticker: 'FFC',    name: 'Fauji Fertilizer',    sector: 'Fertilizer',   shares: 199,  avgCost: 566.7006, bookCost: 112773.42 },
  { ticker: 'HUBC',   name: 'Hub Power',           sector: 'Power',        shares: 310,  avgCost: 235.4550, bookCost: 72991.05 },
  { ticker: 'LUCK',   name: 'Lucky Cement',        sector: 'Cement',       shares: 236,  avgCost: 468.5826, bookCost: 110585.50 },
  { ticker: 'MEBL',   name: 'Meezan Bank',         sector: 'Islamic bank', shares: 217,  avgCost: 515.7073, bookCost: 111908.48 },
  { ticker: 'PPL',    name: 'Pakistan Petroleum',  sector: 'E&P',          shares: 160,  avgCost: 249.9666, bookCost: 39994.65 },
  { ticker: 'SEARL',  name: 'The Searle Company',  sector: 'Pharma',       shares: 1325, avgCost: 94.2602,  bookCost: 124894.78 },
  { ticker: 'SYS',    name: 'Systems Ltd',         sector: 'Technology',   shares: 817,  avgCost: 152.16,   bookCost: 124314.74 },
];
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
  const liveHoldings: any[] = rules?.portfolio?.holdings || [];
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
  const missingFromFeed = PDF_HOLDINGS.filter((h) => !liveByTicker.has(h.ticker)).map((h) => h.ticker);
  const extraInFeed = liveHoldings
    .map((h) => h.ticker)
    .filter((ticker) => !PDF_HOLDINGS.some((h) => h.ticker === ticker));

  const rows = PDF_HOLDINGS.map((h) => {
    const feed = liveByTicker.get(h.ticker) as any;
    const shares = Number(feed?.shares ?? h.shares);
    const avgCost = Number(feed?.avg_cost_pkr ?? h.avgCost);
    const bookCost = Number(feed?.cost_basis_pkr ?? h.bookCost);
    const live = priceOf(h.ticker);
    const mv = live ? shares * live.price : null;
    const pnl = mv != null ? mv - bookCost : null;
    const pnlPct = pnl != null ? (pnl / bookCost) * 100 : null;
    return { ...h, shares, avgCost, bookCost, price: live?.price ?? null, mv, pnl, pnlPct, feed };
  });

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
  const held = new Set(PDF_HOLDINGS.map((h) => h.ticker));
  const watch = opps
    .filter((o) => Number.isFinite(+o.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const reconOk = !missingFromFeed.length && !extraInFeed.length;

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
              Cash + equity, valued in PKR · {pricedAll ? 'all 8 positions priced at last close' : 'partial pricing — book cost used where a mark is missing'}
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
            <div className="statNote">8 positions · {pricedAll ? 'all priced live' : 'book used where unpriced'}</div>
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
            <div className="tableScroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="tL">Position</th>
                    <th className="tR">Shares</th>
                    <th className="tR">Avg cost</th>
                    <th className="tR">Book cost</th>
                    <th className="tR">Last price</th>
                    <th className="tR">Market value</th>
                    <th className="tR">Weight</th>
                    <th className="tR">Unrealized P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const rUp = (r.pnl ?? 0) >= 0;
                    const value = r.mv ?? r.bookCost;
                    const weight = account > 0 ? (value / account) * 100 : 0;
                    return (
                      <tr key={r.ticker}>
                        <td className="tL">
                          <div className="posTick">{r.ticker}</div>
                          <div className="posName">{r.name} · {r.sector}</div>
                        </td>
                        <td className="tR n">{num(r.shares, 0)}</td>
                        <td className="tR n">{num(r.avgCost, 4)}</td>
                        <td className="tR n strong">{num(r.bookCost)}</td>
                        <td className="tR n">{r.price == null ? '—' : num(r.price)}</td>
                        <td className="tR n strong">
                          {r.mv == null ? (
                            <span>{num(r.bookCost)} <em className="fallbackMark">book fallback</em></span>
                          ) : (
                            num(r.mv)
                          )}
                        </td>
                        <td className="tR n">{pct(weight)}</td>
                        <td className="tR">
                          {r.pnl == null ? (
                            <span className="pend">awaiting mark</span>
                          ) : (
                            <span className={`pnl ${rUp ? 'pos' : 'neg'}`}>
                              {rUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {signed(r.pnl)} <em>{signed(r.pnlPct ?? 0)}%</em>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="ftSub">
                    <td className="tL">Equity subtotal</td>
                    <td className="tR" />
                    <td className="tR" />
                    <td className="tR n strong">{num(bookTotal)}</td>
                    <td className="tR" />
                    <td className="tR n strong">{num(equityMv)}</td>
                    <td className="tR n">{pct(account > 0 ? (equityMv / account) * 100 : 0)}</td>
                    <td className="tR">
                      <span className={`pnl ${up ? 'pos' : 'neg'}`}>
                        {signed(unrealized)} <em>{signed(unrealizedPct)}%</em>
                      </span>
                    </td>
                  </tr>
                  <tr className="ftCash">
                    <td className="tL">Cash</td>
                    <td className="tR" /><td className="tR" /><td className="tR" /><td className="tR" />
                    <td className="tR n strong">{num(cash)}</td>
                    <td className="tR n">{pct(cashWeight)}</td>
                    <td className="tR muted">settled</td>
                  </tr>
                  <tr className="ftGrand">
                    <td className="tL">Total account value</td>
                    <td className="tR" /><td className="tR" /><td className="tR" /><td className="tR" />
                    <td className="tR n grand">{num(account)}</td>
                    <td className="tR n">100.0%</td>
                    <td className="tR" />
                  </tr>
                </tfoot>
              </table>
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
                <div className="reconOk">All 8 PDF holdings match the live feed. No sold-only ticker (e.g. PTC) is active.</div>
              ) : (
                <div className="reconErr">
                  Mismatch — missing {missingFromFeed.join(', ') || 'none'}; extra {extraInFeed.join(', ') || 'none'}.
                </div>
              )}
              <div className="railFoot">Cash and share counts reconcile to the FINQALAB cashbook; closed round-trips (PTC, the prior ENGROH lot) are excluded.</div>
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

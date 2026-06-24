import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Landmark, ScrollText } from 'lucide-react';
import { getDashboardData } from '@/lib/data';

// ─────────────────────────────────────────────────────────────────────────────
// FINQALAB statement — book cost basis is the source of truth (PDF-derived).
// Live prices/freshness are layered on top from the published feed; if the feed
// is missing a name, the ledger still reconciles against book cost.
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

const num = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const signed = (v: number, d = 2) => (v >= 0 ? '+' : '−') + num(Math.abs(v), d);

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
  const funded = bookTotal + cash;
  const account = equityMv + cash;

  const isLive = dataSource === 'github-live';
  const live = (n: number | null) => (n == null ? '—' : num(n));

  // Watchlist = scored opportunities, flagged when already a position. Not part of the account.
  const held = new Set(PDF_HOLDINGS.map((h) => h.ticker));
  const watch = opps
    .filter((o) => Number.isFinite(+o.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <main className="statement">
      {/* Letterhead — reads like the cover of the FINQALAB account statement */}
      <header className="masthead">
        <div className="mhLeft">
          <div className="seal"><ScrollText size={18} /></div>
          <div>
            <div className="mhKicker">FINQALAB · Pakistan Stock Exchange</div>
            <h1>Account Statement &amp; Reconciliation</h1>
            <div className="mhSub">Shariah-compliant equity book — 8 positions + cash, valued against book cost.</div>
          </div>
        </div>
        <div className="mhRight">
          <span className={`stamp ${isLive ? 'stampLive' : 'stampStale'}`}>{isLive ? 'live feed' : 'static snapshot'}</span>
          <div className="mhMeta">prices as of</div>
          <div className="mhStamp">{asOf}</div>
          <div className="mhMeta">{isLive ? `published ${publishedAt || '—'}` : 'fallback bundle'}</div>
        </div>
      </header>

      {/* Reconciliation header — cash + equity = total, then how it ties to book cost */}
      <section className="recon" aria-label="account reconciliation">
        <div className="reconStat">
          <div className="rsLabel"><CircleDollarSign size={14} /> Cash balance</div>
          <div className="rsValue">{num(cash)}</div>
          <div className="rsNote">settled, available to deploy</div>
        </div>
        <div className="reconStat">
          <div className="rsLabel"><Landmark size={14} /> Equity at market</div>
          <div className="rsValue">{num(equityMv)}</div>
          <div className="rsNote">8 positions · {pricedAll ? 'all priced live' : 'partial — book used where unpriced'}</div>
        </div>
        <div className="reconStat reconTotal">
          <div className="rsLabel">Total account value</div>
          <div className="rsValue rsBig">{num(account)}</div>
          <div className="rsNote">PKR, cash + equity</div>
        </div>
      </section>

      {/* The equation that resolves the "value mismatch": book + cash → funded → P&L → account */}
      <section className="equation" aria-label="cost basis reconciliation">
        <span className="eqTerm"><i>book cost</i><b>{num(bookTotal)}</b></span>
        <span className="eqOp">+</span>
        <span className="eqTerm"><i>cash</i><b>{num(cash)}</b></span>
        <span className="eqOp">=</span>
        <span className="eqTerm"><i>capital funded</i><b>{num(funded)}</b></span>
        <span className="eqOp eqArrow">→</span>
        <span className={`eqTerm eqPnl ${unrealized >= 0 ? 'pos' : 'neg'}`}>
          <i>unrealized</i><b>{signed(unrealized)} <span>({signed(unrealizedPct)}%)</span></b>
        </span>
        <span className="eqOp">=</span>
        <span className="eqTerm eqResult"><i>account value</i><b>{num(account)}</b></span>
      </section>

      {/* Holdings ledger — every PDF position, book cost beside live mark */}
      <section className="ledgerWrap">
        <div className="ledgerHead">
          <h2>Holdings ledger</h2>
          <span className="ledgerCap">cost basis from FINQALAB statement · mark from {isLive ? 'live feed' : 'last bundle'}</span>
        </div>
        <div className="ledgerScroll">
          <table className="ledger">
            <thead>
              <tr>
                <th className="tL">Position</th>
                <th className="tR">Shares</th>
                <th className="tR">Avg cost</th>
                <th className="tR">Book cost</th>
                <th className="tR">Last price<sup>*</sup></th>
                <th className="tR">Market value</th>
                <th className="tR">Unrealized P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const up = (r.pnl ?? 0) >= 0;
                return (
                  <tr key={r.ticker} className={`lrow ${r.pnl == null ? '' : up ? 'gutPos' : 'gutNeg'}`}>
                    <td className="tL">
                      <div className="posTick">{r.ticker}</div>
                      <div className="posName">{r.name} · {r.sector}</div>
                    </td>
                    <td className="tR n">{num(r.shares, 0)}</td>
                    <td className="tR n">{num(r.avgCost, 4)}</td>
                    <td className="tR n strong">{num(r.bookCost)}</td>
                    <td className="tR n">{live(r.price)}</td>
                    <td className="tR n strong">{live(r.mv)}</td>
                    <td className="tR n">
                      {r.pnl == null ? (
                        <span className="pnlPend">awaiting mark</span>
                      ) : (
                        <span className={`pnl ${up ? 'pos' : 'neg'}`}>
                          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {signed(r.pnl)} <em>{signed(r.pnlPct ?? 0)}%</em>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="tL">Equity subtotal</td>
                <td className="tR" />
                <td className="tR" />
                <td className="tR n strong">{num(bookTotal)}</td>
                <td className="tR" />
                <td className="tR n strong">{num(equityMv)}</td>
                <td className="tR n">
                  <span className={`pnl ${unrealized >= 0 ? 'pos' : 'neg'}`}>
                    {signed(unrealized)} <em>{signed(unrealizedPct)}%</em>
                  </span>
                </td>
              </tr>
              <tr className="ftCash">
                <td className="tL">Cash balance</td>
                <td className="tR" /><td className="tR" /><td className="tR" /><td className="tR" />
                <td className="tR n strong">{num(cash)}</td>
                <td className="tR muted">settled</td>
              </tr>
              <tr className="ftGrand">
                <td className="tL">Total account value</td>
                <td className="tR" /><td className="tR" /><td className="tR" /><td className="tR" />
                <td className="tR n grand">{num(account)}</td>
                <td className="tR" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="lower">
        {/* Notes — caveats framed as statement footnotes, not error states */}
        <div className="notes">
          <h3>Notes to the statement</h3>
          <ol>
            <li>
              <sup>*</sup> Marks are <b>last available close</b> ({rules?.portfolio?.holdings?.[0]?.indicator_source || 'fallback'}),
              not intraday ticks. Treat market value as an end-of-day estimate.
            </li>
            <li>
              Scoring confidence is <b className="flagLow">{dq.score_confidence || 'low'}</b> — history coverage{' '}
              {Math.round(dq.history_coverage_pct ?? 0)}% ({dq.tickers_with_200d_history ?? 0}/{dq.tickers_total ?? 0}{' '}
              names with 200d history). Risk grades are conservative placeholders until history backfills.
            </li>
            <li>Cash and share counts are reconciled to the FINQALAB cashbook; closed round-trips (PTCL, the prior ENGROH lot) are excluded from the live book.</li>
            {(missingFromFeed.length || extraInFeed.length) ? (
              <li className="flagErr">Feed reconciliation mismatch: missing {missingFromFeed.join(', ') || 'none'}; extra {extraInFeed.join(', ') || 'none'}.</li>
            ) : (
              <li>Feed reconciliation: all 8 PDF holdings match the live portfolio feed; no sold-only ticker is active.</li>
            )}
            {liveError ? <li className="flagErr">Live feed warning: {liveError} — figures above are from the last good bundle.</li> : null}
          </ol>
        </div>

        {/* Market context + watchlist, clearly separated from the account */}
        <aside className="rail">
          <div className="railCard">
            <div className="railHead">Market context</div>
            <div className="ctxRow"><span>KSE-100</span><b>{num(market.indices?.KSE100?.value ?? NaN, 0)} <em className={(market.indices?.KSE100?.pct ?? 0) >= 0 ? 'pos' : 'neg'}>{signed(market.indices?.KSE100?.pct ?? 0)}%</em></b></div>
            <div className="ctxRow"><span>KMI-30</span><b>{num(market.indices?.KMI30?.value ?? NaN, 0)} <em className={(market.indices?.KMI30?.pct ?? 0) >= 0 ? 'pos' : 'neg'}>{signed(market.indices?.KMI30?.pct ?? 0)}%</em></b></div>
            <div className="ctxRow"><span>Regime</span><b className="regime">{market.regime || 'n/a'} · {market.score ?? '—'}/100</b></div>
          </div>
          <div className="railCard">
            <div className="railHead">Watchlist <span className="railSub">signals — not positions</span></div>
            <ul className="watch">
              {watch.map((o) => (
                <li key={o.ticker}>
                  <span className="wTick">{o.ticker}{held.has(o.ticker) && <i className="ownDot" title="already held">●</i>}</span>
                  <span className="wAct">{String(o.action || '').replace(/_/g, ' ')}</span>
                  <span className="wScore">{o.score}</span>
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
        <span>{isLive ? 'morning cron republishes without redeploy' : 'static fallback bundle'}</span>
      </footer>
    </main>
  );
}

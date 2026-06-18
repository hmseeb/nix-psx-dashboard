export default function Page() {
  return (
    <main className="shell takedownShell">
      <section className="heroCopy takedownCard">
        <div className="eyebrow">system offline</div>
        <h1>PSX dashboard has been taken down.</h1>
        <p className="lead">
          this advisory dashboard is intentionally disabled. no market data, portfolio state,
          recommendations, or deployment signals are being published from this app.
        </p>
        <div className="statusRow">
          <span className="pill bad">status: offline</span>
          <span className="pill warn">automation: paused</span>
          <span className="pill">owner requested takedown</span>
        </div>
      </section>
    </main>
  );
}


import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NIX PSX Command Dashboard',
  description: 'Rules-based PSX advisory dashboard for Haseeb: scores, risk, audit ledger, execution guards, and backtest status.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/providers/query-provider';
import './global.css';

export const metadata = {
  title: 'CloudPulse | Enterprise FinOps',
  description:
    'Enterprise FinOps dashboard for cloud waste detection, compliance, and 1-click remediation.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

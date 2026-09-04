import type { ReactNode } from 'react';
import './global.css';

export const metadata = {
  title: 'CloudPulse | Enterprise FinOps',
  description:
    'Enterprise FinOps dashboard for cloud waste detection, compliance, and 1-click remediation.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

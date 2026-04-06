import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monolith Engine',
  description: 'Capability-based security engine',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0f', color: '#e0e0e0', fontFamily: 'monospace' }}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getConfig } from '@/app/lib/config';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vioverse - Credit Report Analysis',
    description: 'Professional credit report violation analysis system',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
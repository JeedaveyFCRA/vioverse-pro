import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getUIConfig } from '@/lib/config';
import { WebVitals } from '@/components/WebVitals';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const config = await getUIConfig();
  return {
    title: `${config.app.title} - ${config.app.subtitle}`,
    description: config.app.description,
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
        <WebVitals />
        {children}
      </body>
    </html>
  );
}